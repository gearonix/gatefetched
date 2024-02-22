import type {
  Contract,
  DynamicallySourcedField,
  Validator
} from '@farfetched/core'
import type { Event, Store } from 'effector'
import type { OperationStatus, WebsocketEvents } from './shared'

interface BaseListenerConfig<
  Events extends WebsocketEvents,
  Data,
  ValidationSource = void,
  TransformedData = void,
  DataSource = void
> {
  name?: Events
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

interface Listener<Data, InitialData = null> {
  $enabled: Store<boolean>
  $status: Store<OperationStatus>
  $finished: Store<boolean>
  $data: Store<Data | InitialData>

  done: Event<{ result: Data }>

  '@@unitShape': () => () => {
    data: Store<Data | InitialData>
  }
}

export interface CreateListener<
  Events extends WebsocketEvents = WebsocketEvents
> {
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

export const createListener = (() => {
  return null as any
}) as CreateListener
