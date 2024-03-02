import { createStore } from 'effector'
import { useUnit } from 'effector-react/effector-react.umd'
import { createGateway } from 'farsocket'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

const log = console.info
const sse = new EventSource('http://localhost:6868/sse')

const gateway = createGateway(sse)

gateway.adapter.bindConnect(log)

const channel = gateway.listener<{ hello: string }>()

// eslint-disable-next-line effector/no-watch
channel.done.watch(log)

const $messages = createStore<{ hello: string }[]>([]).on(
  channel.done,
  (s, { result }) => [...s, result]
)

export function Entrypoint() {
  const messages = useUnit($messages)

  return (
    <>
      {messages.map((msg, idx) => (
        <h2 key={idx}>
          {msg.hello} {idx}
        </h2>
      ))}
    </>
  )
}

const rootElement = document.querySelector('#app')

if (!rootElement) {
  throw new Error('root element was not found in the document')
}

const root = createRoot(rootElement)

root.render((<Entrypoint />) as ReactNode)
