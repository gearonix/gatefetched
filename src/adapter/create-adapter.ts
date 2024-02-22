import type { WebsocketInstance } from '@lib'
import { isObject } from '@lib'
import type { Store } from 'effector'
import { Socket as IoInstance } from 'socket.io-client'
import type { BaseWebsocketAdapter } from './abstract-adapter'
import { IoAdapter } from './io-adapter'
import { WebsocketAdapter } from './ws-adapter'

export interface CreateAdapterParams {
  $from: Store<WebsocketInstance>
}

export const isSocketIoInstance = (
  instance: unknown | WebsocketInstance
): instance is IoInstance =>
  isObject(instance) && 'io' in instance && 'connect' in instance

export const isBaseWebsocketInstance = (
  instance: unknown | WebsocketInstance
): instance is WebSocket =>
  isObject(instance) && 'readyState' in instance && 'protocol' in instance

export function createAdapter(
  params: CreateAdapterParams
): Store<BaseWebsocketAdapter> {
  // TODO: refactor
  return params.$from.map((instance) => {
    if (isSocketIoInstance(instance)) return new IoAdapter(instance)
    if (isBaseWebsocketInstance(instance)) return new WebsocketAdapter(instance)

    // TODO: error handling
    throw new Error('Never')
  })
}
