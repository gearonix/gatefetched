import { Socket as IoInstance } from 'socket.io-client'
import { SseAdapter } from '@/adapters/sse-adapter'
import type { ProtocolInstance } from '@/shared/types'
import { isObject } from '@/shared/utils'
import { AbstractProtocolAdapter } from './abstract-adapter'
import { IoAdapter } from './io-adapter'
import { WebsocketAdapter } from './ws-adapter'

interface AdapterMatcher {
  adapter: new (...args: any[]) => AbstractProtocolAdapter
  condition: (
    instance: unknown | ProtocolInstance
  ) => instance is ProtocolInstance
}

export const adapterMatchers = [
  {
    condition: isSocketIoInstance,
    adapter: IoAdapter
  },
  {
    condition: isBaseWebsocketInstance,
    adapter: WebsocketAdapter
  },
  {
    condition: isSseInstance,
    adapter: SseAdapter
  }
] as AdapterMatcher[]

export const AdapterMeta = {
  SOCKET_IO: 'socket.io',
  WS_DOM: 'websocket-dom',
  SSE: 'sse'
} as const

// guards
function isSocketIoInstance(
  instance: unknown | IoInstance
): instance is IoInstance {
  return isObject(instance) && 'io' in instance && 'connect' in instance
}

function isBaseWebsocketInstance(
  instance: unknown | ProtocolInstance
): instance is WebSocket {
  return isObject(instance) && instance instanceof WebSocket
}

function isSseInstance(
  instance: unknown | EventSource
): instance is EventSource {
  return isObject(instance) && instance instanceof EventSource
}
