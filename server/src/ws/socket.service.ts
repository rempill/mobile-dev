import { WebSocket, WebSocketServer } from "ws";
import {Server as HttpServer} from 'http';
import type { WsEventType, WsMessage } from "../types/item.types.js";

class SocketService{
    private wss: WebSocketServer | null = null;

    init(server:HttpServer): void{
        this.wss=new WebSocketServer({server});

        this.wss.on('connection', (ws:WebSocket)=>{
            console.log('[WebSocket] Client connected for real-time sync');

            ws.on('close',()=>{
                console.log('[WebSocket] Client disconnected');
            });

            ws.on('error',(err)=>{
                console.error('[WebSocket] Client error:', err);
            });
        });
    }

    broadcast<T>(event: WsEventType, payload:T): void{
        if(!this.wss) return;

        const message: WsMessage<T>={
            event,
            payload,
            timestamp: new Date().toISOString()
        };

        const serialized=JSON.stringify(message);

        this.wss.clients.forEach((client) =>{
            if (client.readyState === WebSocket.OPEN){
                client.send(serialized);
            }
        });

        console.log(`[WebSocket] Broadcast event: ${event}`);
    }
}

export const socketService=new SocketService();