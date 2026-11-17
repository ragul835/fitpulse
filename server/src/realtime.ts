import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "./env";

let io: Server | null = null;

export function initRealtime(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl === "*" ? true : env.clientUrl, credentials: true },
  });
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      /* no-op */
    });
  });
  return io;
}

export function emitEvent(event: string, payload: unknown) {
  io?.emit(event, payload);
}
