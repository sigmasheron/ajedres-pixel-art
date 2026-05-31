const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// ─── STATE ───
const rooms = new Map(); // roomCode -> room
const clients = new Map(); // ws -> { roomCode, playerId, playerName }

function genCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function genId() {
  return crypto.randomUUID().slice(0, 8);
}

function broadcast(roomCode, msg, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(msg);
  room.players.forEach(p => {
    if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  });
}

function broadcastAll(roomCode, msg) {
  broadcast(roomCode, msg, null);
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function roomState(room) {
  return {
    type: 'room_state',
    room: {
      code: room.code,
      hostId: room.hostId,
      gameMode: room.gameMode,
      gameState: room.gameState,
      currentPlayerIdx: room.currentPlayerIdx,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.ws.readyState === WebSocket.OPEN
      })),
      gameData: room.gameData
    }
  };
}

// ─── GAME LOGIC ───
const PIECES = [
  {sym:'♔',name:'REY',val:0},{sym:'♕',name:'REINA',val:9},
  {sym:'♖',name:'TORRE',val:5},{sym:'♗',name:'ALFIL',val:3},
  {sym:'♘',name:'CABALLO',val:3},{sym:'♙',name:'PEÓN',val:1},
  {sym:'♚',name:'REY',val:0},{sym:'♛',name:'REINA',val:9},
  {sym:'♜',name:'TORRE',val:5},{sym:'♝',name:'ALFIL',val:3},
  {sym:'♞',name:'CABALLO',val:3},{sym:'♟',name:'PEÓN',val:1},
];

function initMinesweeper() {
  const rows=8, cols=8, bombs=10, total=rows*cols;
  const bombSet = new Set();
  while (bombSet.size < bombs) bombSet.add(Math.floor(Math.random() * total));
  const board = [];
  const pieceMap = [];
  for (let i = 0; i < total; i++) {
    const isBomb = bombSet.has(i);
    board.push({ isBomb, revealed: false, flagged: false, adj: 0 });
    pieceMap.push(isBomb ? null : PIECES[Math.floor(Math.random() * PIECES.length)]);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r*cols+c;
      if (board[idx].isBomb) continue;
      let cnt = 0;
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&board[nr*cols+nc].isBomb) cnt++;
      }
      board[idx].adj = cnt;
    }
  }
  return { rows, cols, bombs, board, pieceMap, mineRevealed: 0 };
}

function floodReveal(data, r, c) {
  const { rows, cols, board, pieceMap } = data;
  for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
    const nr=r+dr, nc=c+dc;
    if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
    const ni = nr*cols+nc;
    if (board[ni].revealed||board[ni].flagged||board[ni].isBomb) continue;
    board[ni].revealed = true;
    if (board[ni].adj===0 && !pieceMap[ni]) floodReveal(data, nr, nc);
  }
}

function initPuzzle() {
  const solution = [
    {sym:'♔',pos:4,val:0},{sym:'♛',pos:27,val:9},{sym:'♜',pos:0,val:5},
    {sym:'♜',pos:7,val:5},{sym:'♝',pos:18,val:3},{sym:'♞',pos:42,val:3},
    {sym:'♙',pos:8,val:1},{sym:'♙',pos:9,val:1},{sym:'♟',pos:55,val:1},{sym:'♚',pos:60,val:0}
  ].map((p,i)=>({...p,id:i,placed:false}));
  const placed = Array(64).fill(null);
  return { solution, placed, total: solution.length };
}

function initGuess() {
  return { round: 0, totalRounds: 10, streak: 0, currentQuestion: null, answered: false };
}

function makeGuessQuestion() {
  const pool = PIECES.filter(p=>p.name!=='REY').sort(()=>Math.random()-0.5).slice(0,3);
  const correctIdx = pool.reduce((best,p,i)=>p.val>pool[best].val?i:best,0);
  return { pieces: pool, correctIdx };
}

// ─── WS HANDLER ───
wss.on('connection', ws => {
  clients.set(ws, null);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const info = clients.get(ws);

    switch (msg.type) {

      case 'create_room': {
        const code = genCode();
        const playerId = genId();
        const room = {
          code,
          hostId: playerId,
          gameMode: null,
          gameState: 'lobby',
          currentPlayerIdx: 0,
          players: [{ id: playerId, name: msg.name || 'HOST', score: 0, ws }],
          gameData: null
        };
        rooms.set(code, room);
        clients.set(ws, { roomCode: code, playerId });
        send(ws, { type: 'joined', playerId, roomCode: code, isHost: true });
        send(ws, roomState(room));
        break;
      }

      case 'join_room': {
        const room = rooms.get(msg.code?.toUpperCase());
        if (!room) { send(ws, { type: 'error', msg: 'Sala no encontrada' }); return; }
        if (room.players.length >= 4) { send(ws, { type: 'error', msg: 'Sala llena (máx 4)' }); return; }
        if (room.gameState !== 'lobby') { send(ws, { type: 'error', msg: 'Partida en curso' }); return; }
        const playerId = genId();
        room.players.push({ id: playerId, name: msg.name || `PLAYER${room.players.length+1}`, score: 0, ws });
        clients.set(ws, { roomCode: room.code, playerId });
        send(ws, { type: 'joined', playerId, roomCode: room.code, isHost: false });
        broadcastAll(room.code, roomState(room));
        broadcast(room.code, { type: 'chat', system: true, msg: `${msg.name} se unió a la sala!` }, ws);
        break;
      }

      case 'set_game': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.hostId !== info.playerId) return;
        room.gameMode = msg.mode;
        broadcastAll(room.code, roomState(room));
        break;
      }

      case 'start_game': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.hostId !== info.playerId) return;
        if (room.players.length < 2) { send(ws, { type: 'error', msg: 'Necesitas al menos 2 jugadores' }); return; }
        if (!room.gameMode) { send(ws, { type: 'error', msg: 'Selecciona un modo de juego' }); return; }
        room.players.forEach(p => p.score = 0);
        room.currentPlayerIdx = 0;
        room.gameState = 'playing';
        if (room.gameMode === 'minesweeper') room.gameData = initMinesweeper();
        else if (room.gameMode === 'puzzle') room.gameData = initPuzzle();
        else if (room.gameMode === 'guess') {
          room.gameData = initGuess();
          room.gameData.currentQuestion = makeGuessQuestion();
        }
        broadcastAll(room.code, roomState(room));
        broadcastAll(room.code, { type: 'game_started', mode: room.gameMode });
        break;
      }

      // ─── MINESWEEPER ACTIONS ───
      case 'mine_click': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.gameState !== 'playing') return;
        const curPlayer = room.players[room.currentPlayerIdx];
        if (curPlayer.id !== info.playerId) { send(ws, { type: 'error', msg: 'No es tu turno' }); return; }
        const d = room.gameData;
        const idx = msg.idx;
        const cell = d.board[idx];
        if (cell.revealed || cell.flagged) return;
        cell.revealed = true;
        if (cell.isBomb) {
          d.board.forEach(c => { if (c.isBomb) c.revealed = true; });
          broadcastAll(room.code, { type: 'mine_bomb', playerName: curPlayer.name, idx });
          broadcastAll(room.code, roomState(room));
          setTimeout(() => {
            d.board.forEach(c => { if (c.isBomb) c.revealed = false; });
            room.currentPlayerIdx = (room.currentPlayerIdx + 1) % room.players.length;
            broadcastAll(room.code, roomState(room));
          }, 2000);
        } else {
          const piece = d.pieceMap[idx];
          if (cell.adj === 0 && !piece) floodReveal(d, Math.floor(idx/d.cols), idx%d.cols);
          if (piece) {
            const pts = piece.val === 0 ? 1 : piece.val;
            curPlayer.score += pts;
            broadcastAll(room.code, { type: 'mine_piece', playerName: curPlayer.name, piece, pts, idx });
          }
          const allDone = d.board.every(c => c.isBomb || c.revealed);
          broadcastAll(room.code, roomState(room));
          if (allDone) {
            room.gameState = 'finished';
            broadcastAll(room.code, { type: 'game_over', scores: room.players.map(p=>({name:p.name,score:p.score})) });
          } else if (piece) {
            room.currentPlayerIdx = (room.currentPlayerIdx + 1) % room.players.length;
            broadcastAll(room.code, roomState(room));
          }
        }
        break;
      }

      case 'mine_flag': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room) return;
        const cell = room.gameData.board[msg.idx];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        broadcastAll(room.code, roomState(room));
        break;
      }

      // ─── PUZZLE ACTIONS ───
      case 'puzzle_place': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.gameState !== 'playing') return;
        const curPlayer = room.players[room.currentPlayerIdx];
        if (curPlayer.id !== info.playerId) { send(ws, { type: 'error', msg: 'No es tu turno' }); return; }
        const d = room.gameData;
        const piece = d.solution.find(p => p.id === msg.pieceId && !p.placed);
        if (!piece) return;
        const isCorrect = msg.boardIdx === piece.pos;
        if (isCorrect) {
          piece.placed = true;
          d.placed[msg.boardIdx] = { sym: piece.sym };
          const pts = piece.val === 0 ? 1 : piece.val;
          curPlayer.score += pts;
          broadcastAll(room.code, { type: 'puzzle_correct', playerName: curPlayer.name, piece, pts });
          const allPlaced = d.solution.every(p => p.placed);
          broadcastAll(room.code, roomState(room));
          if (allPlaced) {
            room.gameState = 'finished';
            broadcastAll(room.code, { type: 'game_over', scores: room.players.map(p=>({name:p.name,score:p.score})) });
          } else {
            room.currentPlayerIdx = (room.currentPlayerIdx + 1) % room.players.length;
            broadcastAll(room.code, roomState(room));
          }
        } else {
          broadcastAll(room.code, { type: 'puzzle_wrong', playerName: curPlayer.name });
          room.currentPlayerIdx = (room.currentPlayerIdx + 1) % room.players.length;
          broadcastAll(room.code, roomState(room));
        }
        break;
      }

      // ─── GUESS ACTIONS ───
      case 'guess_answer': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.gameState !== 'playing') return;
        const d = room.gameData;
        if (d.answered) return;
        d.answered = true;
        const player = room.players.find(p => p.id === info.playerId);
        if (!player) return;
        const { pieces, correctIdx } = d.currentQuestion;
        const isCorrect = msg.idx === correctIdx;
        if (isCorrect) {
          d.streak++;
          const bonus = d.streak >= 3 ? 2 : 0;
          const pts = 3 + bonus;
          player.score += pts;
          broadcastAll(room.code, { type: 'guess_result', correct: true, playerName: player.name, pts, streak: d.streak, correctIdx, pieces });
        } else {
          d.streak = 0;
          broadcastAll(room.code, { type: 'guess_result', correct: false, playerName: player.name, pts: 0, streak: 0, correctIdx, pieces });
        }
        broadcastAll(room.code, roomState(room));
        d.round++;
        setTimeout(() => {
          if (d.round >= d.totalRounds) {
            room.gameState = 'finished';
            broadcastAll(room.code, { type: 'game_over', scores: room.players.map(p=>({name:p.name,score:p.score})) });
          } else {
            d.answered = false;
            d.currentQuestion = makeGuessQuestion();
            broadcastAll(room.code, roomState(room));
          }
        }, 3000);
        break;
      }

      case 'guess_timeout': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.gameState !== 'playing') return;
        const d = room.gameData;
        if (d.answered) return;
        d.answered = true;
        d.streak = 0;
        const { correctIdx, pieces } = d.currentQuestion;
        broadcastAll(room.code, { type: 'guess_timeout', correctIdx, pieces });
        d.round++;
        setTimeout(() => {
          if (d.round >= d.totalRounds) {
            room.gameState = 'finished';
            broadcastAll(room.code, { type: 'game_over', scores: room.players.map(p=>({name:p.name,score:p.score})) });
          } else {
            d.answered = false;
            d.currentQuestion = makeGuessQuestion();
            broadcastAll(room.code, roomState(room));
          }
        }, 3000);
        break;
      }

      case 'new_round': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.hostId !== info.playerId) return;
        room.players.forEach(p => p.score = 0);
        room.currentPlayerIdx = 0;
        room.gameState = 'lobby';
        room.gameData = null;
        broadcastAll(room.code, roomState(room));
        break;
      }

      case 'chat': {
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room) return;
        const player = room.players.find(p => p.id === info.playerId);
        broadcastAll(room.code, { type: 'chat', playerName: player?.name, msg: msg.msg });
        break;
      }
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info) {
      const room = rooms.get(info.roomCode);
      if (room) {
        const p = room.players.find(p => p.id === info.playerId);
        broadcast(room.code, { type: 'chat', system: true, msg: `${p?.name} se desconectó` }, ws);
        // If host left, assign new host
        if (room.hostId === info.playerId && room.players.length > 1) {
          const next = room.players.find(p => p.id !== info.playerId);
          if (next) room.hostId = next.id;
        }
        room.players = room.players.filter(p => p.id !== info.playerId);
        if (room.players.length === 0) rooms.delete(info.roomCode);
        else broadcastAll(room.code, roomState(room));
      }
    }
    clients.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Chess Arcade Server running on http://localhost:${PORT}`));
