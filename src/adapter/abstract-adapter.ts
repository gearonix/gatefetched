import type { AnyFunc, AnyObj, WebsocketInstance } from '@lib'

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

export interface BaseWebsocketAdapter<
  Client extends WebsocketInstance = WebsocketInstance,
  Options = unknown
> {
  createConnection(url: string, options: Options): void
  bindConnect(cb: AnyFunc): void
  bindDisconnect(cb: AnyFunc): void
  close(client: Client | null): void
  subscribe(event: string, fn: AnyFunc, options: AdapterSubscribeOptions): void
  publish(event: string, params: AnyObj, options: AdapterPublishOptions): void
  type: AdapterType
}

export abstract class AbstractWsAdapter<
  Client extends WebsocketInstance = WebsocketInstance,
  Options = unknown
> implements BaseWebsocketAdapter<Client, Options>
{
  protected readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  public abstract bindConnect<Fn extends AnyFunc>(cb: Fn): void

  public abstract bindDisconnect<Fn extends AnyFunc>(cb: Fn): void

  public abstract createConnection(url: string, options?: Options): Client

  public close() {
    this.client.close()
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
