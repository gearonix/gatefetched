import { declareParams } from '@farfetched/core'
import { zodContract } from '@farfetched/zod'
import { createEvent, createStore } from 'effector'
import { createGate } from 'effector-react'
import { attachGate } from 'farsocket'
import { z } from 'zod'
import { gateway } from '../gateway'
import type { Message } from '../shared/types'

export const ParentGate = createGate()

const parent = attachGate(gateway, ParentGate)

const messageSentContract = z.object({
  id: z.string(),
  message: z.string().min(2)
})

export const messageSent = parent.listener({
  name: 'MESSAGE_RECEIVED',
  response: {
    contract: zodContract(messageSentContract),
    validate: ({ result }) => result.message.length > 0
  }
})

export const sendMessage = parent.dispatcher({
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
