import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" }
  });
  io.on("connection", (socket) => {
    console.log("[Socket] Client connected", socket.id);
  });
  return io;
}

export function emitEvent(event: string, payload: any) {
  if (io) io.emit(event, payload);
}
