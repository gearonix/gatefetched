import type { MessageEvent } from '@nestjs/common'
import { Controller, Sse } from '@nestjs/common'
import { interval, Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Controller()
export class AppController {
  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((_) => ({ data: { hello: 'world' } }) as MessageEvent)
    )
  }
}
