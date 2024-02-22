import type { WebsocketInstance } from '@lib'
import type { Store } from 'effector'
import { Socket as IoInstance } from 'socket.io-client'
import { IoAdapter } from './io-adapter'
import type { AbstractWsAdapter } from './abstract-adapter.ts'

export interface CreateAdapterParams {
  $from: Store<WebsocketInstance>
}

export const isSocketIoInstance = (
  instance: WebsocketInstance
): instance is IoInstance =>
  'io' in instance && 'connect' in instance && 'open' in instance

export function createAdapter(
  params: CreateAdapterParams
): Store<AbstractWsAdapter> {
  // TODO: refactor
  return params.$from.map((instance) => {
    if (isSocketIoInstance(instance)) return new IoAdapter(instance)

    // TODO: error handling
    throw new Error('Never')
  })
}
