import type { AnyFunc, AnyObj, Nil } from '@lib'
import { isFunction } from '@lib'

export interface BaseWsInstance {
  on: (event: string, callback: AnyFunc) => void
  close: AnyFunc
}

export type AdapterType = 'socket.io' | 'websocket'

export const CONNECTION_EVENT = 'connection' as const
export const DISCONNECT_EVENT = 'disconnect' as const

export interface AdapterPublishOptions {
  withAck?: boolean
  timeout?: number
}

export interface AdapterSubscribeOptions {
  once?: boolean
  dirty?: boolean
}

export interface SubscribeResult<Result> {
  eventType: string
  options: AdapterSubscribeOptions
  result: Result
}

export interface WebsocketAdapter<
  Client extends BaseWsInstance,
  Options = any
> {
  createConnection(url: string, options: Options): void
  bindConnect(client: Client, cb: AnyFunc): void
  bindDisconnect(client: Client, cb: AnyFunc): void
  close(client: Client | null): void
  subscribe(event: string, fn: AnyFunc, options: AdapterSubscribeOptions): void
  publish(event: string, params: AnyObj, options: AdapterPublishOptions): void
  type: AdapterType
}

export abstract class AbstractWsAdapter<
  Client extends BaseWsInstance = BaseWsInstance,
  Options = unknown
> implements WebsocketAdapter<Client, Options>
{
  protected readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  public bindConnect<Fn extends AnyFunc>(client: Client, cb: Fn) {
    client.on(CONNECTION_EVENT, cb)
  }

  public bindDisconnect<Fn extends AnyFunc>(client: Client, cb: Fn) {
    client.on(DISCONNECT_EVENT, cb)
  }

  public abstract createConnection(url: string, options: Options): Client

  public close(client: Client | Nil) {
    const isCallable = client && isFunction(client.close)

    if (isCallable) client.close()
  }

  public abstract get type(): AdapterType

  public abstract subscribe(
    event: string,
    fn: AnyFunc,
    options: AdapterSubscribeOptions
  ): void

  public abstract publish(
    event: string,
    params: AnyObj,
    options: AdapterPublishOptions
  ): void
}
