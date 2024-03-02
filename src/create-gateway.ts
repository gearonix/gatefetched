import type { DynamicallySourcedField } from '@farfetched/core'
import type { EventCallable, Store } from 'effector'
import type { CreateDispatcher } from '@/dispatcher'
import { createDispatcher } from '@/dispatcher'
import { createGateManager } from '@/gate-manager'
import type {
  AnyEffectorGate,
  InterceptResponse,
  OneSidedProtocols,
  ProtocolEvent,
  ProtocolEventConfig,
  ProtocolInstance
} from '@/shared/types'
import { isObject } from '@/shared/utils'
import { createAdapter } from './adapters'
import { AbstractProtocolAdapter } from './adapters/abstract-adapter'
import type { CreateListener } from './listener'
import { createListener } from './listener'

export interface BaseCreateGatewayParams<
  Instance extends ProtocolInstance = ProtocolInstance,
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

export type WebsocketGateway<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent = ProtocolEvent
> = {
  instance: Instance
  adapter: AbstractProtocolAdapter<Instance>
  listener: CreateListener<Events>
  bindGate: (gate: AnyEffectorGate) => void
  __: {
    gate: {
      provide: EventCallable<AnyEffectorGate>
      clear: EventCallable<void>
    }
    kind: symbol
  }
} & (Instance extends OneSidedProtocols
  ? Record<string, never>
  : {
      dispatcher: CreateDispatcher<Events>
    })

type CreateGatewayParamsWithEvents<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent
> = BaseCreateGatewayParams<Instance> & {
  events: ProtocolEventConfig<Events>
}

export type CreateGatewayParams<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent = ProtocolEvent
> =
  | BaseCreateGatewayParams<Instance>
  | CreateGatewayParamsWithEvents<Instance, Events>
  | Instance

export const GatewaySymbol = Symbol('Gateway')

export function createGateway<Instance extends ProtocolInstance>(
  options: BaseCreateGatewayParams<Instance>
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent
>(
  options: BaseCreateGatewayParams<Instance> & {
    events: ProtocolEventConfig<Events>
  }
): WebsocketGateway<Instance, Events>

export function createGateway<Instance extends ProtocolInstance>(
  instance: Instance
): WebsocketGateway<Instance>

export function createGateway<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent
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
      gate: gateManager,
      kind: GatewaySymbol
    }
  }
}

export type PreparedGatewayParams = Omit<BaseCreateGatewayParams, 'from'> & {
  adapter: AbstractProtocolAdapter
  events?: ProtocolEventConfig<any>
  gate: {
    ready: Store<boolean>
  }
}

interface CreateGatewayParamsNormalized<Instance> {
  instance: Instance
  options: Omit<BaseCreateGatewayParams, 'from'>
}

export function normalizeCreateGatewayParams<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent
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
