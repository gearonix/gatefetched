import { z } from 'zod'

export const postsReceivedContract = z.array(
  z.object({
    body: z.string(),
    id: z.number(),
    title: z.string(),
    userId: z.number()
  })
)
