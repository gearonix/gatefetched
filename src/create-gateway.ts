import type {
  DynamicallySourcedField,
  ParamsDeclaration,
  SourcedField
} from '@farfetched/core'
import { normalizeSourced } from '@farfetched/core'
import type { Event, Store } from 'effector'
import { createAdapter } from './adapters'
import type { CreateListener } from './listen'
import type {
  AnyObj,
  OperationStatus,
  WebsocketEvents,
  WebsocketEventsConfig,
  WebsocketInstance
} from './shared'
import { isObject } from './shared'

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
  from: Instance
  logs?: DynamicallySourcedField<LogMessage, unknown, LogSource> | boolean
  response?: {
    mapData?: DynamicallySourcedField<any, any, DataSource>
  }
}

interface Dispatcher<Params> {
  $enabled: Store<boolean>
  $status: Store<OperationStatus>
  $executed: Store<boolean>

  dispatch: Event<Params>

  done: Event<{ params: Params }>

  '@@unitShape': () => () => {
    done: Store<boolean>
    dispatch: Event<Params>
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
    body?: SourcedField<Params, AnyObj, BodySource>
  }
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

type CreateGatewayParamsWithEvents<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents
> = BaseCreateGatewayParams<Instance> & {
  events: WebsocketEventsConfig<Events>
}

export type CreateGatewayParams<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents = WebsocketEvents
> =
  | BaseCreateGatewayParams<Instance>
  | CreateGatewayParamsWithEvents<Instance, Events>
  | Instance

export function isBaseGatewayConfig(params: unknown) {
  return isObject(params) && 'from' in params
}

interface CreateGatewayParamsNormalized<Instance> {
  instance: Instance
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
    events: WebsocketEventsConfig<Events>
  }
): WebsocketGateway<Instance, Events>

export function createGateway<Instance extends WebsocketInstance>(
  instance: Instance
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvents
>(params: CreateGatewayParams<Instance, Events>): WebsocketGateway<any> {
  const { instance, options } = normalizeCreateGatewayParams(params)

  const adapter = createAdapter({ instance })

  return {
    $instance: normalizeSourced({ field: adapter })
    // TODO: remove any
  } as any
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
      from,
      options: configParams
    })

    return resultParams
  }
  const instance = params as Instance

  Object.assign(resultParams, {
    from: instance,
    options: {}
  })

  return resultParams
}
