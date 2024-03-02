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
  // TODO: rewrite on reshape

  const $scopedGate = createStore<AnyEffectorGate | null>(null, {
    serialize: 'ignore',
    name: 'farsocket.$scopedGate',
    sid: 'farsocket.$scopedGate'
  })

  const gateManager = createApi($scopedGate, {
    provide: (_, gate: AnyEffectorGate) => gate,
    clear: () => null
  })

  const $gateMissing = empty($scopedGate)
  const $gateExists = not($gateMissing)

  const $mounted = createStore(false, {
    serialize: 'ignore',
    name: 'farsocket.$mounted',
    sid: 'farsocket.$mounted'
  })

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

  const $scopeReady = or($gateMissing, and($gateExists, $mounted))

  return {
    $scopeReady,
    manager: gateManager
  }
}
