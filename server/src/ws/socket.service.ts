import { WebSocket, WebSocketServer } from "ws";
import {Server as HttpServer, IncomingMessage} from 'http';
import type { AuthenticatedUser, WsEventType, WsMessage } from "../types/item.types.js";
import url from 'url';
import jwt from 'jsonwebtoken';

const JWT_SECRET=process.env.JWT_SECRET || 'pitstop_jwt_secret_dev_key_2026'

interface AuthenticatedSocket extends WebSocket{
    userId?:string;
    isAlive?:boolean;
}

class SocketService{
    private wss: WebSocketServer | null = null;

    init(server:HttpServer): void{
        this.wss=new WebSocketServer({noServer: true});

        // intercept upgrade req to authenticate handshake before opening socket
        server.on('upgrade',(request: IncomingMessage, socket, head)=>{
            const parsedUrl=url.parse(request.url || '',true);

            // verify path
            if(parsedUrl.pathname!=='/ws'){
                socket.write('HTTP/1.1 404 Not Found \r\n\r\n');
                socket.destroy();
                return;
            }

            const token=parsedUrl.query.token as string | undefined;
            if(!token){
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            jwt.verify(token,JWT_SECRET,(err,decoded)=>{
                if (err || !decoded){
                    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    socket.destroy();
                    return;
                }

                this.wss!.handleUpgrade(request,socket,head,(ws)=>{
                    const authWs=ws as AuthenticatedSocket;
                    authWs.userId=(decoded as AuthenticatedUser).id;
                    authWs.isAlive=true;
                    this.wss!.emit('connection',authWs,request);
                });
            });
        });
        
        this.wss.on('connection', (ws: AuthenticatedSocket) => {
            console.log(`[WebSocket] Client connected for user: ${ws.userId}`);

            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('close', () => {
                console.log(`[WebSocket] Client disconnected (user: ${ws.userId})`);
            });

            ws.on('error', (err) => {
                console.error(`[WebSocket] Error for user ${ws.userId}:`, err);
            });
        });

        // ping every 30s for alive check
        setInterval(()=>{
            if(!this.wss) return;
            this.wss.clients.forEach((client)=>{
                const ws=client as AuthenticatedSocket;
                if (ws.isAlive===false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        },30000);
    }

    // broadcast an event strictly to sockets belonging to targetUserId
    broadcast<T>(targetUserId: string, event: WsEventType, payload:T): void{
        if(!this.wss) return;

        const message: WsMessage<T>={
            event,
            payload,
            timestamp: new Date().toISOString()
        };

        const serialized=JSON.stringify(message);

        this.wss.clients.forEach((client) =>{
            const authClient=client as AuthenticatedSocket;
            if (authClient.readyState === WebSocket.OPEN && authClient.userId === targetUserId){
                authClient.send(serialized);
            }
        });

        console.log(`[WebSocket] Scoped broadcast [${event}] sent to user ${targetUserId}`);    
    }
}

export const socketService=new SocketService();