import type { Validator } from '@farfetched/core'
import type { StoreWritable } from 'effector'
import { createStore } from 'effector'
import { Socket as SocketIoInstance } from 'socket.io-client'
import { ANY_WEBSOCKET_EVENT } from './consts'

// TODO: SPLIT FILES
type AnyKey = keyof any
export type Nil = null | undefined

export type AnyRecord = Record<AnyKey, unknown>
export type AnyFn = (...args: any[]) => unknown

export type WebsocketEventsConfig<
  Event extends WebsocketEvent = WebsocketEvent
> = Record<Event, string> | Event[] | readonly Event[]

export type WebsocketEvent = string

export type WebsocketInstance = SocketIoInstance | WebSocket

export type OperationStatus = 'initial' | 'opened' | 'closed'

export const isFunction = (target: unknown): target is AnyFn =>
  typeof target === 'function'

export const isObject = (target: unknown): target is AnyRecord =>
  typeof target === 'object' && target !== null && !Array.isArray(target)

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

export const validValidator: Validator<any, any, any> = () => true

export const identity = <T>(value: T) => value
