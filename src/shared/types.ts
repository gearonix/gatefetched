import type { EventCallable, Store } from 'effector'
import { Socket as SocketIoInstance } from 'socket.io-client'

type AnyKey = keyof any

export type Nil = null | undefined

export type AnyRecord = Record<AnyKey, unknown>

export type AnyFn = (...args: any[]) => unknown

export type ProtocolEventConfig<Event extends ProtocolEvent = ProtocolEvent> =
  | Record<Event, string>
  | Event[]
  | readonly Event[]

export type ProtocolEvent = string

export type ProtocolInstance = SocketIoInstance | WebSocket | EventSource

export type OneSidedProtocols = Extract<ProtocolInstance, EventSource>

export type InterceptType = 'incoming' | 'outgoing'

export type InterceptStatus = 'done' | 'skip' | 'failed'

export interface InterceptResponse<Data = unknown> {
  type: InterceptType
  status: InterceptStatus
  scope: string
  data: Data
}

export interface AnyEffectorGate<Props = unknown> {
  open: EventCallable<Props>
  close: EventCallable<Props>
  status: Store<boolean>
  state: Store<Props>
}
