import {
  invalidOperationEventResponseError,
  websocketConnectionFailureError
} from '../errors/create-error'
import type { Nil } from '../shared'
import { isAnyWebSocketEvent, isObject, safeParseJson } from '../shared'
import type {
  AdapterSubscribeOptions,
  AdapterType,
  SubscribeResponse
} from './abstract-adapter'
import { AbstractWsAdapter } from './abstract-adapter'
import { AdapterMeta } from './matchers'

export const ReadyState = {
  CONNECTING_STATE: 0,
  OPEN_STATE: 1,
  CLOSING_STATE: 2,
  CLOSED_STATE: 3
} as const

type WebsocketProtocols = string | string[]

export interface WsOperationWithEvent<Result> {
  event: string
  data: Result
}

export function assertWsOperationWithEvent(
  response: unknown
): asserts response is WsOperationWithEvent<unknown> {
  const isValidOperation =
    isObject(response) && 'event' in response && 'data' in response

  if (isValidOperation) return

  throw invalidOperationEventResponseError()
}

export const createWsOperation = <Result>(
  event: string,
  data: Result
): WsOperationWithEvent<Result> => ({
  event,
  data
})

export class WebsocketAdapter extends AbstractWsAdapter<
  WebSocket,
  WebsocketProtocols
> {
  constructor(client: WebSocket) {
    super(client)

    this.listenDefaultMessageHandlers()
  }

  private listenDefaultMessageHandlers() {
    this.client.addEventListener('error', (error: Event) => {
      throw websocketConnectionFailureError(error)
    })

    this.client.addEventListener('close', (evt: Event) => {
      // TODO: extend
    })
  }

  public bindConnect(callback: (evt: Event) => unknown) {
    this.client.addEventListener('open', callback)
  }

  public bindDisconnect(callback: (evt: Event) => unknown) {
    this.client.addEventListener('close', callback)
  }

  public createConnection(url: string, protocols: WebsocketProtocols) {
    return new WebSocket(url, protocols)
  }

  public subscribe(
    event: string,
    trigger: (result: SubscribeResponse<unknown>) => void,
    options: AdapterSubscribeOptions
  ) {
    // using the arrow functions due to the loss of 'this'
    const handleIncomingMessage = (evt: MessageEvent) => {
      if (options.once) {
        this.client.removeEventListener('message', handleIncomingMessage)
      }

      if (!evt.isTrusted || evt.defaultPrevented) return

      const parsedResult = safeParseJson(evt.data)

      if (isAnyWebSocketEvent(event)) {
        trigger({ data: parsedResult })
        return
      }

      assertWsOperationWithEvent(parsedResult)

      if (parsedResult.event === event) {
        trigger({ data: parsedResult.data })
      }
    }

    this.client.addEventListener('message', handleIncomingMessage)
  }

  public async publish<Params extends unknown>(
    event: string | Nil,
    params?: Params
  ) {
    if (this.client.readyState === ReadyState.OPEN_STATE) {
      const serializedParams = event ? createWsOperation(event, params) : params

      this.client.send(JSON.stringify(serializedParams))
    }
  }

  public get kind() {
    return AdapterMeta.BASE_WEBSOCKET
  }
}
