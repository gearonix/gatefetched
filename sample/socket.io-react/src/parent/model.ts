import { zodContract } from '@farfetched/zod'
import { createGateway, declareParams } from '@lib'
import { createLogger } from '@neodx/log'
import { createEvent, createStore } from 'effector'
import { createGate } from 'effector-react'
import { io } from 'socket.io-client'
import { z } from 'zod'
import type { Message } from '../shared/types'
import { protocolEvents } from './events'

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
    mapData: ({ payload }) => {
      return payload
    }
  }
})

export const ParentGate = createGate()

gateway.bindGate(ParentGate)

const messageSentContract = z.object({
  id: z.string(),
  message: z.string().min(2)
})

export const messageSent = gateway.listener({
  name: 'MESSAGE_RECEIVED',
  response: {
    contract: zodContract(messageSentContract),
    validate: ({ result }) => result.message.length > 0
  }
})

export const sendMessage = gateway.dispatcher({
  name: 'SEND_MESSAGE',
  params: declareParams<string>(),
  adapter: {
    withAck: true
  },
  request: {
    mapBody: (message) => ({ message })
  }
})

export const toggleChild = createEvent()

export const $childOpen = createStore<boolean>(false).on(toggleChild, (s) => !s)

export const $messages = createStore<Message[]>([]).on(
  messageSent.finished.done,
  (s, { result }) => [...s, result]
)
