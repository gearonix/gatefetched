import type {
  Contract,
  DynamicallySourcedField,
  FarfetchedError,
  Validator
} from '@farfetched/core'
import type { Event, EventCallable, Store } from 'effector'
import type { AdapterSubscribeOptions } from '@/adapters/abstract-adapter'
import type { StaticOrReactive } from '@/libs/farfetched'
import type { ProtocolEvent } from '@/shared/types'

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
  /**
   * Name of the event to listen.
   * @default ANY_WEBSOCKET_EVENT
   */
  name?: Events
  /**
   * @default null
   */
  initialData?: InitialData
  /**
   * If true, starts listening to the channel automatically.
   * If false, manual call through the 'listen' event is required.
   * @default true
   */
  immediate?: StaticOrReactive<boolean>
  /**
   * Indicates if the listener is enabled. If false, it stops accepting requests.
   * @default true
   */
  enabled?: StaticOrReactive<boolean>
  response?: {
    /**
     * Contracts from farfetched.
     * @reference https://farfetched.pages.dev/tutorial/contracts.html
     * @default unknownContract
     */
    contract?: Contract<unknown, Data>
    /**
     * Validate function from farfetched.
     * @reference https://farfetched.pages.dev/tutorial/validators.html
     * @default validValidator
     */
    validate?: Validator<Data, ValidateParams, ValidationSource>
    /**
     * Serializes incoming data.
     * @example (result) => result.data
     * @default identity
     */
    mapData?: DynamicallySourcedField<Data, TransformedData, DataSource>
  }
  /**
   * Adapter options for manual configuration of protocol instance behavior.
   * @type {AdapterSubscribeOptions}
   */
  adapter?: AdapterSubscribeOptions
}

export interface Listener<Data, InitialData = null, Params = unknown> {
  /**
   * Indicates if the listener is enabled. If false, it stops accepting requests.
   * @default true
   */
  $enabled: Store<boolean>
  /**
   * Listener status.
   * @example 'initial'
   * @example 'opened'
   * @default 'initial'
   */
  $status: Store<ListenerStatus>
  $opened: Store<boolean>
  $idle: Store<boolean>
  $closed: Store<boolean>
  /**
   * Last data received from the other side.
   * @example { hello: 'world' }
   * @default null
   */
  $data: Store<Data | InitialData>
  /**
   * Starts listening to the channel.
   * Automatically triggered when 'immediate' is true.
   */
  listen: EventCallable<void>
  /**
   * Stops listening to the channel, changes $status to 'closed'.
   */
  close: EventCallable<void>

  /**
   * Callback triggered upon
   * receiving a message from the other side.
   */
  done: Event<{ result: Data; params?: Params }>
  finished: {
    done: Event<{ result: Data; params?: Params }>
    /**
     * вызывается если во время вызова $enabled false
     */
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
