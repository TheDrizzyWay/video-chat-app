import path from 'path';
import express, { Application } from 'express';
import socketIO, { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';

export class Server {
  private httpServer: HttpServer;
  private app: Application;
  private io: SocketIOServer;

  private activeSockets: string[] = [];
  private readonly PORT = 8000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.handleRoutes();
    this.handleSocketConnection();
  }
  
  private handleRoutes(): void {
    this.app.get("/", (req, res) => {
      res.send(`<h1>Hello World</h1>`); 
    });
  }
  
  private handleSocketConnection(): void {
    this.io.on("connection", socket => {
      const existingSocket = this.activeSockets.find(
        existingSocket => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
          )
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id]
        });
      }

      socket.on("call-user", (data: any) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id
        });
      });

      socket.on("make-answer", data => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer
        });
      });

      socket.on("reject-call", data => {
        socket.to(data.from).emit("call-rejected", {
          socket: socket.id
        });
      });

      socket.on("disconnect", () => {
        this.activeSockets = this.activeSockets.filter(
          existingSocket => existingSocket !== socket.id
        );
        socket.broadcast.emit("remove-user", {
          socketId: socket.id
        });
      });
    });
  }

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }
  
  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.PORT, () =>
      callback(this.PORT)
    );
  }
}