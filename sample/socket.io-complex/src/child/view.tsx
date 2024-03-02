import { useGate, useUnit } from 'effector-react'
import { ChildGate, postsReceived } from './model'

export function Child() {
  useGate(ChildGate)

  const posts = useUnit(postsReceived.$data)

  return (
    <div className="message-list">
      {posts.map((post) => (
        <div key={post.id}>{post.title.slice(0, 20)}</div>
      ))}
    </div>
  )
}
