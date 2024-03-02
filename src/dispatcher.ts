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
import type { PreparedGatewayParams } from '@/create-gateway'
import type { StaticOrReactive } from '@/libs/farfetched'
import { normalizeStaticOrReactive } from '@/libs/farfetched'
import { and, equals, not } from '@/libs/patronum'
import { createArrayStore } from '@/shared/lib/create-array-store'
import { ignoreSerialization } from '@/shared/lib/ignore-serialization'
import { serializeEventName } from '@/shared/lib/serialize-event-name'
import type { ProtocolEvent } from '@/shared/types'
import { identity, isString } from '@/shared/utils'

export type DispatcherStatus = 'initial' | 'sent'

export interface BaseDispatcherConfig<
  Events extends ProtocolEvent,
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

export interface Dispatcher<Params> {
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
  Events extends ProtocolEvent = ProtocolEvent
> {
  <Params, BodySource = void>(
    config: BaseDispatcherConfig<Events, Params, BodySource>
  ): Dispatcher<Params>

  (event: Events): Dispatcher<void>
}

export function createDispatcher(gatewayConfig: PreparedGatewayParams) {
  type CreateDispatcherOptions =
    | BaseDispatcherConfig<ProtocolEvent, unknown, unknown>
    | ProtocolEvent

  const normalizeCreateDispatcherParams = (
    options: CreateDispatcherOptions
  ): BaseDispatcherConfig<ProtocolEvent, unknown, unknown> =>
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

    const $pendingQueue = createArrayStore<unknown>()

    const dispatch = createEvent<unknown>()

    const finished = {
      done: createEvent<{ params: unknown }>(),
      skip: createEvent()
    }

    const publishFx = createEffect<{ body: unknown }, void>(({ body }) =>
      adapter.publish(normalizedName, body, options.adapter)
    )

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

    const dispatchAllPendingCallsFx = attach({
      source: $pendingQueue.value,
      effect: createEffect<unknown[], void>((queue) => {
        queue.forEach(dispatch)
      })
    })

    sample({ clock: resetStatus, target: $status.reinit })

    sample({
      clock: dispatch,
      filter: and($enabled, config.gate.ready),
      target: publishToRemoteSourceFx
    })

    sample({
      clock: dispatch,
      filter: not(config.gate.ready),
      target: $pendingQueue.add
    })

    sample({
      clock: config.gate.ready,
      filter: Boolean,
      target: dispatchAllPendingCallsFx
    })

    sample({
      clock: dispatchAllPendingCallsFx.doneData,
      target: $pendingQueue.reset
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
