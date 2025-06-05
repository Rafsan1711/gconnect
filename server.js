const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const games = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('join-game', (gameId) => {
    if (!games[gameId]) {
      games[gameId] = [socket];
      socket.emit('waiting');
    } else if (games[gameId].length === 1) {
      games[gameId].push(socket);
      games[gameId].forEach((s) => s.emit('start-game'));
    } else {
      socket.emit('full');
    }

    socket.on('move', (data) => {
      const opponent = games[gameId]?.find((s) => s !== socket);
      if (opponent) opponent.emit('opponent-move', data);
    });

    socket.on('disconnect', () => {
      if (games[gameId]) {
        games[gameId] = games[gameId].filter(s => s !== socket);
        if (games[gameId].length === 0) delete games[gameId];
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
