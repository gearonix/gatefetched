import type { AnyRecord } from '@/shared/types'

export const identity = <T>(value: T) => value

export const isObject = (target: unknown): target is AnyRecord =>
  typeof target === 'object' && target !== null && !Array.isArray(target)

export const isString = (value: unknown): value is string =>
  typeof value === 'string'
