import { Module, ShutdownSignal } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { WsAdapter } from '@nestjs/platform-ws'
import { EventsGateway } from './gateway'

@Module({
  imports: [],
  controllers: [],
  providers: [EventsGateway]
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true
  })

  app.enableShutdownHooks()

  app.useWebSocketAdapter(new WsAdapter(app))

  await app.listen(6868)
}

void bootstrap()

process.once(ShutdownSignal.SIGUSR2, () => process.exit(0))
process.once(ShutdownSignal.SIGINT, () => process.exit(0))
