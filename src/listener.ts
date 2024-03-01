import type {
  Contract,
  DynamicallySourcedField,
  FarfetchedError,
  SourcedField,
  Validator
} from '@farfetched/core'
import {
  invalidDataError,
  normalizeSourced,
  unknownContract
} from '@farfetched/core'
import type { Event, EventCallable, Store } from 'effector'
import {
  createEffect,
  createEvent,
  createStore,
  launch,
  sample,
  split
} from 'effector'
import { and, equals, not } from 'patronum'
import type {
  AdapterSubscribeOptions,
  AdapterSubscribeResult
} from './adapters/abstract-adapter'
import { ANY_WEBSOCKET_EVENT } from './consts'
import type { GatewayParamsWithAdapter } from './create-gateway'
import { createContractApplier } from './ff/apply-contract'
import { checkValidationResult } from './ff/check-validation-result'
import type { StaticOrReactive } from './ff/static-or-reactive'
import { normalizeStaticOrReactive } from './ff/static-or-reactive'
import { unwrapValidationResult } from './ff/unwrap-validation-result'
import type {
  AnyFn,
  OperationStatus,
  WebsocketEvent,
  WebsocketEventsConfig
} from './shared'
import {
  identity,
  ignoreSerialization,
  isObject,
  validValidator
} from './shared'

interface BaseListenerConfig<
  Events extends WebsocketEvent,
  Data,
  PrepareParams = void,
  ValidationSource = void,
  TransformedData = void,
  DataSource = void
> {
  name?: Events
  initialData?: Partial<Data>
  dispatch?: StaticOrReactive<PrepareParams>

  immediate?: StaticOrReactive<boolean>

  enabled?: StaticOrReactive<boolean>

  response?: {
    contract?: Contract<unknown, Data>
    // TODO
    validate?: Validator<Data, any, ValidationSource>
    mapData?: DynamicallySourcedField<Data, TransformedData, DataSource>
  }

  adapter?: AdapterSubscribeOptions
}

interface Listener<Data, InitialData = null, Params = unknown> {
  $enabled: Store<boolean>
  $status: Store<OperationStatus>

  $opened: Store<boolean>
  $idle: Store<boolean>
  $closed: Store<boolean>

  $data: Store<Data | InitialData>

  listen: EventCallable<void>
  close: EventCallable<void>

  done: Event<{ result: Data; params?: Params }>

  finished: {
    done: Event<{ result: Data; params?: Params }>
    skip: Event<void>
  }

  '@@unitShape': () => {
    data: Store<Data | InitialData>

    listen: Event<void>
    close: Event<void>

    enabled: Store<boolean>

    opened: Store<boolean>

    closed: Store<boolean>
    idle: Store<boolean>

    done: Event<{ result: Data; params?: Params }>
  }
}

export interface CreateListener<
  Events extends WebsocketEvent = WebsocketEvent
> {
  <Data, ValidationSource = void>(
    config: BaseListenerConfig<Events, Data, void, ValidationSource>
  ): Listener<Data>

  <Data, TransformedData, DataSource = void, ValidationSource = void>(
    config: BaseListenerConfig<
      Events,
      Data,
      void,
      ValidationSource,
      TransformedData,
      DataSource
    > & {
      mapData: DynamicallySourcedField<Data, TransformedData, DataSource>
    }
  ): Listener<TransformedData>

  <
    Data,
    TransformedData,
    PrepareParams,
    DataSource = void,
    ValidationSource = void
  >(
    config: BaseListenerConfig<
      Events,
      Data,
      PrepareParams,
      ValidationSource,
      TransformedData,
      DataSource
    > & {
      dispatch: SourcedField<any, PrepareParams, any>
    }
  ): Listener<TransformedData, null, PrepareParams>

  // TODO: enable this overload
  // <Data, Event extends Events>(event: Event): Listener<Data>
}

export const serializeEventName = <
  Event extends WebsocketEvent = WebsocketEvent
>(
  target: Event,
  events: WebsocketEventsConfig<Event> | undefined
): string => (isObject(events) ? events[target] : target)

export function createListener(gatewayConfig: GatewayParamsWithAdapter) {
  const createListenerImpl = ({
    name = ANY_WEBSOCKET_EVENT,
    ...options
  }: BaseListenerConfig<WebsocketEvent, unknown>): Listener<unknown> => {
    const { adapter, ...config } = gatewayConfig

    const listen = createEvent()
    const close = createEvent()

    const started = createEvent()

    const failed = createEvent<{
      error: FarfetchedError<any>
      params: unknown
    }>()

    const applyContractFx = createContractApplier(
      options.response?.contract ?? unknownContract
    )

    const finished = {
      done: createEvent<{ result: unknown; params?: unknown }>(),
      skip: createEvent<void>()
    }

    const $immediate = normalizeStaticOrReactive(options.immediate ?? true)
    const $enabled = normalizeStaticOrReactive(options.enabled ?? true)
    const $status = createStore<OperationStatus>('initial', {
      ...ignoreSerialization('status', name)
    })

    const $latestData = createStore<unknown>(options.initialData ?? null, {
      ...ignoreSerialization('latestData', name)
    })

    const $idle = equals($status, 'initial')
    const $opened = equals($status, 'opened')
    const $closed = equals($status, 'closed')

    const trigger = createEvent<AdapterSubscribeResult<unknown>>()

    const resetStatus = createEvent()

    const normalizedName = serializeEventName(name, config.events)

    const listenRemoteSourceFx = createEffect({
      handler: () => {
        adapter.subscribe(normalizedName, trigger, options.adapter)
      }
    })

    const closeRemoteSourceFx = createEffect({
      handler: () => {
        adapter.unsubscribe(normalizedName)
      }
    })

    if (options.dispatch) {
      // TODO: should understand normalizeSourced better
      // should execute only on listenerStarted clock
      // https://github.com/igorkamyshev/farfetched/tree/master/packages/core/src/libs/patronus
      const $normalizedPrepare = normalizeSourced({
        field: options.dispatch
      }) as Store<AnyFn>

      // @ts-expect-error not implemented yet
      const $prepare = $normalizedPrepare.map((normalized) => normalized())
    }

    sample({
      clock: listen,
      filter: and($enabled, not($opened)),
      target: listenRemoteSourceFx
    })

    sample({
      clock: close,
      filter: and($enabled, not($closed)),
      target: closeRemoteSourceFx
    })

    sample({ clock: resetStatus, target: $status.reinit })

    sample({
      clock: listenRemoteSourceFx.doneData,
      target: started
    })

    sample({
      clock: [
        listenRemoteSourceFx.map(() => 'opened' as const),
        closeRemoteSourceFx.map(() => 'closed' as const)
      ],
      target: $status
    })

    sample({
      clock: trigger,
      filter: $enabled,
      target: applyContractFx
    })

    const $validateResponse = sample({
      clock: applyContractFx.done,
      source: {
        validator: normalizeSourced({
          field: options.response?.validate ?? validValidator
        })
      },
      fn: ({ validator }, { params, result }) => ({
        result,
        params,
        validation: validator({
          params,
          result
        })
      })
    })

    const { validDataReceived, __: invalidDataReceived } = split(
      $validateResponse,
      {
        validDataReceived: ({ validation }) => checkValidationResult(validation)
      }
    )

    const mapGlobalData = sample({
      clock: validDataReceived,
      source: {
        mapper: normalizeSourced({
          field: config.response?.mapData ?? identity
        })
      },
      fn: ({ mapper }, { params, result }) => ({
        result: mapper(result),
        params
      })
    })

    const mapScopedData = sample({
      clock: mapGlobalData,
      source: {
        mapper: normalizeSourced({
          field: options.response?.mapData ?? identity
        })
      },
      fn: ({ mapper }, { params, result }) => ({
        result: mapper(result),
        params
      })
    })

    sample({
      clock: applyContractFx.fail,
      source: $enabled,
      filter: Boolean,
      fn: (_, { error, params }) => ({
        error,
        params
      }),
      target: failed
    })

    sample({
      clock: invalidDataReceived,
      fn: ({ params, validation, result }) => ({
        params,
        error: invalidDataError({
          validationErrors: unwrapValidationResult(validation),
          response: result
        })
      }),
      target: failed
    })

    sample({
      clock: mapScopedData,
      target: finished.done
    })

    sample({
      clock: finished.done,
      fn: ({ result }) => result,
      target: $latestData
    })

    sample({
      clock: listen,
      filter: not($enabled),
      target: finished.skip
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
        })),
        failed.map(({ error, params }) => ({
          result: { error, params },
          status: 'failed' as const
        }))
      ],
      source: {
        interceptor: normalizeSourced({ field: config.intercept ?? identity })
      },
      fn: ({ interceptor }, { result, status }) => {
        interceptor({
          scope: normalizedName,
          type: 'incoming',
          data: result,
          status
        })
      }
    })

    const unitShape = {
      data: $latestData,
      close,
      enabled: $enabled,
      idle: $idle,
      closed: $closed,
      opened: $opened,
      listen,
      done: finished.done
    }

    const unitShapeProtocol = () => unitShape

    if ($immediate.defaultState) {
      launch({ target: listen, params: null })
    }

    return {
      $enabled,
      close,
      $opened,
      $status,
      $idle,
      $closed,
      finished,
      listen,
      done: finished.done,
      $data: $latestData,
      '@@unitShape': unitShapeProtocol
    }
  }

  return createListenerImpl as CreateListener
}
