import { Socket as IoInstance } from 'socket.io-client'
import type { WebsocketInstance } from '../shared'
import { isObject } from '../shared'
import { AbstractWsAdapter } from './abstract-adapter'
import { IoAdapter } from './io-adapter'
import { WebsocketAdapter } from './ws-adapter'

const isSocketIoInstance = (
  instance: unknown | IoInstance
): instance is IoInstance =>
  isObject(instance) && 'io' in instance && 'connect' in instance

const isBaseWebsocketInstance = (
  instance: unknown | WebsocketInstance
): instance is WebSocket =>
  isObject(instance) && 'readyState' in instance && 'protocol' in instance

interface AdapterMatcher {
  adapter: new (...args: any[]) => AbstractWsAdapter
  condition: (
    instance: unknown | WebsocketInstance
  ) => instance is WebsocketInstance
}

export const adapterMatchers = [
  {
    condition: isSocketIoInstance,
    adapter: IoAdapter
  },
  {
    condition: isBaseWebsocketInstance,
    adapter: WebsocketAdapter
  }
] as AdapterMatcher[]

export const AdapterMeta = {
  SOCKET_IO: 'socket.io',
  BASE_WEBSOCKET: 'websocket'
} as const
