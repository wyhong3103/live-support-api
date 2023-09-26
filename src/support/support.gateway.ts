import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SupportService } from './support.service';

@WebSocketGateway({ cors: true })
export class SupportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private supportService: SupportService) {}

  handleConnection(client: any) {
    console.log(client.id);
  }

  async handleDisconnect(client: any) {
    await this.supportService.disconnect(client.id);
    this.emitQueue();
  }

  async emitQueue() {
    const queue = this.supportService.getQueue();
    this.server.to('mid').emit('receive_queue', { queue });
  }

  // auth guard
  @SubscribeMessage('support_agent_on')
  handleSupportAgentOn(client: any, payload: any): void {
    this.supportService.supportAgentOn(client.id, payload.id);
  }

  // auth guard
  @SubscribeMessage('mid_agent_on')
  async handleMidAgentOn(client: any) {
    client.join('mid');
    this.emitQueue();
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
    );
    this.server.emit('receive_assigned', assignPayload);
    this.emitQueue();
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(client: any, roomId: string) {
    console.log('joined');
    client.join(roomId);
  }

  @SubscribeMessage('message')
  async handleMessage(client: any, payload: any) {
    client.to(payload.roomId).emit('receive_message', {
      roomId: payload.roomId,
      message: payload.message,
    });
  }
}
