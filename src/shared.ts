import { createStore, StoreWritable } from 'effector'
import { Socket as SocketIoInstance } from 'socket.io-client'
import { ANY_WEBSOCKET_EVENT } from './consts'

// TODO: SPLIT FILES
type AnyKey = keyof any
export type Nil = null | undefined

export type AnyObj = Record<AnyKey, unknown>
export type AnyFn = (...args: any[]) => unknown

export type WebsocketEventsConfig<
  Event extends WebsocketEvents = WebsocketEvents
> = Record<Event, string> | Event[] | readonly Event[]

export type WebsocketEvents = string

export type WebsocketInstance = SocketIoInstance | WebSocket

export type OperationStatus = 'initial' | 'waiting' | 'done'

export const isFunction = (target: unknown): target is AnyFn =>
  typeof target === 'function'

export const isObject = (target: unknown): target is AnyObj =>
  typeof target === 'object' && target !== null

export const isAnyWebSocketEvent = (event: string): boolean =>
  event === ANY_WEBSOCKET_EVENT

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
