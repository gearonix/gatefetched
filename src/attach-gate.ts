import type { ProtocolGateway } from '@/create-gateway'
import { createGateway } from '@/create-gateway'
import type { AnyEffectorGate } from '@/shared/types'

export function attachGate<
  Gateway extends ProtocolGateway<any, any>,
  Gate extends AnyEffectorGate
>(gateway: Gateway, scopedGate: Gate) {
  const rawOptions = gateway.__.options

  const scopedGateway = createGateway({
    from: gateway.instance,
    ...rawOptions,
    __: {
      scopedGate
    }
  })

  return scopedGateway
}
