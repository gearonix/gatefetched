import './globals.css'
import { clsx } from 'clsx'
import { Parent } from './parent'
import { useIsMounted } from './shared/hooks'
import { Icon } from './shared/ui/icon'

export function Entrypoint() {
  const isMounted = useIsMounted()

  return (
    <>
      <div className={clsx('container', { loaded: isMounted() })}>
        <h1 className="title">Effector + Socket.io example</h1>
        <Parent />
      </div>

      <a href="https://github.com/gearonix/farsocket" target="_blank">
        <Icon
          name="sprite/github-mark"
          style={{ color: '#fff' }}
          className="github-icon"
        />
      </a>
    </>
  )
}
