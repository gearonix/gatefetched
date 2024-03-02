import type { ProtocolEvent, ProtocolEventConfig } from '@/shared/types'
import { isObject } from '@/shared/utils'

export const serializeEventName = <Event extends ProtocolEvent = ProtocolEvent>(
  target: Event,
  events: ProtocolEventConfig<Event> | undefined
): string => (isObject(events) ? events[target] : target)
