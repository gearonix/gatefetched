import type { ProtocolInstance } from '@/shared/types'
import { unsupportedInstanceError } from '../errors/create-error'
import type { AbstractProtocolAdapter } from './abstract-adapter'
import { adapterMatchers } from './matchers'

export interface CreateAdapterParams {
  instance: ProtocolInstance
}

export function createAdapter({
  instance
}: CreateAdapterParams): AbstractProtocolAdapter {
  const matched = adapterMatchers.find((matcher) => matcher.condition(instance))

  if (matched) {
    return new matched.adapter(instance)
  }

  throw unsupportedInstanceError({ instance })
}
