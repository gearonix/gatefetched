import type { AnyFn, ProtocolInstance } from '@/shared/types'

export interface AdapterPublishOptions {
  withAck?: boolean
  timeout?: number
}

export interface AdapterSubscribeOptions {
  once?: boolean
  dirty?: boolean
}

export interface AdapterSubscribeResult<Result> {
  result: Result
  overrideEvent?: string
}

export abstract class AbstractProtocolAdapter<
  Client extends ProtocolInstance = ProtocolInstance,
  Options = unknown
> {
  protected readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  protected abstract bindErrorHandlers(): void

  public abstract bindConnect<Fn extends AnyFn>(cb: Fn): void

  public abstract bindDisconnect<Fn extends AnyFn>(cb: Fn): void

  public abstract createConnection(url: string, options?: Options): Client

  protected close() {
    this.client.close()
  }

  public abstract get kind(): string

  public abstract subscribe(
    event: string,
    fn: (result: AdapterSubscribeResult<unknown>) => void,
    options?: AdapterSubscribeOptions
  ): void

  public abstract unsubscribe(event: string): void

  public abstract publish(
    event: string,
    params: unknown,
    options?: AdapterPublishOptions
  ): void
}
