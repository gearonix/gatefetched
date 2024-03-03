import type { DynamicallySourcedField } from '@farfetched/core'
import type { Store } from 'effector'
import type { CreateDispatcher } from '@/dispatcher'
import { createDispatcher } from '@/dispatcher'
import { normalizeStaticOrReactive } from '@/libs/farfetched'
import type {
  AnyEffectorGate,
  BothSidedProtocols,
  InterceptResponse,
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
  /**
   * The protocol instance.
   * @example io('localhost')
   * @example new WebSocket('localhost')
   * @example new EventSource('localhost')
   */
  from: Instance
  /**
   * A callback invoked after any incoming or outgoing operation.
   * @type {(InterceptResponse) => void}
   */
  intercept?: DynamicallySourcedField<
    InterceptResponse,
    unknown,
    InterceptSource
  >
  response?: {
    /**
     * Serializes data globally.
     * Each incoming message is transformed by this callback.
     */
    mapData?: DynamicallySourcedField<any, any, DataSource>
  }
  /**
   * @internal
   * Used internally by the library.
   */
  __?: Readonly<{
    scopedGate?: AnyEffectorGate
  }> &
    Record<string, unknown>
}

export type ProtocolGateway<
  Instance extends ProtocolInstance,
  Events extends ProtocolEvent = ProtocolEvent
> = {
  /**
   * The protocol instance.
   * @example io('localhost')
   */
  instance: Instance
  /**
   * The adapter selected depending on the instance type.
   * Provides deeper control over the provided instance.
   * @example IoAdapter
   * @example SseAdapter
   */
  adapter: AbstractProtocolAdapter<Instance>
  /**
   * Method to create a listener API that listens
   * to messages incoming from the other side.
   */
  listener: CreateListener<Events>
  /**
   * @internal
   * Used internally by the library.
   */
  __: {
    /**
     * Effector store indicating
     * if the component is mounted, if gate is present.
     */
    scopeReady: Store<boolean>
    kind: symbol
    /**
     * Normalized options received through parameters.
     */
    options: CreateGatewayParamsNormalized<Instance>['options']
  }
} & (Instance extends BothSidedProtocols
  ? {
      /**
       * Method to create a dispatcher API
       * that can publish and send messages to the other side.
       * Absent in one-sided protocols.
       */
      dispatcher: CreateDispatcher<Events>
    }
  : Record<string, never>)

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

export type PreparedGatewayParams = Omit<BaseCreateGatewayParams, 'from'> & {
  adapter: AbstractProtocolAdapter
  events?: ProtocolEventConfig<any>
  gate: {
    ready: Store<boolean>
  }
}

export function createGateway<Instance extends ProtocolInstance>(
  options: BaseCreateGatewayParams<Instance>
): ProtocolGateway<Instance>

export function createGateway<
  Instance extends ProtocolInstance,
  const Events extends ProtocolEvent
>(
  options: BaseCreateGatewayParams<Instance> & {
    events: ProtocolEventConfig<Events>
  }
): ProtocolGateway<Instance, Events>

export function createGateway<Instance extends ProtocolInstance>(
  instance: Instance
): ProtocolGateway<Instance>

export function createGateway<
  Instance extends ProtocolInstance,
  const Events extends ProtocolEvent
>(rawParams: CreateGatewayParams<Instance, Events>): ProtocolGateway<any> {
  const { instance, options } = normalizeCreateGatewayParams(rawParams)

  const scopedGate = options.__?.scopedGate
  const $scopeReady = normalizeStaticOrReactive(scopedGate?.status ?? true)

  const adapter = createAdapter({ instance })

  const preparedParams = {
    ...options,
    adapter,
    gate: {
      ready: $scopeReady
    }
  } satisfies PreparedGatewayParams

  const listener = createListener(preparedParams)
  const dispatcher = createDispatcher(preparedParams)

  return {
    instance,
    adapter,
    listener,
    dispatcher,
    __: {
      scopeReady: $scopeReady,
      kind: GatewaySymbol,
      options
    }
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
