export { attachGate } from './attach-gate'
export { createGateway } from './create-gateway'

// types
export type {
  BaseCreateGatewayParams,
  CreateGatewayParams,
  ProtocolGateway
} from './create-gateway'
export type {
  BaseDispatcherConfig,
  CreateDispatcher,
  Dispatcher,
  DispatcherStatus
} from './dispatcher'
export {
  invalidOperationEventResponseError,
  methodNotFoundError,
  unsupportedAdapterMethodError,
  unsupportedInstanceError,
  websocketConnectionFailureError
} from './errors/create-error'
export type {
  InvalidOperationEventResponseError,
  MethodNotFoundError,
  UnsupportedAdapterMethodError,
  UnsupportedWebsocketInstanceError,
  WebsocketConnectionFailureError
} from './errors/types'
export type {
  BaseListenerConfig,
  CreateListener,
  Listener,
  ListenerStatus
} from './listener'

// utils
export * from './shared/consts'
export * from './shared/types'
export * from './shared/utils'
