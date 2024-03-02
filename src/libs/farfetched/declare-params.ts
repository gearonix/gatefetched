/**
 * https://github.com/igorkamyshev/farfetched
 */

import type { Subscription } from 'effector'
import { createEvent } from 'effector'

export interface ParamsDeclaration<T> {
  watch(cb: (payloaad: T) => void): Subscription
}

export function declareParams<T>(): ParamsDeclaration<T> {
  return createEvent<T>()
}
