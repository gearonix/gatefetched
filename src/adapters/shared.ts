import { ANY_WEBSOCKET_EVENT } from '@/shared/consts'

export function safeParseJson(json: string) {
  try {
    return JSON.parse(json) as unknown
  } catch (error) {
    return null
  }
}

export const isAnyWebSocketEvent = (event: string): boolean =>
  event === ANY_WEBSOCKET_EVENT
