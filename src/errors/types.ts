import type { FarfetchedError } from '@farfetched/core'

export const UNSUPPORTED_WEBSOCKET_INSTANCE = 'UNSUPPORTED_WEBSOCKET_INSTANCE'

export interface UnsupportedWebsocketInstanceError
  extends FarfetchedError<typeof UNSUPPORTED_WEBSOCKET_INSTANCE> {
  instance: unknown
}

export const INVALID_OPERATION_EVENT_RESPONSE =
  'INVALID_OPERATION_EVENT_RESPONSE'

export type InvalidOperationEventResponseError = FarfetchedError<
  typeof INVALID_OPERATION_EVENT_RESPONSE
>

export const WEBSOCKET_CONNECTION_FAILURE = 'WEBSOCKET_CONNECTION_FAILURE'

export interface WebsocketConnectionFailureError
  extends FarfetchedError<typeof WEBSOCKET_CONNECTION_FAILURE> {
  error: unknown
}

export const UNSUPPORTED_ADAPTER_METHOD = 'UNSUPPORTED_ADAPTER_METHOD'

export interface UnsupportedAdapterMethodError
  extends FarfetchedError<typeof UNSUPPORTED_ADAPTER_METHOD> {
  method: string
}

export const METHOD_NOT_FOUND = 'METHOD_NOT_FOUND'

export interface MethodNotFoundError
  extends FarfetchedError<typeof METHOD_NOT_FOUND> {
  method: string
}
