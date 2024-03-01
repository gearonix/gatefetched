import type { StoreWritable } from 'effector'
import { createStore } from 'effector'
import { ANY_WEBSOCKET_EVENT } from './consts'

export function safeParseJson(json: string) {
  try {
    return JSON.parse(json) as unknown
  } catch (error) {
    return null
  }
}

export type StoreConfiguration<T = typeof createStore> = T extends (
  defaultState: infer _,
  config: infer Config
) => StoreWritable<unknown>
  ? Config & { serialize: 'ignore' }
  : never

export function ignoreSerialization(
  storeName: string,
  scope?: string
): StoreConfiguration {
  const compositeName = [
    'farsocket',
    scope,
    storeName.padStart(storeName.length + 1, '$')
  ]
    .filter(Boolean)
    .join('.')

  return {
    serialize: 'ignore',
    name: compositeName,
    sid: compositeName
  }
}

export const identity = <T>(value: T) => value

export const isAnyWebSocketEvent = (event: string): boolean =>
  event === ANY_WEBSOCKET_EVENT
