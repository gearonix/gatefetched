import type { ParamsDeclaration, SourcedField } from '@farfetched/core'
import type { Event, EventCallable, Store } from 'effector'
import type { ProtocolEvent } from 'gatefetched'
import type { AdapterPublishOptions } from '@/adapters/abstract-adapter'
import type { StaticOrReactive } from '@/libs/farfetched'

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
