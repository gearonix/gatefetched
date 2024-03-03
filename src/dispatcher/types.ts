import type { ParamsDeclaration, SourcedField } from '@farfetched/core'
import type { Event, EventCallable, Store } from 'effector'
import type { AdapterPublishOptions } from '@/adapters/abstract-adapter'
import type { StaticOrReactive } from '@/libs/farfetched'
import type { ProtocolEvent } from '@/shared/types'

export type DispatcherStatus = 'initial' | 'sent'

export interface BaseDispatcherConfig<
  Events extends ProtocolEvent,
  Params,
  BodySource = void,
  MappedBody = void
> {
  /**
   * Name of the event to send data.
   */
  name: Events
  /**
   * Declaration of parameters for sending data
   */
  params?: ParamsDeclaration<Params>
  /**
   * Indicates if the listener is enabled. If false, it stops accepting requests.
   * @default true
   */
  enabled?: StaticOrReactive<boolean>

  request?: {
    /**
     * Serializes outgoing params.
     * @default identity
     */
    mapParams?: SourcedField<Params, MappedBody, BodySource>
  }
  /**
   * Adapter options for manual configuration of protocol instance behavior.
   * @type {AdapterPublishOptions}
   */
  adapter?: AdapterPublishOptions
}

export interface Dispatcher<Params> {
  /**
   * Indicates if the dispatcher is enabled. If false,
   * it stops accepting requests.
   * @default true
   */
  $enabled: Store<boolean>
  /**
   * Dispatcher status.
   * @type {DispatcherStatus}
   */
  $status: Store<DispatcherStatus>
  $sent: Store<boolean>
  $idle: Store<boolean>
  /**
   * Sends data to the other side.
   */
  dispatch: EventCallable<Params>
  /**
   * Callback triggered immediately after sending data.
   */
  done: Event<{ params: Params }>
  finished: {
    done: Event<{ params?: Params }>
    /**
     * Triggered if $enabled is false during the call.
     */
    skip: Event<void>
  }
  /**
   * Parameters at the time of the last call.
   */
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
