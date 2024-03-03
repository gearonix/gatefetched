import type {
  InvalidOperationEventResponseError,
  MethodNotFoundError,
  UnsupportedAdapterMethodError,
  UnsupportedWebsocketInstanceError,
  WebsocketConnectionFailureError
} from './types'
import {
  INVALID_OPERATION_EVENT_RESPONSE,
  METHOD_NOT_FOUND,
  UNSUPPORTED_ADAPTER_METHOD,
  UNSUPPORTED_WEBSOCKET_INSTANCE,
  WEBSOCKET_CONNECTION_FAILURE
} from './types'

export function unsupportedInstanceError(config: {
  instance: unknown
}): UnsupportedWebsocketInstanceError {
  return {
    ...config,
    errorType: UNSUPPORTED_WEBSOCKET_INSTANCE,
    explanation:
      'Unsupported WebSocket instance. Provide a Socket.IO or a standard WebSocket instance'
  }
}

export function invalidOperationEventResponseError(): InvalidOperationEventResponseError {
  return {
    errorType: INVALID_OPERATION_EVENT_RESPONSE,
    explanation: `Invalid WebSocket response format.
    Then providing an event with this adapter,
    ensure response is an object with 'event' and 'data' properties.`
  }
}

export function websocketConnectionFailureError(
  error: unknown
): WebsocketConnectionFailureError {
  return {
    errorType: WEBSOCKET_CONNECTION_FAILURE,
    explanation: 'Failed to establish websocket connection',
    error
  }
}

export function unsupportedAdapterMethodError(
  method: string
): UnsupportedAdapterMethodError {
  return {
    method,
    errorType: UNSUPPORTED_ADAPTER_METHOD,
    explanation: `The selected adapter does not support the method '${method}'`
  }
}

export function methodNotFoundError(method: string): MethodNotFoundError {
  return {
    method,
    errorType: METHOD_NOT_FOUND,
    explanation: `Selected method '${method}' is not specified in the 'events' configuration`
  }
}
