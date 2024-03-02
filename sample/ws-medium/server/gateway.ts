import { Logger } from '@nestjs/common'
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  private readonly logger = new Logger(EventsGateway.name)

  @WebSocketServer()
  server: Server

  @SubscribeMessage('send-request')
  public async findAll(@MessageBody() data: unknown): Promise<unknown> {
    this.logger.log('received', { data })

    return { event: 'receive-response', data: { hello: 'world-ws-dom' } }
  }
}
