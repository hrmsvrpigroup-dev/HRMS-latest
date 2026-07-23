import { Server as SocketServer } from 'socket.io'

let io: SocketServer | null = null

export const setSocketServer = (server: SocketServer) => {
  io = server
}

export const getSocketServer = (): SocketServer => {
  if (!io) throw new Error('Socket.IO server not initialized')
  return io
}
