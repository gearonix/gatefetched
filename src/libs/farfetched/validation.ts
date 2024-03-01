import type { ValidationResult, Validator } from '@farfetched/core'

export function unwrapValidationResult(result: ValidationResult): string[] {
  if (result === true) {
    return []
  }

  if (result === false) {
    return ['Invalid data']
  }

  if (!Array.isArray(result)) {
    return [result]
  }

  if (result.length === 0) {
    return []
  }

  return result
}

export function checkValidationResult(result: ValidationResult): boolean {
  if (result === true) {
    return true
  }

  if (Array.isArray(result) && result.length === 0) {
    return true
  }

  if (typeof result === 'string' && result.length === 0) {
    return true
  }

  return false
}

export const validValidator: Validator<any, any, any> = () => true
