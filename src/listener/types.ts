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
