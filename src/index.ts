import type {
  Contract,
  DynamicallySourcedField,
  ParamsDeclaration,
  SourcedField,
  Validator
} from '@farfetched/core'
import type { Event, Store } from 'effector'
import { Socket } from 'socket.io-client'

type AnyWebsocketEvents = string

type AnyObject = Record<string, unknown>

type EventsConfig<Event extends AnyWebsocketEvents> =
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

interface CreateGatewayParams<
  Instance extends WebsocketInstance,
  LogSource = void,
  DataSource = void
> {
  from?: Instance
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
  Events extends AnyWebsocketEvents,
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
  Events extends AnyWebsocketEvents,
  Params,
  BodySource = void
> {
  name: Events
  params?: ParamsDeclaration<Params>
  request?: {
    body?: SourcedField<Params, AnyObject, BodySource>
  }
}

interface CreateListener<Events extends AnyWebsocketEvents> {
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

interface CreateDispatcher<Events extends AnyWebsocketEvents> {
  <Params, BodySource = void>(
    config: BaseDispatcherConfig<Events, Params, BodySource>
  ): Dispatcher<Params>

  (event: Events): Dispatcher<void>
}

interface WebsocketGateway<
  Instance extends WebsocketInstance,
  Events extends AnyWebsocketEvents = AnyWebsocketEvents
> {
  $instance: Store<Instance>
  listen: CreateListener<Events>
  dispatcher: CreateDispatcher<Events>
}

export function createGateway<Instance extends WebsocketInstance>(
  options: CreateGatewayParams<Instance>
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends WebsocketInstance,
  const Events extends AnyWebsocketEvents
>(
  options: CreateGatewayParams<Instance> & {
    events: EventsConfig<Events>
  }
): WebsocketGateway<Instance, Events>

export function createGateway<Instance extends WebsocketInstance>(
  instance: Instance
): WebsocketGateway<Instance>

export function createGateway(instance: any): any {}
