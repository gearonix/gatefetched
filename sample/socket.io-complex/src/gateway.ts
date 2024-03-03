import { createLogger } from '@neodx/log'
import { createGateway } from 'gatefetched'
import { io } from 'socket.io-client'
import { protocolEvents } from './parent/events.ts'

const logger = createLogger()

const socketInstance = io('http://localhost:6868')

export const gateway = createGateway({
  from: socketInstance,
  intercept: ({ status, ...response }) => {
    if (status === 'failed') {
      return logger.error(response)
    }
    if (status === 'skip') {
      return logger.warn(response)
    }

    logger.success({ status, ...response })
  },
  events: protocolEvents,
  response: {
    mapData: ({ payload }) => payload
  }
})

gateway.adapter.bindConnect(console.info)
