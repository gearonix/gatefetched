import { zodContract } from '@farfetched/zod'
import { sample } from 'effector'
import { createGate } from 'effector-react'
import { z } from 'zod'
import { gateway } from '../parent/model'

export const ChildGate = createGate()

gateway.bindGate(ChildGate)

const postsReceivedContract = z.array(
  z.object({
    body: z.string(),
    id: z.number(),
    title: z.string(),
    userId: z.number()
  })
)

export const postsReceived = gateway.listener({
  name: 'POSTS_RECEIVED',
  initialData: [],
  adapter: { dirty: true },
  response: {
    contract: zodContract(postsReceivedContract)
  }
})

export const receivePosts = gateway.dispatcher('RECEIVE_POSTS')

sample({
  clock: ChildGate.open,
  target: receivePosts.dispatch
})
