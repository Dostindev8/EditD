import { Injectable } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import type { GenerationSocketEvent } from "../generation/generation.types.js";

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
@Injectable()
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  private room(workspaceId: string, projectId: string) {
    return `ws:${workspaceId}:proj:${projectId}`;
  }

  @SubscribeMessage("join:project")
  handleJoin(
    @MessageBody() data: { workspaceId?: string; projectId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.workspaceId || !data.projectId) return { ok: false };
    const room = this.room(data.workspaceId, data.projectId);
    void client.join(room);
    return { ok: true, room };
  }

  emitGenerationEvent(
    workspaceId: string,
    projectId: string,
    event: GenerationSocketEvent,
    payload: Record<string, unknown>,
  ) {
    if (!this.server) return;
    this.server.to(this.room(workspaceId, projectId)).emit(event, payload);
  }
}
