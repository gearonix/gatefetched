import { unsupportedInstanceError } from '../errors/create-error'
import type { WebsocketInstance } from '../shared'
import type { AbstractWsAdapter } from './abstract-adapter'
import { adapterMatchers } from './matchers'

export interface CreateAdapterParams {
  instance: WebsocketInstance
}

export function createAdapter({
  instance
}: CreateAdapterParams): AbstractWsAdapter {
  const matched = adapterMatchers.find((matcher) => matcher.condition(instance))

  if (matched) {
    return new matched.adapter(instance)
  }

  throw unsupportedInstanceError({ instance })
}
