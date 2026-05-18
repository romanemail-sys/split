import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { registerSocketHandlers } from './socket';
import { config } from './config';

const app = createApp();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

registerSocketHandlers(io);

server.listen(config.port, () => {
  console.log(`tracker-api listening on :${config.port}`);
});
