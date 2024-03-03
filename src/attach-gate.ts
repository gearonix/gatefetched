import type { ProtocolGateway } from '@/create-gateway'
import { createGateway } from '@/create-gateway'
import type { AnyEffectorGate } from '@/shared/types'

/**
 * Attaches a scoped gate to a gateway.
 *
 * @template Gateway - Type of the protocol gateway.
 * @template Gate - Type of the scoped gate.
 *
 * @param {Gateway} gateway - The gateway to attach the gate to
 * @param {Gate} scopedGate - Any effector gate
 *
 * @returns {ProtocolGateway<any, string>} - The newly created scoped gateway.
 */
export function attachGate<
  Gateway extends ProtocolGateway<any, any>,
  Gate extends AnyEffectorGate
>(gateway: Gateway, scopedGate: Gate): Gateway {
  const rawOptions = gateway.__.options

  const scopedGateway = createGateway({
    from: gateway.instance,
    ...rawOptions,
    __: {
      scopedGate
    }
  })

  return scopedGateway as Gateway
}
