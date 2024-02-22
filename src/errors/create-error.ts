import type {
  InvalidOperationEventResponseError,
  UnsupportedWebsocketInstanceError,
  WebsocketConnectionFailureError
} from './types'
import {
  INVALID_OPERATION_EVENT_RESPONSE,
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
  error: Event
): WebsocketConnectionFailureError {
  return {
    errorType: WEBSOCKET_CONNECTION_FAILURE,
    explanation: 'Failed to establish websocket connection',
    error
  }
}
