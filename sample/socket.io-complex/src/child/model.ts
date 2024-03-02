import { zodContract } from '@farfetched/zod'
import { attachGate } from 'farsocket'
import { sample } from 'effector'
import { createGate } from 'effector-react'
import { gateway } from '../gateway'
import { postsReceivedContract as contract } from './contract'

export const ChildGate = createGate()

const child = attachGate(gateway, ChildGate)

export const postsReceived = child.listener({
  name: 'POSTS_RECEIVED',
  initialData: [],
  adapter: { dirty: true },
  response: {
    contract: zodContract(contract)
  }
})

export const receivePosts = child.dispatcher('RECEIVE_POSTS')

sample({
  clock: ChildGate.open,
  target: receivePosts.dispatch
})
