import type { ParamsDeclaration, SourcedField } from '@farfetched/core'
import { normalizeSourced } from '@farfetched/core'
import type { Event, EventCallable, Store } from 'effector'
import {
  attach,
  createEffect,
  createEvent,
  createStore,
  sample
} from 'effector'
import type { AdapterPublishOptions } from '@/adapters/abstract-adapter'
import type { GatewayParamsWithAdapter } from '@/create-gateway'
import type { StaticOrReactive } from '@/libs/farfetched'
import { normalizeStaticOrReactive } from '@/libs/farfetched'
import { equals } from '@/libs/patronum'
import { identity, ignoreSerialization, serializeEventName } from '@/shared/lib'
import type { AnyRecord, WebsocketEvent } from '@/shared/types'

export type DispatcherStatus = 'initial' | 'sent'

interface BaseDispatcherConfig<
  Events extends WebsocketEvent,
  Params,
  BodySource = void
> {
  name: Events
  params?: ParamsDeclaration<Params>
  enabled?: StaticOrReactive<boolean>
  adapter?: AdapterPublishOptions

  request?: {
    mapBody?: SourcedField<Params, AnyRecord, BodySource>
  }
}

interface Dispatcher<Params> {
  $enabled: Store<boolean>
  $status: Store<DispatcherStatus>
  $sent: Store<boolean>
  $idle: Store<boolean>
  dispatch: EventCallable<Params>
  done: Event<{ params: Params }>

  '@@unitShape': () => {
    done: Event<{ params: Params }>
    dispatch: EventCallable<Params>
    enabled: Store<boolean>
    status: Store<DispatcherStatus>
    sent: Store<boolean>
    idle: Store<boolean>
  }
}

export interface CreateDispatcher<
  Events extends WebsocketEvent = WebsocketEvent
> {
  <Params, BodySource = void>(
    config: BaseDispatcherConfig<Events, Params, BodySource>
  ): Dispatcher<Params>

  // TODO: enable overload
  // (event: Events): Dispatcher<void>
}

export function createDispatcher(gatewayConfig: GatewayParamsWithAdapter) {
  const createDispatcherImpl = (
    options: BaseDispatcherConfig<WebsocketEvent, unknown, unknown>
  ): Dispatcher<any> => {
    const { adapter, ...config } = gatewayConfig

    const normalizedName = serializeEventName(options.name, config.events)

    const $enabled = normalizeStaticOrReactive(options.enabled ?? false)

    const $status = createStore<DispatcherStatus>('initial', {
      ...ignoreSerialization('status', normalizedName)
    })

    const $latestParams = createStore<unknown>(null, {
      ...ignoreSerialization('latestParams', normalizedName)
    })

    const resetStatus = createEvent()

    const $idle = equals($status, 'initial')
    const $sent = equals($status, 'sent')

    const dispatch = createEvent<AnyRecord>()
    const published = createEvent<{ params: unknown }>()

    const publishFx = createEffect<{ body: AnyRecord }, void>({
      handler: async ({ body }) => {
        adapter.publish(normalizedName, body, options.adapter)
      }
    })

    // TODO: mapGlobalData

    const publishToRemoteSourceFx = createEffect(
      attach({
        source: {
          mapBody: normalizeSourced({
            field: options.request?.mapBody ?? identity<AnyRecord>
          })
        },
        mapParams: (params: AnyRecord, { mapBody }) => ({
          body: mapBody(params)
        }),
        effect: publishFx
      })
    )

    sample({ clock: resetStatus, target: $status.reinit })

    sample({
      clock: dispatch,
      filter: $enabled,
      target: publishToRemoteSourceFx
    })

    sample({
      clock: publishFx.done,
      fn: ({ params }) => ({
        params: params.body
      }),
      target: published
    })

    sample({
      clock: published,
      target: $latestParams
    })

    sample({
      clock: [publishToRemoteSourceFx.done.map(() => 'sent' as const)],
      target: $status
    })

    const unitShape = {
      status: $status,
      sent: $sent,
      idle: $idle,
      enabled: $enabled,
      dispatch,
      done: published
    }

    const unitShapeProtocol = () => unitShape

    return {
      $status,
      $sent,
      $idle,
      $enabled,
      dispatch,
      done: published,
      '@@unitShape': unitShapeProtocol
    }
  }

  return createDispatcherImpl as CreateDispatcher
}
