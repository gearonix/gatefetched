import { methodNotFoundError } from '@/errors/create-error'
import type { ProtocolEvent, ProtocolEventConfig } from '@/shared/types'
import { isObject, isString } from '@/shared/utils'

export const serializeEventName = <Event extends ProtocolEvent = ProtocolEvent>(
  target: Event,
  events: ProtocolEventConfig<Event> | undefined
): string => {
  if (isObject(events)) {
    const result = events[target]

    if (!isString(result)) {
      throw methodNotFoundError(target)
    }

    return result
  }

  if (Array.isArray(events)) {
    if (!events.includes(target)) {
      throw methodNotFoundError(target)
    }

    return target
  }

  return target
}
