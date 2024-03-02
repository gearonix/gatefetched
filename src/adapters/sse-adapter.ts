import { unsupportedAdapterMethodError } from '@/errors/create-error'
import { safeParseJson } from '@/shared/lib'
import type { AnyFn } from '@/shared/types'
import type {
  AdapterSubscribeOptions,
  AdapterSubscribeResult
} from './abstract-adapter'
import { AbstractWsAdapter } from './abstract-adapter'
import { AdapterMeta } from './matchers'

// TODO: rename ws
export class SseAdapter extends AbstractWsAdapter<
  EventSource,
  EventSourceInit
> {
  private readonly attendedHandlers: Set<(evt: MessageEvent) => void> =
    new Set()

  public bindConnect<Fn extends AnyFn>(cb: Fn) {
    this.client.addEventListener('open', cb)
  }

  public createConnection(url: string, options: EventSourceInit) {
    return new EventSource(url, options)
  }

  public subscribe(
    _: string,
    trigger: (result: AdapterSubscribeResult<unknown>) => void,
    options?: AdapterSubscribeOptions
  ): void {
    const handleIncomingMessage = (evt: MessageEvent) => {
      if (options?.once) {
        this.attendedHandlers.delete(handleIncomingMessage)
        this.client.removeEventListener('message', handleIncomingMessage)
      }

      if (!evt.isTrusted || evt.defaultPrevented) return

      const result = safeParseJson(evt.data)

      trigger({ result })
    }

    this.client.addEventListener('message', handleIncomingMessage)
    this.attendedHandlers.add(handleIncomingMessage)
  }

  public unsubscribe() {
    for (const handler of this.attendedHandlers) {
      this.client.removeEventListener('message', handler)
    }
  }

  public bindDisconnect() {
    throw unsupportedAdapterMethodError('bindDisconnect')
  }

  public async publish() {
    throw unsupportedAdapterMethodError('publish')
  }

  public get kind() {
    return AdapterMeta.SSE
  }
}
