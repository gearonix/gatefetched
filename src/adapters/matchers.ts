import { Socket as IoInstance } from 'socket.io-client'
import type { WebsocketInstance } from '@/shared/types'
import { isObject } from '@/shared/types'
import { AbstractWsAdapter } from './abstract-adapter'
import { IoAdapter } from './io-adapter'
import { WebsocketAdapter } from './ws-adapter'

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

// guards

function isSocketIoInstance(
  instance: unknown | IoInstance
): instance is IoInstance {
  return isObject(instance) && 'io' in instance && 'connect' in instance
}

function isBaseWebsocketInstance(
  instance: unknown | WebsocketInstance
): instance is WebSocket {
  return (
    isObject(instance) && 'readyState' in instance && 'protocol' in instance
  )
}
