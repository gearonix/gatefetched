import http from 'http'
import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'
import { v4 } from 'uuid'
import type { Message, Post } from './shared/types'

const corsConfig = {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  origin: 'http://localhost:3000'
}

const app = express()
const server = new http.Server(app)

const io = new Server(server, {
  cors: corsConfig
})

app.use(cors(corsConfig))

io.on('connection', (socket) => {
  socket.on(
    'namespace.send-message',
    async ({ message }: Pick<Message, 'message'>) => {
      const payload = {
        id: v4(),
        message
      }

      socket.emit('namespace.message-sent', {
        payload,
        timestamp: new Date().getTime()
      })
    }
  )

  socket.on('namespace.get-posts', async () => {
    const posts = [
      {
        userId: 1,
        id: 2,
        body: 'Post body',
        title: 'Post'
      },
      {
        userId: 2,
        id: 2,
        body: 'Post body',
        title: 'Post 2'
      }
    ] satisfies Post[]

    socket.emit('namespace.posts-received', {
      payload: posts.slice(0, 10),
      timestamp: new Date().getTime()
    })
  })
})

server.listen(6868)
