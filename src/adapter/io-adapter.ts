import type { AnyFunc, AnyObj } from '@lib'
import { ANY_WEBSOCKET_EVENT } from '@lib'
import type {
  ManagerOptions,
  Socket as IoClient,
  SocketOptions
} from 'socket.io-client'
import { io as createIoClient } from 'socket.io-client'
import type {
  AdapterPublishOptions,
  AdapterSubscribeOptions,
  AdapterType,
  SubscribeResult
} from './abstract-adapter'
import {
  AbstractWsAdapter,
  CONNECTION_EVENT,
  DISCONNECT_EVENT
} from './abstract-adapter'

export type IoOptions = ManagerOptions & SocketOptions

export class IoAdapter extends AbstractWsAdapter<IoClient, IoOptions> {
  public bindConnect<Fn extends AnyFunc>(cb: Fn) {
    this.client.on(CONNECTION_EVENT, cb)
  }

  public bindDisconnect<Fn extends AnyFunc>(cb: Fn) {
    this.client.on(DISCONNECT_EVENT, cb)
  }

  public createConnection(url: string, options: IoOptions) {
    return createIoClient(url, options)
  }

  public get type(): AdapterType {
    return 'socket.io'
  }

  public subscribe(
    event: string,
    callback: (result: SubscribeResult<unknown>) => void,
    options: AdapterSubscribeOptions
  ) {
    const prepareResult = (
      result: unknown,
      overrideEvent?: string
    ): SubscribeResult<unknown> => ({
      eventType: overrideEvent ?? event,
      options,
      result
    })

    if (!options.dirty) this.client.off(event)

    // TODO: refactor
    if (event === ANY_WEBSOCKET_EVENT) {
      this.client.onAny((event, result) => {
        callback(prepareResult(result, event))
      })
      return
    }

    const handleRegularEvent = (result: unknown) =>
      callback(prepareResult(result))

    if (options.once) {
      this.client.once(event, handleRegularEvent)
      return
    }

    this.client.on(event, handleRegularEvent)
  }

  public async publish<Params extends AnyObj>(
    event: string,
    params: Params,
    { withAck, timeout }: AdapterPublishOptions
  ) {
    if (withAck) {
      await this.client.emitWithAck(event, params)
      return
    }

    if (timeout) {
      this.client.timeout(timeout).emit(event, params)
      return
    }

    this.client.emit(event, params)
  }
}
