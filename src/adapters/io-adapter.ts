import type {
  ManagerOptions,
  Socket as IoClient,
  SocketOptions
} from 'socket.io-client'
import { io as createIoClient } from 'socket.io-client'
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../consts'
import type { AnyFn } from '../shared'
import { isAnyWebSocketEvent } from '../shared'
import type {
  AdapterPublishOptions,
  AdapterSubscribeOptions,
  AdapterSubscribeResult
} from './abstract-adapter'
import { AbstractWsAdapter } from './abstract-adapter'
import { AdapterMeta } from './matchers'

export type IoOptions = ManagerOptions & SocketOptions

export class IoAdapter extends AbstractWsAdapter<IoClient, IoOptions> {
  public bindConnect<Fn extends AnyFn>(cb: Fn) {
    this.client.on(CONNECTION_EVENT, cb)
  }

  public bindDisconnect<Fn extends AnyFn>(cb: Fn) {
    this.client.on(DISCONNECT_EVENT, cb)
  }

  public createConnection(url: string, options: IoOptions) {
    return createIoClient(url, options)
  }

  public subscribe(
    event: string,
    trigger: (result: AdapterSubscribeResult<unknown>) => void,
    // TODO add options to public api
    options?: AdapterSubscribeOptions
  ) {
    const triggerEvent = (result: unknown) => trigger({ result })

    if (!options?.dirty) this.client.off(event)

    if (isAnyWebSocketEvent(event)) {
      this.client.onAny((overrideEvent, data) => {
        trigger({ overrideEvent, result: data })
      })
      return
    }

    if (options?.once) {
      this.client.once(event, triggerEvent)
      return
    }

    this.client.on(event, triggerEvent)
  }

  public unsubscribe(event: string) {
    this.client.off(event)
  }

  public async publish<Params extends unknown>(
    event: string,
    params?: Params,
    { withAck, timeout }: AdapterPublishOptions = {}
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

  public get kind() {
    return AdapterMeta.SOCKET_IO
  }
}
