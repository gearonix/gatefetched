import type { Contract, InvalidDataError } from '@farfetched/core'
import { invalidDataError, unknownContract } from '@farfetched/core'
import type { Effect } from 'effector'
import { createEffect } from 'effector'

/**
 * @internal
 * Was taken from @farfetched/core
 */

export function createContractApplier(
  contract: Contract<unknown, unknown> = unknownContract
): Effect<{ params: unknown; result: unknown }, unknown, InvalidDataError> {
  const applyContractFx = createEffect<
    { params: unknown; result: unknown },
    unknown,
    InvalidDataError
  >({
    handler: ({ result: data }) => {
      const isData = contract.isData(data)
      if (!isData) {
        throw invalidDataError({
          validationErrors: contract.getErrorMessages(data),
          response: data
        })
      }

      return data
    },
    sid: 'farsocket.applyContractFx'
  })

  return applyContractFx
}
