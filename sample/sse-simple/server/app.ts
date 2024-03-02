import { Module, ShutdownSignal } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppController } from './controller'

@Module({
  imports: [],
  controllers: [AppController],
  providers: []
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true
  })

  app.enableCors({ origin: 'http://localhost:3000' })

  app.enableShutdownHooks()

  await app.listen(6868)
}

void bootstrap()

process.once(ShutdownSignal.SIGUSR2, () => process.exit(0))
process.once(ShutdownSignal.SIGINT, () => process.exit(0))
