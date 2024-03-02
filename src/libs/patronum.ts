/**
 * https://github.com/effector/patronum
 */

import type { Store } from 'effector'
import { combine } from 'effector'

export function and(...stores: Array<Store<any>>): Store<boolean> {
  return combine(
    stores,
    (values) => {
      for (const value of values) {
        if (!value) {
          return false
        }
      }
      return true
    },
    { skipVoid: false }
  ) as Store<boolean>
}

export function or(...stores: Array<Store<any>>): Store<boolean> {
  return combine(
    stores,
    (values) => {
      for (const value of values) {
        if (value) {
          return true
        }
      }
      return false
    },
    { skipVoid: false }
  ) as Store<boolean>
}

export function not<T extends unknown>(source: Store<T>): Store<boolean> {
  return source.map((value) => !value, { skipVoid: false })
}

export function equals<A, B>(a: A, b: B): Store<boolean> {
  return combine(a as Store<A>, b as Store<A>, (a, b) => a === b, {
    skipVoid: false
  })
}

export function empty<A>(source: Store<A | null | undefined>): Store<boolean> {
  return source.map((value) => value == null, { skipVoid: false })
}
