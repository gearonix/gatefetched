import type { StoreWritable } from 'effector'
import { createStore } from 'effector'

export type StoreConfiguration<T = typeof createStore> = T extends (
  defaultState: infer _,
  config: infer Config
) => StoreWritable<unknown>
  ? Config & { serialize: 'ignore' }
  : never

export function ignoreSerialization(
  storeName: string,
  scope?: string
): StoreConfiguration {
  const compositeName = [
    'farsocket',
    scope,
    storeName.padStart(storeName.length + 1, '$')
  ]
    .filter(Boolean)
    .join('.')

  return {
    serialize: 'ignore',
    name: compositeName,
    sid: compositeName
  }
}
