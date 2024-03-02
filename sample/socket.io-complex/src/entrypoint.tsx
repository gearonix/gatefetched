import './globals.css'
import { clsx } from 'clsx'
import { Parent } from './parent'
import { useIsMounted } from './shared/hooks'

export function Entrypoint() {
  const isMounted = useIsMounted()

  return (
    <>
      <div className={clsx('container', { loaded: isMounted() })}>
        <h1 className="title">Effector + Socket.io example</h1>
        <Parent />
      </div>
    </>
  )
}
