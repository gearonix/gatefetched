import type { DynamicallySourcedField } from '@farfetched/core'
import type { EventCallable, Store } from 'effector'
import type { CreateDispatcher } from '@/dispatcher'
import { createDispatcher } from '@/dispatcher'
import { createGateManager } from '@/gate-manager'
import type {
  AnyEffectorGate,
  InterceptResponse,
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

export interface WebsocketGateway<
  Instance extends WebsocketInstance,
  Events extends WebsocketEvent = WebsocketEvent
> {
  instance: Instance
  adapter: AbstractWsAdapter<Instance>
  listener: CreateListener<Events>
  dispatcher: CreateDispatcher<Events>
  bindGate: (gate: AnyEffectorGate) => void
  __: {
    gate: {
      provide: EventCallable<AnyEffectorGate>
      clear: EventCallable<void>
    }
  }
}

// TODO: comment everything

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

  const { $scopeReady, manager: gateManager } = createGateManager()

  const mixedParams = {
    ...options,
    adapter,
    gate: {
      ready: $scopeReady
    }
  } satisfies PreparedGatewayParams

  const listener = createListener(mixedParams)
  const dispatcher = createDispatcher(mixedParams)

  return {
    instance,
    adapter,
    listener,
    dispatcher,
    bindGate: gateManager.provide,
    __: {
      gate: gateManager
    }
  }
}

export type PreparedGatewayParams = Omit<BaseCreateGatewayParams, 'from'> & {
  adapter: AbstractWsAdapter
  events?: WebsocketEventsConfig<any>
  gate: {
    ready: Store<boolean>
  }
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
