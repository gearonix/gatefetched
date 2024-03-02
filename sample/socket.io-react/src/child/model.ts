import { zodContract } from '@farfetched/zod'
import { sample } from 'effector'
import { createGate } from 'effector-react'
import { gateway } from '../parent/model'
import { postsReceivedContract as contract } from './contract'

export const ChildGate = createGate()

gateway.bindGate(ChildGate)

export const postsReceived = gateway.listener({
  name: 'POSTS_RECEIVED',
  initialData: [],
  adapter: { dirty: true },
  response: {
    contract: zodContract(contract)
  }
})

export const receivePosts = gateway.dispatcher('RECEIVE_POSTS')

sample({
  clock: ChildGate.open,
  target: receivePosts.dispatch
})
