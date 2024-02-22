import { Socket as SocketIoInstance } from 'socket.io-client'
import { ANY_WEBSOCKET_EVENT } from './consts'

type AnyKey = keyof any
export type Nil = null | undefined

export type AnyObj = Record<AnyKey, unknown>
export type AnyFunc = (...args: any[]) => unknown

export type WebsocketEventsConfig<Event extends WebsocketEvents> =
  | Record<Event, string>
  | Event[]
  | readonly Event[]
export type WebsocketEvents = string

export type WebsocketInstance = SocketIoInstance | WebSocket

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
