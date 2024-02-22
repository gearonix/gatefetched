import type {
  Contract,
  DynamicallySourcedField,
  ParamsDeclaration,
  SourcedField,
  Validator
} from '@farfetched/core'
import { normalizeSourced, unknownContract } from '@farfetched/core'
import type { Event, Store } from 'effector'
import {
  combine,
  createEffect,
  createEvent,
  createStore,
  is,
  launch,
  sample
} from 'effector'
import { condition, readonly } from 'patronum'
import { ANY_WEBSOCKET_EVENT } from './consts'
import type { GatewayParamsWithAdapter } from './create-gateway'
import { createContractApplier } from './ff/apply-contract'
import type { AnyFn, OperationStatus, WebsocketEvents } from './shared'
import { ignoreSerialization, isFunction } from './shared'

interface BaseListenerConfig<
  Events extends WebsocketEvents,
  Data,
  PrepareParams = void,
  ValidationSource = void,
  TransformedData = void,
  DataSource = void
> {
  name?: Events
  initialData?: Data
  // TODO: replace any with generics
  dispatch?: SourcedField<any, PrepareParams, any>
  immediate?: boolean

  response?: {
    contract?: Contract<unknown, Data>
    validate?: Validator<Data, never, ValidationSource>
    mapData?: DynamicallySourcedField<
      { result: Data },
      TransformedData,
      DataSource
    >
  }
}

interface Listener<Data, InitialData = null, Params = void> {
  $enabled: Store<boolean>
  $status: Store<OperationStatus>

  $finished: Store<boolean>
  $waiting: Store<boolean>
  $idle: Store<boolean>

  $data: Store<Data | InitialData>

  listen: Event<void>
  close: Event<void>

  done: Event<{ result: Data; params?: Params }>

  '@@unitShape': () => () => {
    data: Store<Data | InitialData>
    listen: Event<void>
    close: Event<void>
    enabled: Store<boolean>

    waiting: Store<boolean>
    finished: Store<boolean>
  }
}

export interface CreateListener<
  Events extends WebsocketEvents = WebsocketEvents
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
      mapData: DynamicallySourcedField<
        { result: Data },
        TransformedData,
        DataSource
      >
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
      prepare: ParamsDeclaration<PrepareParams>
    }
  ): Listener<TransformedData, null, PrepareParams>

  // TODO: enable this overload
  // <Data, Event extends Events>(event: Event): Listener<Data>
}

export function createListener(gatewayConfig: GatewayParamsWithAdapter) {
  const createListenerImpl = ({
    name = ANY_WEBSOCKET_EVENT,
    response,
    ...options
  }: BaseListenerConfig<WebsocketEvents, unknown>): Listener<unknown> => {
    const { adapter, ...config } = gatewayConfig

    const pushData = createEvent<unknown>()

    const startListener = createEvent()
    const closeListener = createEvent<void>()

    const listenerStarted = createEvent()

    const applyContractFx = createContractApplier(
      response?.contract ?? unknownContract
    )

    const $immediate = readonly(createStore(options.immediate))

    const $enabled = createStore<boolean>(true, {
      ...ignoreSerialization('enabled', name)
    })

    const $status = createStore<OperationStatus>('initial', {
      ...ignoreSerialization('status', name)
    })

    const $deliveredData = createStore<unknown>(options.initialData ?? null, {
      ...ignoreSerialization('deliveredData', name)
    })

    const $idle = $status.map((status) => status === 'initial')
    const $waiting = $status.map((status) => status === 'waiting')
    const $finished = $status.map((status) => status === 'done')

    const finished = createEvent<{ result: unknown }>()

    const resetStatus = createEvent()

    const listenRemoteSourceFx = createEffect({
      handler: async () => {
        adapter.subscribe(name, (response: unknown) => {
          // TODO: this fields are dynamically sourced
          if (isFunction(config.response?.mapData)) {
            response = config.response.mapData(response)
          }



          // if (response?.mapData) {
          //   response = options.response.mapData(response)
          // }
        })
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

    condition({
      if: $immediate,
      then: startListener
    })

    sample({
      clock: startListener,
      filter: $enabled
    })

    sample({ clock: resetStatus, target: $status.reinit })

    return null as any
  }

  return createListenerImpl as CreateListener
}

// TODO: remove patronum from dependencies
