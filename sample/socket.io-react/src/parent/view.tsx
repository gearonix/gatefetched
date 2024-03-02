import { useGate, useUnit } from 'effector-react'
import { Child } from '../child'
import type { Message } from '../shared/types'
import {
  $childOpen,
  $messages,
  ParentGate,
  sendMessage,
  toggleChild
} from './model'

export function Parent() {
  useGate(ParentGate)

  const [messages, isChildOpen] = useUnit([$messages, $childOpen])
  const [send, toggle] = useUnit([sendMessage.dispatch, toggleChild])

  const onClick = () => {
    send('Hello world!')
  }

  return (
    <div className="parent-container">
      <div className="parent-section">
        <h3>Parent scope</h3>
        <button onClick={onClick} className="dark-button">
          Send Message
        </button>

        <div className="message-list">
          {messages.map((msg: Message) => (
            <div key={msg.id}>ID: {msg.id}</div>
          ))}
        </div>
      </div>

      <div className="parent-section">
        <h3>Child scope</h3>

        <button onClick={toggle} className="dark-button">
          {!isChildOpen ? 'Show' : 'Hide'} Posts
        </button>

        {isChildOpen && <Child />}
      </div>
    </div>
  )
}
