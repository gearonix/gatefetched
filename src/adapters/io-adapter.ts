import type {
  ManagerOptions,
  Socket as IoClient,
  SocketOptions
} from 'socket.io-client'
import { io as createIoClient } from 'socket.io-client'
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../consts'
import type { AnyFunc } from '../shared'
import { isAnyWebSocketEvent } from '../shared'
import type {
  AdapterPublishOptions,
  AdapterSubscribeOptions,
  SubscribeResponse
} from './abstract-adapter'
import { AbstractWsAdapter } from './abstract-adapter'
import { AdapterMeta } from './matchers'

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

  public subscribe(
    event: string,
    trigger: (result: SubscribeResponse<unknown>) => void,
    { dirty, ...options }: AdapterSubscribeOptions
  ) {
    if (!dirty) this.client.off(event)

    if (isAnyWebSocketEvent(event)) {
      this.client.onAny((overrideEvent, data) => {
        trigger({ overrideEvent, data })
      })
      return
    }

    const method = options.once ? 'once' : 'on'

    this.client[method](event, (data: unknown) => trigger({ data }))
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
