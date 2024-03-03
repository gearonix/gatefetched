import type { Store } from 'effector'
import { createStore, is } from 'effector'

export type StaticOrReactive<T> = T | Store<Exclude<T, undefined>>

export function normalizeStaticOrReactive<T>(v: StaticOrReactive<T>): Store<T>
export function normalizeStaticOrReactive<T>(
  v?: StaticOrReactive<T>
): Store<Exclude<T, undefined> | null>

export function normalizeStaticOrReactive<T>(
  v?: StaticOrReactive<T>
): Store<Exclude<T, undefined> | null> {
  if (!v) {
    return createStore<Exclude<T, undefined> | null>(null, {
      serialize: 'ignore',
      name: 'ff.$target/undefined',
      sid: 'ff.$target/$undefined'
    })
  }

  if (is.store(v)) {
    return v
  }

  return createStore<Exclude<T, undefined> | null>(v as Exclude<T, undefined>, {
    serialize: 'ignore',
    name: 'ff.$target/valueField',
    sid: 'ff.$target/$valueField'
  })
}
