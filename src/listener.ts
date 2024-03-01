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
import type { AnyFn, ListenerStatus, WebsocketEvent } from '@/shared/types'
import type {
  AdapterSubscribeOptions,
  AdapterSubscribeResult
} from './adapters/abstract-adapter'
import type { GatewayParamsWithAdapter } from './create-gateway'
import { createContractApplier } from './libs/farfetched/apply-contract'
import type { StaticOrReactive } from './libs/farfetched/static-or-reactive'
import { normalizeStaticOrReactive } from './libs/farfetched/static-or-reactive'
import {
  checkValidationResult,
  unwrapValidationResult,
  validValidator
} from './libs/farfetched/validation'
import { and, equals, not } from './libs/patronum'
import { ANY_WEBSOCKET_EVENT } from './shared/consts'
import { identity, ignoreSerialization, serializeEventName } from './shared/lib'

export type ListenerStatus = 'initial' | 'opened' | 'closed'

interface BaseListenerConfig<
  Events extends WebsocketEvent,
  Data,
  PrepareParams = void,
  ValidationSource = void,
  TransformedData = void,
  DataSource = void,
  ValidateParams = unknown
> {
  name?: Events
  initialData?: Partial<Data>
  dispatch?: StaticOrReactive<PrepareParams>

  immediate?: StaticOrReactive<boolean>
  enabled?: StaticOrReactive<boolean>
  response?: {
    contract?: Contract<unknown, Data>
    validate?: Validator<Data, ValidateParams, ValidationSource>
    mapData?: DynamicallySourcedField<Data, TransformedData, DataSource>
  }
  adapter?: AdapterSubscribeOptions
}

// TODO split this type
interface Listener<Data, InitialData = null, Params = unknown> {
  $enabled: Store<boolean>
  $status: Store<ListenerStatus>
  $opened: Store<boolean>
  $idle: Store<boolean>
  $closed: Store<boolean>
  $data: Store<Data | InitialData>

  listen: EventCallable<void>
  close: EventCallable<void>
  dispatch: EventCallable<Params>

  done: Event<{ result: Data; params?: Params }>
  finished: {
    done: Event<{ result: Data; params?: Params }>
    skip: Event<void>
  }
  failed: Event<{
    error: FarfetchedError<any>
    params: unknown
  }>

  '@@unitShape': () => {
    data: Store<Data | InitialData>
    listen: Event<void>
    close: Event<void>
    enabled: Store<boolean>
    opened: Store<boolean>
    closed: Store<boolean>
    idle: Store<boolean>
    dispatch: EventCallable<Params>
    done: Event<{ result: Data; params?: Params }>
    failed: Event<{
      error: FarfetchedError<any>
      params: unknown
    }>
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

  // TODO: idk why this is working lmaooo
  <Data, Event extends Events>(event: Event): Listener<Data>
}

export function createListener(gatewayConfig: GatewayParamsWithAdapter) {
  const createListenerImpl = ({
    name = ANY_WEBSOCKET_EVENT,
    ...options
  }: BaseListenerConfig<WebsocketEvent, unknown>): Listener<unknown> => {
    const { adapter, ...config } = gatewayConfig

    const normalizedName = serializeEventName(name, config.events)

    const listen = createEvent()
    const close = createEvent()

    const started = createEvent()

    // TODO implement dispatch
    const dispatch = createEvent<unknown>()

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
    const $status = createStore<ListenerStatus>('initial', {
      ...ignoreSerialization('status', normalizedName)
    })

    const $latestData = createStore<unknown>(options.initialData ?? null, {
      ...ignoreSerialization('latestData', normalizedName)
    })

    const $idle = equals($status, 'initial')
    const $opened = equals($status, 'opened')
    const $closed = equals($status, 'closed')

    const trigger = createEvent<AdapterSubscribeResult<unknown>>()

    const resetStatus = createEvent()

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
    // TODO file refactoring
    //  based on farfetched repository

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
      failed,
      dispatch,
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
      failed,
      listen,
      done: finished.done,
      $data: $latestData,
      dispatch,
      '@@unitShape': unitShapeProtocol
    }
  }
  // TODO: refactor everything here

  return createListenerImpl as CreateListener
}