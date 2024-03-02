import { declareParams } from '@farfetched/core'
import { zodContract } from '@farfetched/zod'
import { combine, createEvent, createStore, sample } from 'effector'
import { useUnit } from 'effector-react'
import { createGateway } from 'farsocket'
import { z } from 'zod'

const toggleEnabled = createEvent()

const $enabled = createStore<boolean>(false)
const $disabled = combine($enabled, (val) => !val)

$enabled.on(toggleEnabled, (v) => !v)

export const events = ['send-request', 'receive-response'] as const

const websocketInstance = new WebSocket('ws://localhost:6868')

const gateway = createGateway({
  from: websocketInstance,
  intercept: console.info,
  events
})

gateway.adapter.bindConnect(console.info)

const contract = zodContract(z.object({ hello: z.string() }))

const receiveResponse = gateway.listener({
  name: 'receive-response',
  immediate: false,
  response: {
    contract
  }
})

sample({
  clock: $enabled,
  filter: $enabled,
  target: receiveResponse.listen
})

sample({
  clock: $enabled,
  filter: $disabled,
  target: receiveResponse.close
})

const sendRequest = gateway.dispatcher({
  name: 'send-request',
  params: declareParams<{ msg: string }>(),
  request: {
    mapBody: ({ msg }) => msg
  }
})

sendRequest.dispatch({ msg: "won't work" })

const $messages = createStore<{ hello: string }[]>([]).on(
  receiveResponse.finished.done,
  (s, { result }) => [...s, result]
)

export function Entrypoint() {
  const [messages, enabled] = useUnit([$messages, $enabled])

  const send = useUnit(sendRequest.dispatch)
  const toggle = useUnit(toggleEnabled)

  return (
    <>
      <h4>Adapter kind: {gateway.adapter.kind}</h4>
      <h6>Enabled: {JSON.stringify(enabled)}</h6>
      <button onClick={() => send({ msg: 'data to server' })}>
        Send request
      </button>
      <button onClick={toggle}>Toggle enabled</button> <br />
      {messages.map((msg, idx) => (
        <h2 key={idx}>
          {msg.hello} {idx}
        </h2>
      ))}
    </>
  )
}
