import { Socket as SocketIoInstance } from 'socket.io-client'

type AnyKey = keyof any

export type Nil = null | undefined

export type AnyRecord = Record<AnyKey, unknown>

export type AnyFn = (...args: any[]) => unknown

export const isFunction = (target: unknown): target is AnyFn =>
  typeof target === 'function'

export const isObject = (target: unknown): target is AnyRecord =>
  typeof target === 'object' && target !== null && !Array.isArray(target)

export type WebsocketEventsConfig<
  Event extends WebsocketEvent = WebsocketEvent
> = Record<Event, string> | Event[] | readonly Event[]

export type WebsocketEvent = string

export type WebsocketInstance = SocketIoInstance | WebSocket

export type OperationStatus = 'initial' | 'opened' | 'closed'

export type InterceptType = 'incoming' | 'outgoing'

export type InterceptStatus = 'done' | 'skip' | 'failed'

export interface InterceptResponse<Data = unknown> {
  type: InterceptType
  status: InterceptStatus
  scope: string
  data: Data
}
