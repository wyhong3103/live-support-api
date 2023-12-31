import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SupportService } from './support.service';

@WebSocketGateway({ cors: true })
export class SupportGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private supportService: SupportService) {}

  async handleDisconnect(client: any) {
    await this.supportService.disconnect(client.id);
    this.emitQueue();
    this.emitSupportAgentCount();
  }

  async emitQueue() {
    const queue = this.supportService.getQueue();
    this.server.to('mid').emit('receive_queue', { queue });
  }

  async emitSupportAgentCount() {
    const count = await this.supportService.countActiveSupportAgents();
    this.server.to('mid').emit('receive_agent_count', count);
  }

  @SubscribeMessage('support_agent_on')
  async handleSupportAgentOn(client: any, payload: any) {
    await this.supportService.supportAgentOn(client.id, payload.id);
    this.emitSupportAgentCount();
  }

  @SubscribeMessage('mid_agent_on')
  async handleMidAgentOn(client: any) {
    client.join('mid');
    this.emitQueue();
    this.emitSupportAgentCount();
  }

  @SubscribeMessage('enqueue')
  async handleEnqueue(client: any, payload: any) {
    const input = {
      id: client.id,
      name: payload.name,
      email: payload.email,
    };
    this.supportService.insertQueue(input);
    this.emitQueue();
  }

  @SubscribeMessage('assign')
  async handleAssign(client: any, payload: any) {
    const assignPayload = await this.supportService.assign(
      payload.clientId,
      payload.to,
      payload.botUrl,
      payload.botAuthToken,
    );
    this.server.emit('receive_assigned', assignPayload);
    this.emitQueue();
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(client: any, roomId: string) {
    if (await this.supportService.isSessionAlive(roomId)) {
      client.join(roomId);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(client: any, payload: any) {
    if (await this.supportService.isSessionAlive(payload.roomId)) {
      await this.supportService.insertMessage(payload);
      this.server.to(payload.roomId).emit('receive_message', {
        roomId: payload.roomId,
        author: payload.author,
        message: payload.text,
      });

      // reply bot message
      if (await this.supportService.isBotSession(payload.roomId)) {
        const message = await this.supportService.getBotResponse(
          payload.text,
          payload.roomId,
        );
        this.server.to(payload.roomId).emit('receive_message', message);
      }
    } else if (await this.supportService.isSessionTimedOut(payload.roomId)) {
      this.server.to(payload.roomId).emit('timed_out');
    }
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(client: any, payload: any) {
    if (
      (await this.supportService.isSessionAlive(payload.roomId)) &&
      (await this.supportService.isRoomAgent(client.id, payload.roomID))
    ) {
      this.supportService.endChat(payload.roomId);
      this.server.to(payload.roomId).emit('end_chat');
    }
  }

  @SubscribeMessage('switch_chat')
  async handleSwitchChat(client: any, payload: any) {
    if (
      (await this.supportService.isSessionAlive(payload.roomId)) &&
      (await this.supportService.isRoomAgent(client.id, payload.roomID))
    ) {
      this.supportService.endChat(payload.roomId);
      this.server.to(payload.roomId).emit('switch_chat');
    }
  }
}
