const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: [/localhost/, /github\.dev/, /feira-de-jogos\.dev\.br/],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

  socket.on("select-player", (room, player) => {
    console.log(`Selected player ${player} in room ${room}`);
    socket.to(room).emit("player-selected", player);
  });

  socket.on("start-game", (room, player) => {
    console.log(`Game started in room ${room} by player ${player}`);
    socket.to(room).emit("start-game", player);
  });

  socket.on("change-scene", (room, scene) => {
    console.log(`Changing scene to ${scene} in room ${room}`);
    socket.to(room).emit("change-scene", scene);
  });

  socket.on("scene0", (room, state) => {
    socket.to(room).emit("scene0", state);
  });

  socket.on("submit-score", (data) => {
    if (!data || typeof data !== "object") return;
    const name = String(data.name || "Anônimo").slice(0, 16);
    const points = Number(data.points) || 0;
    const time = Number(data.time) || 0;
    const now = Date.now();

    if (!io.leaderboard) {
      io.leaderboard = [];
      io.leaderboardResetAt = now + 13 * 60 * 60 * 1000;
    }

    if (now >= io.leaderboardResetAt) {
      io.leaderboard = [];
      io.leaderboardResetAt = now + 13 * 60 * 60 * 1000;
    }

    io.leaderboard.push({ name, points, time, createdAt: now });
    io.leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.time - b.time;
    });
    if (io.leaderboard.length > 1000) {
      io.leaderboard = io.leaderboard.slice(0, 1000);
    }
    io.emit(
      "leaderboard-data",
      io.leaderboard.slice(0, 10).map((entry) => ({
        name: entry.name,
        points: entry.points,
        time: entry.time,
      })),
    );
  });

  socket.on("request-leaderboard", () => {
    const now = Date.now();
    if (!io.leaderboard) {
      io.leaderboard = [];
      io.leaderboardResetAt = now + 13 * 60 * 60 * 1000;
    }
    if (now >= io.leaderboardResetAt) {
      io.leaderboard = [];
      io.leaderboardResetAt = now + 13 * 60 * 60 * 1000;
    }
    socket.emit(
      "leaderboard-data",
      io.leaderboard.slice(0, 10).map((entry) => ({
        name: entry.name,
        points: entry.points,
        time: entry.time,
      })),
    );
  });

  socket.on("player-action", (room, action) => {
    socket.to(room).emit("player-action", action);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(3000);
