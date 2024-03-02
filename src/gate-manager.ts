import type { EventCallable, Store } from 'effector'
import { createApi, createStore, sample } from 'effector'
import { and, empty, not, or } from '@/libs/patronum'
import type { AnyEffectorGate } from '@/shared/types'

export interface GateManager {
  $scopeReady: Store<boolean>
  manager: {
    provide: EventCallable<AnyEffectorGate>
    clear: EventCallable<void>
  }
}

export function createGateManager(): GateManager {
  const $scopedGate = createStore<AnyEffectorGate | null>(null, {
    serialize: 'ignore',
    name: 'farsocket.$scopedGate',
    sid: 'farsocket.$scopedGate'
  })

  const manager = createApi($scopedGate, {
    provide: (_, gate: AnyEffectorGate) => gate,
    clear: () => null
  })

  const $missing = empty($scopedGate)
  const $exists = not($missing)

  const $mounted = createStore(false, {
    serialize: 'ignore',
    name: 'farsocket.$mounted',
    sid: 'farsocket.$mounted'
  })

  const $existsAndMounted = and($exists, $mounted)

  // eslint-disable-next-line effector/no-useless-methods
  sample({
    clock: $scopedGate,
    filter: Boolean,
    fn: (gate) => {
      sample({
        clock: gate.status,
        target: $mounted
      })
    }
  })
  const $scopeReady = or($missing, $existsAndMounted)

  return {
    $scopeReady,
    manager
  }
}
