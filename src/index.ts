import type {
  Contract,
  DynamicallySourcedField,
  ParamsDeclaration,
  SourcedField,
  Validator
} from '@farfetched/core'
import { normalizeSourced } from '@farfetched/core'
import type { Event, Store } from 'effector'
import type { Socket } from 'socket.io-client'

type WebsocketEvents = string

type AnyObject = Record<string, unknown>

type EventsConfig<Event extends WebsocketEvents> =
  | Record<Event, string>
  | Event[]
  | readonly Event[]

// TODO: fix
type WebsocketInstance = Socket

interface LogMessage {
  type: 'request' | 'response'
  message?: string
  error?: unknown
}

interface BaseCreateGatewayParams<
  Instance extends WebsocketInstance,
  LogSource = void,
  DataSource = void
> {
  from: SourcedInstance<Instance>
  logs?: DynamicallySourcedField<LogMessage, unknown, LogSource> | boolean
  response?: {
    mapData?: DynamicallySourcedField<any, any, DataSource>
  }
}

type ExecutionStatus = 'waiting' | 'done'

interface Listener<Data, InitialData = null> {
  $enabled: Store<boolean>
  $status: Store<ExecutionStatus>
  $finished: Store<boolean>
  $data: Store<Data | InitialData>

  done: Event<{ result: Data }>

  '@@unitShape': () => () => {
    data: Store<Data | InitialData>
  }
}

interface Dispatcher<Params> {
  $enabled: Store<boolean>
  $status: Store<ExecutionStatus>
  $executed: Store<boolean>

  dispatch: Event<Params>

  done: Event<{ params: Params }>

  '@@unitShape': () => () => {
    done: Store<boolean>
    dispatch: Event<Params>
  }
}

interface BaseListenerConfig<
  Events extends WebsocketEvents,
  Data,
  ValidationSource = void,
  TransformedData = void,
  DataSource = void
> {
  name: Events
  initialData?: Data

  response: {
    contract?: Contract<unknown, Data>
    validate?: Validator<Data, never, ValidationSource>
    mapData?: DynamicallySourcedField<
      { result: Data },
      TransformedData,
      DataSource
    >
  }
}

interface BaseDispatcherConfig<
  Events extends WebsocketEvents,
  Params,
  BodySource = void
> {
  name: Events
  params?: ParamsDeclaration<Params>
  request?: {
    body?: SourcedField<Params, AnyObject, BodySource>
  }
}

interface CreateListener<Events extends WebsocketEvents> {
  <Data, ValidationSource = void>(
    config: BaseListenerConfig<Events, Data, ValidationSource>
  ): Listener<Data>

  <Data, TransformedData, DataSource = void, ValidationSource = void>(
    config: BaseListenerConfig<
      Events,
      Data,
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

  <Data, Event extends Events>(event: Event): Listener<Data>
}

interface CreateDispatcher<Events extends WebsocketEvents> {
  <Params, BodySource = void>(
    config: BaseDispatcherConfig<Events, Params, BodySource>
  ): Dispatcher<Params>

  (event: Events): Dispatcher<void>
}

interface WebsocketGateway<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents = WebsocketEvents
> {
  $instance: Store<Instance>
  listen: CreateListener<Events>
  dispatcher: CreateDispatcher<Events>
}

type SourcedInstance<Instance> = SourcedField<any, Instance, any>

type CreateGatewayParamsWithEvents<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents
> = BaseCreateGatewayParams<Instance> & {
  events: EventsConfig<Events>
}

export type CreateGatewayParams<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents = WebsocketEvents
> =
  | BaseCreateGatewayParams<Instance>
  | CreateGatewayParamsWithEvents<Instance, Events>
  | SourcedInstance<Instance>

export function isBaseGatewayConfig(params: unknown) {
  return typeof params === 'object' && params !== null && 'from' in params
}

interface CreateGatewayParamsNormalized<Instance> {
  instance: Store<Instance>
  options: Omit<BaseCreateGatewayParams<any>, 'from'>
}

export function createGateway<Instance extends WebsocketInstance>(
  options: BaseCreateGatewayParams<Instance>
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends WebsocketInstance,
  const Events extends WebsocketEvents
>(
  options: BaseCreateGatewayParams<Instance> & {
    events: EventsConfig<Events>
  }
): WebsocketGateway<Instance, Events>

export function createGateway<Instance extends WebsocketInstance>(
  instance: SourcedInstance<Instance>
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents
>(params: CreateGatewayParams<Instance, Events>): any {
  const { instance, options } = normalizeCreateGatewayParams(params)

}

export function normalizeCreateGatewayParams<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents
>(params: CreateGatewayParams<Instance, Events>) {
  const resultParams = {} as CreateGatewayParamsNormalized<Instance>

  if (isBaseGatewayConfig(params)) {
    const { from, ...configParams } =
      params as BaseCreateGatewayParams<Instance>

    Object.assign(resultParams, {
      from: normalizeSourced({ field: from }),
      options: configParams
    })

    return resultParams
  }
  const instance = params as SourcedInstance<Instance>

  Object.assign(resultParams, {
    from: normalizeSourced({ field: instance }),
    options: {}
  })

  return resultParams
}
