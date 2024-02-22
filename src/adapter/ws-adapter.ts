import type { Nil } from '@lib'
import { ANY_WEBSOCKET_EVENT, isObject } from '@lib'
import type {
  AdapterSubscribeOptions,
  AdapterType,
  SubscribeResult
} from './abstract-adapter'
import { AbstractWsAdapter } from './abstract-adapter'

type WebsocketProtocols = string | string[]

export const ReadyState = {
  CONNECTING_STATE: 0,
  OPEN_STATE: 1,
  CLOSING_STATE: 2,
  CLOSED_STATE: 3
} as const

export interface WsOperationWithEvent<Result> {
  event: string
  data: Result
}

export function assertWsOperationWithEvent(
  response: unknown
): asserts response is WsOperationWithEvent<unknown> {
  const isWsOperation =
    isObject(response) && 'event' in response && 'data' in response

  if (isWsOperation) return

  // TODO: refactor
  throw new Error('error')
}

export const createWsOperation = <Result>(
  event: string,
  data: Result
): WsOperationWithEvent<Result> => ({
  event,
  data
})

export function safeParseJson(json: string) {
  try {
    return JSON.parse(json) as unknown
  } catch (error) {
    return null
  }
}

export class WebsocketAdapter extends AbstractWsAdapter<
  WebSocket,
  WebsocketProtocols
> {
  constructor(client: WebSocket) {
    super(client)

    this.client.addEventListener('error', (error: Event) => {
      // TODO: refactor
      throw new Error('error')
    })

    this.client.addEventListener('close', (evt: Event) => {
      // TODO: refactor
      console.log('connected closed')
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

  public get type(): AdapterType {
    return 'websocket'
  }

  public subscribe(
    event: string,
    callback: (result: SubscribeResult<unknown>) => void,
    options: AdapterSubscribeOptions
  ) {
    function triggerSubscriber(result: unknown) {
      callback({
        eventType: event,
        options,
        result
      } satisfies SubscribeResult<unknown>)
    }

    // using the arrow functions due to the loss of 'this'
    const handleIncomingMessage = (evt: MessageEvent) => {
      if (!evt.isTrusted || evt.defaultPrevented) {
        return
      }

      const parsedResult = safeParseJson(evt.data)

      if (event !== ANY_WEBSOCKET_EVENT) {
        assertWsOperationWithEvent(parsedResult)

        if (parsedResult.event !== event) return

        triggerSubscriber(parsedResult.data)
      }

      triggerSubscriber(parsedResult)

      if (options.once) {
        this.client.removeEventListener('message', handleIncomingMessage)
      }
    }

    this.client.addEventListener('message', handleIncomingMessage)
  }

  public async publish(event: string | Nil, params: unknown = {}) {
    // TODO: add timeout
    if (this.client.readyState !== ReadyState.OPEN_STATE) return

    const serializedParams = event ? createWsOperation(event, params) : params

    this.client.send(JSON.stringify(serializedParams))
  }
}
