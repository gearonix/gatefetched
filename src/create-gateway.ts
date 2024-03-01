import type {
  DynamicallySourcedField,
  ParamsDeclaration,
  SourcedField
} from '@farfetched/core'
import { normalizeSourced } from '@farfetched/core'
import type { Event, Store } from 'effector'
import type {
  AnyRecord,
  InterceptResponse,
  OperationStatus,
  WebsocketEvent,
  WebsocketEventsConfig,
  WebsocketInstance
} from '@/shared/types'
import { isObject } from '@/shared/types'
import { createAdapter } from './adapters'
import { AbstractWsAdapter } from './adapters/abstract-adapter'
import type { CreateListener } from './listener'
import { createListener } from './listener'

export interface BaseCreateGatewayParams<
  Instance extends WebsocketInstance = WebsocketInstance,
  InterceptSource = void,
  DataSource = void
> {
  from: Instance
  intercept?: DynamicallySourcedField<
    InterceptResponse,
    unknown,
    InterceptSource
  >
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
  Events extends WebsocketEvent,
  Params,
  BodySource = void
> {
  name: Events
  params?: ParamsDeclaration<Params>
  request?: {
    body?: SourcedField<Params, AnyRecord, BodySource>
  }
}

interface CreateDispatcher<Events extends WebsocketEvent> {
  <Params, BodySource = void>(
    config: BaseDispatcherConfig<Events, Params, BodySource>
  ): Dispatcher<Params>

  (event: Events): Dispatcher<void>
}

interface WebsocketGateway<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvent = WebsocketEvent
> {
  $instance: Store<Instance>
  listener: CreateListener<Events>
  dispatcher: CreateDispatcher<Events>
}

type CreateGatewayParamsWithEvents<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvent
> = BaseCreateGatewayParams<Instance> & {
  events: WebsocketEventsConfig<Events>
}

export type CreateGatewayParams<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvent = WebsocketEvent
> =
  | BaseCreateGatewayParams<Instance>
  | CreateGatewayParamsWithEvents<Instance, Events>
  | Instance

export function createGateway<Instance extends WebsocketInstance>(
  options: BaseCreateGatewayParams<Instance>
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvent
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
  Events extends WebsocketEvent
>(params: CreateGatewayParams<Instance, Events>): WebsocketGateway<any> {
  const { instance, options } = normalizeCreateGatewayParams(params)

  const adapter = createAdapter({ instance })

  const mixedParams = { ...options, adapter } satisfies GatewayParamsWithAdapter

  return {
    $instance: normalizeSourced({ field: adapter }),
    listener: createListener(mixedParams)
    // TODO: remove any
  } as any
}

export type GatewayParamsWithAdapter = Omit<BaseCreateGatewayParams, 'from'> & {
  adapter: AbstractWsAdapter
  events?: WebsocketEventsConfig<any>
}

interface CreateGatewayParamsNormalized<Instance> {
  instance: Instance
  options: Omit<BaseCreateGatewayParams, 'from'>
}

export function normalizeCreateGatewayParams<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvent
>(
  params: CreateGatewayParams<Instance, Events>
): CreateGatewayParamsNormalized<Instance> {
  const isBaseGatewayConfig = (params: unknown) =>
    isObject(params) && 'from' in params

  const resultParams = {} as CreateGatewayParamsNormalized<Instance>

  if (isBaseGatewayConfig(params)) {
    const { from: instance, ...configParams } =
      params as BaseCreateGatewayParams<Instance>

    Object.assign(resultParams, {
      instance,
      options: configParams
    })

    return resultParams
  }
  const instance = params as Instance

  Object.assign(resultParams, {
    instance,
    options: {}
  })

  return resultParams
}
