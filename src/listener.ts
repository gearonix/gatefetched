import type {
  Contract,
  DynamicallySourcedField,
  FarfetchedError,
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
import type { PreparedGatewayParams } from '@/create-gateway'
import type { StaticOrReactive } from '@/libs/farfetched'
import {
  checkValidationResult,
  createContractApplier,
  normalizeStaticOrReactive,
  unwrapValidationResult,
  validValidator
} from '@/libs/farfetched'
import { ignoreSerialization } from '@/shared/lib/ignore-serialization'
import { serializeEventName } from '@/shared/lib/serialize-event-name'
import type { ProtocolEvent } from '@/shared/types'
import type {
  AdapterSubscribeOptions,
  AdapterSubscribeResult
} from './adapters/abstract-adapter'
import { and, equals, not } from './libs/patronum'
import { ANY_WEBSOCKET_EVENT } from './shared/consts'
import { identity, isObject } from './shared/utils'

export type ListenerStatus = 'initial' | 'opened' | 'closed'

export interface BaseListenerConfig<
  Events extends ProtocolEvent,
  Data,
  InitialData = null,
  ValidationSource = void,
  TransformedData = void,
  DataSource = void,
  ValidateParams = unknown
> {
  name?: Events
  initialData?: InitialData
  immediate?: StaticOrReactive<boolean>
  enabled?: StaticOrReactive<boolean>
  response?: {
    contract?: Contract<unknown, Data>
    validate?: Validator<Data, ValidateParams, ValidationSource>
    mapData?: DynamicallySourcedField<Data, TransformedData, DataSource>
  }
  adapter?: AdapterSubscribeOptions
}

export interface Listener<Data, InitialData = null, Params = unknown> {
  $enabled: Store<boolean>
  $status: Store<ListenerStatus>
  $opened: Store<boolean>
  $idle: Store<boolean>
  $closed: Store<boolean>
  $data: Store<Data | InitialData>
  listen: EventCallable<void>
  close: EventCallable<void>

  done: EventCallable<{ result: Data; params?: Params }>
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
    done: Event<{ result: Data; params?: Params }>
    failed: Event<{
      error: FarfetchedError<any>
      params: unknown
    }>
  }
}

export interface CreateListener<Events extends ProtocolEvent = ProtocolEvent> {
  <
    Data,
    TransformedData,
    DataSource = void,
    ValidationSource = void,
    InitialData = null
  >(
    config: BaseListenerConfig<
      Events,
      Data,
      InitialData,
      ValidationSource,
      TransformedData,
      DataSource
    > & {
      response: {
        mapData: DynamicallySourcedField<Data, TransformedData, DataSource>
      }
    }
  ): Listener<TransformedData, InitialData>

  <Data, ValidationSource = void, InitialData = null>(
    config: BaseListenerConfig<Events, Data, InitialData, ValidationSource>
  ): Listener<Data, InitialData>

  <Data, Event extends Events>(event: Event): Listener<Data>
  <Data>(): Listener<Data>
}

export function createListener(gatewayConfig: PreparedGatewayParams) {
  type CreateListenerOptions =
    | BaseListenerConfig<ProtocolEvent, unknown>
    | ProtocolEvent
    | undefined

  const normalizeCreateListenerParams = (
    options: CreateListenerOptions
  ): BaseListenerConfig<ProtocolEvent, unknown> =>
    isObject(options) ? options : { name: options ?? ANY_WEBSOCKET_EVENT }

  const createListenerImpl = (
    rawOptions: CreateListenerOptions
  ): Listener<unknown> => {
    const { name = ANY_WEBSOCKET_EVENT, ...options } =
      normalizeCreateListenerParams(rawOptions)

    const { adapter, ...config } = gatewayConfig

    const normalizedName = serializeEventName(name, config.events)

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

    const listenRemoteSourceFx = createEffect(() =>
      adapter.subscribe(normalizedName, trigger, options.adapter)
    )

    const closeRemoteSourceFx = createEffect(() =>
      adapter.unsubscribe(normalizedName)
    )

    sample({
      clock: listen,
      filter: and($enabled, not($opened), config.gate.ready),
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

    const mapGlobalData = sample({
      clock: trigger,
      filter: $enabled,
      source: {
        mapper: normalizeSourced({
          field: config.response?.mapData ?? identity
        })
      },
      fn: ({ mapper }, { result, ...meta }) => ({
        result: mapper(result),
        ...meta
      })
    })

    sample({
      clock: mapGlobalData,
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

    const mapScopedData = sample({
      clock: validDataReceived,
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

    sample({
      clock: config.gate.ready,
      filter: Boolean,
      target: listen
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
      '@@unitShape': unitShapeProtocol
    }
  }

  return createListenerImpl as CreateListener
}
