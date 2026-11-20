import { Server } from "socket.io";

let io;

export const initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client Connected: ${socket.id}`);

    socket.on("join_room", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    socket.on("leave_room", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.leave(room);
        console.log(`Socket ${socket.id} left room: ${room}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io must be initialized before calling getIO()");
  }
  return io;
};

// Room-scoped real-time emitters
export const emitQueueUpdated = ({ domainId, serviceId }) => {
  if (!io || !domainId) return;
  io.to(`domain:${domainId}`).emit("queue:updated", { domainId, serviceId });
};

export const emitTokenUpdated = ({ tokenId, domainId, status }) => {
  if (!io) return;
  if (tokenId) {
    io.to(`token:${tokenId}`).emit("token:updated", { tokenId, status });
  }
  if (domainId) {
    io.to(`domain:${domainId}`).emit("token:updated", { tokenId, status });
  }
};

export const emitTokenShifted = (queueEvent) => {
  if (!io || !queueEvent?.tokenId) return;
  io.to(`token:${queueEvent.tokenId}`).emit("token:shifted", queueEvent);
};