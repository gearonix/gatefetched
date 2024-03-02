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
import { equals, not } from '@/libs/patronum'
import { identity, ignoreSerialization, serializeEventName } from '@/shared/lib'
import type { WebsocketEvent } from '@/shared/types'
import { isString } from '@/shared/types'

export type DispatcherStatus = 'initial' | 'sent'

interface BaseDispatcherConfig<
  Events extends WebsocketEvent,
  Params,
  BodySource = void,
  MappedBody = void
> {
  name: Events
  params?: ParamsDeclaration<Params>
  enabled?: StaticOrReactive<boolean>
  adapter?: AdapterPublishOptions

  request?: {
    mapBody?: SourcedField<Params, MappedBody, BodySource>
  }
}

interface Dispatcher<Params> {
  $enabled: Store<boolean>
  $status: Store<DispatcherStatus>
  $sent: Store<boolean>
  $idle: Store<boolean>
  dispatch: EventCallable<Params>
  done: Event<{ params: Params }>
  finished: {
    done: Event<{ params?: Params }>
    skip: Event<void>
  }
  $latestParams: Store<Params>

  '@@unitShape': () => {
    done: Event<{ params: Params }>
    dispatch: EventCallable<Params>
    latestParams: Store<Params>
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

  (event: Events): Dispatcher<void>
}

export function createDispatcher(gatewayConfig: GatewayParamsWithAdapter) {
  type CreateDispatcherOptions =
    | BaseDispatcherConfig<WebsocketEvent, unknown, unknown>
    | WebsocketEvent

  const normalizeCreateDispatcherParams = (
    options: CreateDispatcherOptions
  ): BaseDispatcherConfig<WebsocketEvent, unknown, unknown> =>
    isString(options) ? { name: options } : options

  const createDispatcherImpl = (
    rawOptions: CreateDispatcherOptions
  ): Dispatcher<unknown> => {
    const options = normalizeCreateDispatcherParams(rawOptions)

    const { adapter, ...config } = gatewayConfig

    const normalizedName = serializeEventName(options.name, config.events)

    const $enabled = normalizeStaticOrReactive(options.enabled ?? true)

    const $status = createStore<DispatcherStatus>('initial', {
      ...ignoreSerialization('status', normalizedName)
    })

    const $latestParams = createStore<unknown>(null, {
      ...ignoreSerialization('latestParams', normalizedName)
    })

    const resetStatus = createEvent()

    const $idle = equals($status, 'initial')
    const $sent = equals($status, 'sent')

    const dispatch = createEvent<unknown>()

    const finished = {
      done: createEvent<{ params: unknown }>(),
      skip: createEvent()
    }

    const publishFx = createEffect<{ body: unknown }, void>({
      handler: async ({ body }) => {
        adapter.publish(normalizedName, body, options.adapter)
      }
    })

    const publishToRemoteSourceFx = createEffect(
      attach({
        source: {
          mapBody: normalizeSourced({
            field: options.request?.mapBody ?? identity
          })
        },
        mapParams: (params: unknown, { mapBody }) => ({
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
      clock: dispatch,
      filter: not($enabled),
      target: finished.skip
    })

    sample({
      clock: publishFx.done,
      fn: ({ params }) => ({
        params: params.body
      }),
      target: finished.done
    })

    sample({
      clock: finished.done,
      target: $latestParams
    })

    sample({
      clock: [publishToRemoteSourceFx.done.map(() => 'sent' as const)],
      target: $status
    })

    sample({
      clock: [
        finished.done.map((result) => ({
          result,
          status: 'done' as const
        })),
        finished.skip.map(() => ({
          result: null,
          status: 'skip' as const
        }))
      ],
      source: {
        interceptor: normalizeSourced({ field: config.intercept ?? identity })
      },
      fn: ({ interceptor }, { result, status }) => {
        interceptor({
          scope: normalizedName,
          type: 'outgoing',
          data: result,
          status
        })
      }
    })

    const unitShape = {
      status: $status,
      sent: $sent,
      idle: $idle,
      enabled: $enabled,
      latestParams: $latestParams,
      dispatch,
      finished,
      done: finished.done
    }

    const unitShapeProtocol = () => unitShape

    return {
      $status,
      $sent,
      $idle,
      $enabled,
      dispatch,
      finished,
      done: finished.done,
      $latestParams,
      '@@unitShape': unitShapeProtocol
    }
  }

  return createDispatcherImpl as CreateDispatcher
}
