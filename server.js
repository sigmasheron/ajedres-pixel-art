
// ══════════════════════════════════════════════════════════════
// CHESS ENGINE - supports 2, 3 (Threeway) and 4 player chess
// ══════════════════════════════════════════════════════════════

const EMPTY = null;
const COLORS = ['white','black','red','blue']; // 4-player colors

// Standard piece values
const PIECE_VALS = {K:0,Q:9,R:5,B:3,N:3,P:1};

// ── 2-PLAYER CHESS (8x8 standard) ──
function initBoard2P() {
  const b = Array(8).fill(null).map(()=>Array(8).fill(null));
  const backRow = ['R','N','B','Q','K','B','N','R'];
  for (let c=0;c<8;c++) {
    b[0][c] = {type:backRow[c], color:'black'};
    b[1][c] = {type:'P', color:'black'};
    b[6][c] = {type:'P', color:'white'};
    b[7][c] = {type:backRow[c], color:'white'};
  }
  return b;
}

// ── 4-PLAYER CHESS (14x14 with corner cutoffs) ──
// Board is 14x14, corners 3x3 are removed
function init4PBoard() {
  const b = Array(14).fill(null).map(()=>Array(14).fill(null));
  // white: bottom rows 11-12, cols 3-10
  // black: top rows 1-2, cols 3-10
  // red: left cols 1-2, rows 3-10
  // blue: right cols 11-12, rows 3-10
  const backRow = ['R','N','B','Q','K','B','N','R'];

  for (let i=0;i<8;i++) {
    // White (bottom, left to right)
    b[13][i+3] = {type:backRow[i], color:'white'};
    b[12][i+3] = {type:'P', color:'white', dir:'up'};
    // Black (top, left to right)
    b[0][i+3]  = {type:backRow[7-i], color:'black'};
    b[1][i+3]  = {type:'P', color:'black', dir:'down'};
    // Red (left, top to bottom)
    b[i+3][0]  = {type:backRow[i], color:'red'};
    b[i+3][1]  = {type:'P', color:'red', dir:'right'};
    // Blue (right, top to bottom)
    b[i+3][13] = {type:backRow[7-i], color:'blue'};
    b[i+3][12] = {type:'P', color:'blue', dir:'left'};
  }
  return b;
}

// ── 3-PLAYER CHESS (hexagonal-ish on modified board) ──
// We use a 12x12 board with 3 armies arranged in triangle
function init3PBoard() {
  const b = Array(12).fill(null).map(()=>Array(12).fill(null));
  const backRow = ['R','N','B','Q','K','B','N','R'];
  // white: bottom
  for (let i=0;i<8;i++) {
    b[11][i+2] = {type:backRow[i], color:'white'};
    b[10][i+2] = {type:'P', color:'white', dir:'up'};
  }
  // black: top-left
  for (let i=0;i<8;i++) {
    b[i][0] = {type:backRow[i], color:'black'};
    b[i][1] = {type:'P', color:'black', dir:'right'};
  }
  // red: top-right  
  for (let i=0;i<8;i++) {
    b[i][11] = {type:backRow[7-i], color:'red'};
    b[i][10] = {type:'P', color:'red', dir:'left'};
  }
  return b;
}

function isValidCell(board, r, c) {
  const size = board.length;
  if (r<0||r>=size||c<0||c>=size) return false;
  // For 14x14 board, corners are invalid
  if (size===14) {
    if (r<3&&c<3) return false;
    if (r<3&&c>10) return false;
    if (r>10&&c<3) return false;
    if (r>10&&c>10) return false;
  }
  return true;
}

function getPawnDirs(piece, boardSize) {
  if (piece.dir) return piece.dir; // explicit direction
  // 2P standard: white goes up (dec row), black goes down (inc row)
  return piece.color==='white'?'up':'down';
}

function pawnStartRow(color, boardSize) {
  if (boardSize===8) return color==='white'?6:1;
  if (boardSize===14) {
    if (color==='white') return 12;
    if (color==='black') return 1;
    if (color==='red') return null; // col-based
    if (color==='blue') return null;
  }
  if (boardSize===12) {
    if (color==='white') return 10;
    return null;
  }
  return null;
}

function getMoves(board, r, c, lastMove, castlingRights) {
  const piece = board[r][c];
  if (!piece) return [];
  const size = board.length;
  const moves = [];

  function addMove(tr, tc, special) {
    if (!isValidCell(board,tr,tc)) return;
    const target = board[tr][tc];
    if (target && target.color === piece.color) return;
    moves.push({from:[r,c],to:[tr,tc],special});
  }

  function slide(drs, dcs) {
    for (let i=0;i<drs.length;i++) {
      let nr=r+drs[i], nc=c+dcs[i];
      while(isValidCell(board,nr,nc)) {
        const t=board[nr][nc];
        if (t) { if (t.color!==piece.color) moves.push({from:[r,c],to:[nr,nc]}); break; }
        moves.push({from:[r,c],to:[nr,nc]});
        nr+=drs[i]; nc+=dcs[i];
      }
    }
  }

  const {type,color} = piece;

  if (type==='R') slide([0,0,1,-1],[1,-1,0,0]);
  else if (type==='B') slide([1,1,-1,-1],[1,-1,1,-1]);
  else if (type==='Q') { slide([0,0,1,-1],[1,-1,0,0]); slide([1,1,-1,-1],[1,-1,1,-1]); }
  else if (type==='N') {
    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>addMove(r+dr,c+dc));
  }
  else if (type==='K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>addMove(r+dr,c+dc));
    // Castling (2P only, simplified)
    if (size===8 && castlingRights) {
      const row = color==='white'?7:0;
      if (r===row && c===4) {
        const rights = castlingRights[color];
        if (rights?.kingSide && !board[row][5] && !board[row][6])
          moves.push({from:[r,c],to:[row,6],special:'castle-k'});
        if (rights?.queenSide && !board[row][3] && !board[row][2] && !board[row][1])
          moves.push({from:[r,c],to:[row,2],special:'castle-q'});
      }
    }
  }
  else if (type==='P') {
    const dir = getPawnDirs(piece, size);
    let fwd, fwd2, capDirs;

    if (dir==='up')        { fwd=[-1,0];fwd2=[-2,0];capDirs=[[-1,-1],[-1,1]]; }
    else if (dir==='down') { fwd=[1,0];fwd2=[2,0];capDirs=[[1,-1],[1,1]]; }
    else if (dir==='right'){ fwd=[0,1];fwd2=[0,2];capDirs=[[-1,1],[1,1]]; }
    else                   { fwd=[0,-1];fwd2=[0,-2];capDirs=[[-1,-1],[1,-1]]; }

    const nr=r+fwd[0], nc=c+fwd[1];
    if (isValidCell(board,nr,nc) && !board[nr][nc]) {
      moves.push({from:[r,c],to:[nr,nc]});
      // Double push from start
      const startR = pawnStartRow(color, size);
      const isStart = (dir==='up'||dir==='down') ? r===startR : c===startR;
      if (isStart) {
        const nr2=r+fwd2[0], nc2=c+fwd2[1];
        if (isValidCell(board,nr2,nc2) && !board[nr2][nc2])
          moves.push({from:[r,c],to:[nr2,nc2],special:'double-push'});
      }
    }
    // Captures
    capDirs.forEach(([dr,dc])=>{
      const cr=r+dr, cc=c+dc;
      if (!isValidCell(board,cr,cc)) return;
      const t=board[cr][cc];
      if (t && t.color!==color) moves.push({from:[r,c],to:[cr,cc]});
      // En passant
      if (lastMove?.special==='double-push') {
        const [lr,lc]=lastMove.to;
        if (cr===lr && cc===lc) moves.push({from:[r,c],to:[cr,cc],special:'en-passant'});
      }
    });
  }

  return moves;
}

function applyMove(board, move, castlingRights) {
  const nb = board.map(row=>row.map(p=>p?{...p}:null));
  const {from:[fr,fc],to:[tr,tc],special} = move;
  const piece = {...nb[fr][fc]};

  // Handle specials
  if (special==='castle-k') {
    const row=fr;
    nb[row][6]=piece; nb[row][4]=null;
    nb[row][5]=nb[row][7]; nb[row][7]=null;
    return nb;
  }
  if (special==='castle-q') {
    const row=fr;
    nb[row][2]=piece; nb[row][4]=null;
    nb[row][3]=nb[row][0]; nb[row][0]=null;
    return nb;
  }
  if (special==='en-passant') {
    nb[fr][tc]=null; // remove captured pawn
  }

  nb[tr][tc] = piece;
  nb[fr][fc] = null;

  // Pawn promotion
  const size = board.length;
  if (piece.type==='P') {
    const promoteRow = piece.color==='white'?(size===8?0:size===14?3:3):
      piece.color==='black'?(size===8?7:size===14?10:8):null;
    const promoteCol = piece.color==='red'?10:piece.color==='blue'?3:null;
    if ((promoteRow!==null && tr===promoteRow) || (promoteCol!==null && tc===promoteCol))
      nb[tr][tc] = {type:'Q', color:piece.color};
  }

  // Update castling rights
  if (castlingRights && piece.type==='K') {
    castlingRights[piece.color] = {kingSide:false, queenSide:false};
  }
  if (castlingRights && piece.type==='R') {
    const size8 = board.length===8;
    if (size8) {
      if (fr===7&&fc===7) castlingRights.white.kingSide=false;
      if (fr===7&&fc===0) castlingRights.white.queenSide=false;
      if (fr===0&&fc===7) castlingRights.black.kingSide=false;
      if (fr===0&&fc===0) castlingRights.black.queenSide=false;
    }
  }
  return nb;
}

function isInCheck(board, color) {
  // Find king
  let kr=-1, kc=-1;
  for (let r=0;r<board.length;r++) for (let c=0;c<board.length;c++) {
    if (board[r][c]?.type==='K' && board[r][c]?.color===color) { kr=r;kc=c; }
  }
  if (kr===-1) return false;
  // Check if any enemy piece attacks king
  for (let r=0;r<board.length;r++) for (let c=0;c<board.length;c++) {
    const p=board[r][c];
    if (!p||p.color===color) continue;
    const moves=getMoves(board,r,c,null,null);
    if (moves.some(m=>m.to[0]===kr&&m.to[1]===kc)) return true;
  }
  return false;
}

function getLegalMoves(board, r, c, lastMove, castlingRights) {
  const piece = board[r][c];
  if (!piece) return [];
  const pseudo = getMoves(board,r,c,lastMove,castlingRights);
  return pseudo.filter(mv => {
    const nb = applyMove(board,mv,JSON.parse(JSON.stringify(castlingRights||{})));
    return !isInCheck(nb, piece.color);
  });
}

function getAllLegalMoves(board, color, lastMove, castlingRights) {
  const all=[];
  for (let r=0;r<board.length;r++) for (let c=0;c<board.length;c++) {
    if (board[r][c]?.color===color) {
      getLegalMoves(board,r,c,lastMove,castlingRights).forEach(m=>all.push(m));
    }
  }
  return all;
}

function isCheckmate(board, color, lastMove, castlingRights) {
  return isInCheck(board,color) && getAllLegalMoves(board,color,lastMove,castlingRights).length===0;
}

function isStalemate(board, color, lastMove, castlingRights) {
  return !isInCheck(board,color) && getAllLegalMoves(board,color,lastMove,castlingRights).length===0;
}

function initChessGame(playerCount) {
  const colorMap = {
    2: ['white','black'],
    3: ['white','black','red'],
    4: ['white','black','red','blue']
  };
  const colors = colorMap[playerCount];
  const board = playerCount===2?initBoard2P():playerCount===3?init3PBoard():init4PBoard();
  const castlingRights = {
    white:{kingSide:true,queenSide:true},
    black:{kingSide:true,queenSide:true}
  };
  return {
    board, playerCount, colors,
    currentColorIdx: 0,
    castlingRights,
    lastMove: null,
    moveHistory: [],
    eliminated: [], // colors that lost their king
    status: 'playing',
    winner: null
  };
}

function chessMove(gameState, fromR, fromC, toR, toC) {
  const {board, colors, currentColorIdx, castlingRights, lastMove, eliminated} = gameState;
  const activeColor = colors[currentColorIdx];
  const piece = board[fromR][fromC];
  if (!piece || piece.color !== activeColor) return {ok:false, error:'Not your piece'};

  const legal = getLegalMoves(board, fromR, fromC, lastMove, castlingRights);
  const move = legal.find(m=>m.to[0]===toR&&m.to[1]===toC);
  if (!move) return {ok:false, error:'Illegal move'};

  const crCopy = JSON.parse(JSON.stringify(castlingRights));
  const newBoard = applyMove(board, move, crCopy);
  const captured = board[toR][toC];

  // Check if a king was captured (multi-player)
  let newEliminated = [...eliminated];
  if (captured?.type==='K') {
    newEliminated.push(captured.color);
  }

  // Advance turn (skip eliminated players)
  let nextIdx = (currentColorIdx+1) % colors.length;
  let loopGuard = 0;
  while (newEliminated.includes(colors[nextIdx]) && loopGuard < colors.length) {
    nextIdx = (nextIdx+1) % colors.length;
    loopGuard++;
  }

  // Check game end
  const activePlayers = colors.filter(c=>!newEliminated.includes(c));
  let status = 'playing', winner = null;
  if (activePlayers.length === 1) {
    status = 'finished'; winner = activePlayers[0];
  }

  // Check check/checkmate for next player (2P only for full check logic)
  let inCheck = false, checkmated = false, stalemated = false;
  if (gameState.playerCount===2) {
    const nextColor = colors[nextIdx];
    inCheck = isInCheck(newBoard, nextColor);
    if (inCheck) checkmated = getAllLegalMoves(newBoard, nextColor, move, crCopy).length===0;
    else stalemated = getAllLegalMoves(newBoard, nextColor, move, crCopy).length===0;
    if (checkmated) { status='finished'; winner=activeColor; }
    if (stalemated) { status='draw'; }
  }

  return {
    ok: true,
    newState: {
      ...gameState,
      board: newBoard,
      currentColorIdx: nextIdx,
      castlingRights: crCopy,
      lastMove: move,
      moveHistory: [...gameState.moveHistory, {from:[fromR,fromC],to:[toR,toC],piece,captured}],
      eliminated: newEliminated,
      status, winner
    },
    move, captured, inCheck, checkmated, stalemated, newEliminated
  };
}

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');

const HTML = "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Chess Arcade \u2013 Pixel Party</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap\" rel=\"stylesheet\">\n<style>\n*{box-sizing:border-box;margin:0;padding:0;image-rendering:pixelated}\n:root{\n  --dark:#0a0a1a;--darker:#050510;--gold:#f0c040;--gold2:#d4a520;\n  --green:#40e040;--red:#e04040;--blue:#4080ff;--cyan:#40e0e0;\n  --white:#e8e8f0;--gray:#606080;--panel:#111128;--border:#303060;--hover:#202048;\n  --white-piece:#f5f0e0;--black-piece:#1a1a2e;--red-piece:#e04040;--blue-piece:#4080ff;\n}\nbody{background:var(--dark);font-family:'Press Start 2P',monospace;color:var(--white);min-height:100vh;overflow-x:hidden}\n.scanlines{position:fixed;inset:0;pointer-events:none;z-index:1000;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px)}\n.header{text-align:center;padding:18px 16px 12px;background:linear-gradient(180deg,#050510,var(--dark));border-bottom:3px solid var(--gold)}\n.title-main{font-size:12px;color:var(--gold);text-shadow:0 0 12px rgba(240,192,64,.6),2px 2px 0 #000;animation:pulse 2s infinite}\n.title-sub{font-size:6px;color:var(--cyan);margin-top:6px;letter-spacing:4px}\n@keyframes pulse{0%,100%{text-shadow:0 0 10px rgba(240,192,64,.6),2px 2px 0 #000}50%{text-shadow:0 0 22px rgba(240,192,64,.9),2px 2px 0 #000}}\n.screen{display:none}.screen.active{display:block}\n.page{max-width:760px;margin:0 auto;padding:14px}\n.btn{font-family:'Press Start 2P',monospace;cursor:pointer;border:none;outline:none;padding:10px 14px;font-size:7px;letter-spacing:1px;transition:transform .1s,box-shadow .1s}\n.btn:active{transform:translateY(2px)}\n.btn-gold{background:var(--gold);color:#000;box-shadow:0 4px 0 var(--gold2),4px 4px 0 #000}\n.btn-gold:hover{transform:translateY(-2px);box-shadow:0 6px 0 var(--gold2),6px 6px 0 #000}\n.btn-blue{background:var(--blue);color:#fff;box-shadow:0 4px 0 #2060cc,4px 4px 0 #000}\n.btn-blue:hover{transform:translateY(-2px);box-shadow:0 6px 0 #2060cc,6px 6px 0 #000}\n.btn-green{background:var(--green);color:#000;box-shadow:0 4px 0 #20a020,4px 4px 0 #000}\n.btn-green:hover{transform:translateY(-2px);box-shadow:0 6px 0 #20a020,6px 6px 0 #000}\n.btn-red{background:var(--red);color:#fff;box-shadow:0 4px 0 #902020,4px 4px 0 #000}\n.btn-sm{padding:7px 10px;font-size:6px}.btn-xs{padding:5px 8px;font-size:5px}\n.pixel-input{background:var(--darker);border:2px solid var(--border);color:var(--white);font-family:'Press Start 2P',monospace;font-size:8px;padding:9px;width:100%;outline:none}\n.pixel-input:focus{border-color:var(--gold)}\n.section-title{font-size:7px;color:var(--gold);margin-bottom:10px;display:flex;align-items:center;gap:8px}\n.section-title::after{content:'';flex:1;height:2px;background:var(--border)}\n.game-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}\n.game-card{background:var(--panel);border:2px solid var(--border);padding:12px 8px;cursor:pointer;text-align:center;transition:all .1s}\n.game-card:hover{border-color:var(--gold);background:var(--hover);transform:translateY(-2px)}\n.game-card.selected{border-color:var(--green)}\n.game-icon{font-size:22px;display:block;margin-bottom:8px}\n.game-name{font-size:5px;color:var(--gold);margin-bottom:4px;line-height:1.6}\n.game-desc{font-size:4px;color:var(--gray);line-height:1.8}\n.players-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px}\n.player-card{background:var(--darker);border:2px solid var(--border);padding:10px;position:relative}\n.player-card.me{border-color:var(--cyan)}.player-card.host{border-color:var(--gold)}\n.p-num{font-size:5px;color:var(--gray);margin-bottom:4px}.p-name{font-size:8px;color:var(--white)}\n.p-score{font-size:10px;color:var(--gold);margin-top:4px}.p-badge{position:absolute;top:5px;right:6px;font-size:8px}\n.waiting-dot{display:inline-block;animation:blink 1s step-end infinite;color:var(--green)}\n@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}\n.room-code-display{background:var(--darker);border:3px solid var(--gold);padding:14px;text-align:center;margin:12px 0}\n.room-code-label{font-size:6px;color:var(--gray);margin-bottom:8px}\n.room-code-value{font-size:24px;color:var(--gold);letter-spacing:8px;text-shadow:0 0 12px rgba(240,192,64,.5)}\n.room-code-hint{font-size:5px;color:var(--gray);margin-top:8px}\n.status-bar{background:var(--panel);border-top:2px solid var(--border);border-bottom:2px solid var(--border);padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-size:6px;margin-bottom:8px;flex-wrap:wrap;gap:4px}\n.status-turn{color:var(--cyan)}.status-info{color:var(--gray)}\n/* \u2500\u2500 CHESS BOARD \u2500\u2500 */\n.chess-layout{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:flex-start}\n.chess-board-wrap{position:relative;overflow:auto}\n.chess-board{display:inline-grid;border:3px solid var(--gold);box-shadow:0 0 20px rgba(240,192,64,.2)}\n.chess-cell{display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:filter .1s;user-select:none}\n.chess-cell.light{background:#c8a76a}.chess-cell.dark{background:#7a4f2d}\n.chess-cell:hover{filter:brightness(1.25)}\n.chess-cell.selected{outline:3px solid var(--gold);z-index:3;filter:brightness(1.3)}\n.chess-cell.legal-move::after{content:'';position:absolute;width:34%;height:34%;border-radius:50%;background:rgba(240,192,64,.55);pointer-events:none;z-index:2}\n.chess-cell.legal-cap{outline:3px solid var(--red);filter:brightness(1.2)}\n.chess-cell.last-from{background:rgba(240,192,64,.35)!important}\n.chess-cell.last-to{background:rgba(240,192,64,.55)!important}\n.chess-cell.check-cell{background:rgba(224,64,64,.6)!important}\n.chess-cell.eliminated-cell{opacity:.35;pointer-events:none}\n.piece-svg{pointer-events:none;display:block;transition:transform .15s}\n/* piece colors */\n.piece-white{filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))}\n.piece-black{filter:drop-shadow(0 1px 2px rgba(0,0,0,.9)) invert(1) brightness(2.5)}\n.piece-red{filter:drop-shadow(0 1px 2px rgba(0,0,0,.8)) sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.1)}\n.piece-blue{filter:drop-shadow(0 1px 2px rgba(0,0,0,.8)) sepia(1) saturate(8) hue-rotate(200deg) brightness(1.2)}\n/* sidebar */\n.chess-sidebar{min-width:160px;max-width:200px;display:flex;flex-direction:column;gap:8px}\n.chess-players-panel{background:var(--panel);border:2px solid var(--border);padding:10px}\n.chess-player-row{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);font-size:5px}\n.chess-player-row:last-child{border-bottom:none}\n.chess-player-row.active-player{background:rgba(240,192,64,.08);margin:0 -10px;padding:5px 10px}\n.chess-player-row.eliminated-row{opacity:.4;text-decoration:line-through}\n.color-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;border:1px solid rgba(255,255,255,.3)}\n.dot-white{background:#f5f0e0}.dot-black{background:#1a1a2e;border-color:#606080}\n.dot-red{background:#e04040}.dot-blue{background:#4080ff}\n.player-name-chess{flex:1;overflow:hidden;color:var(--white)}\n.player-captured{font-size:10px;color:var(--gray);margin-left:auto}\n.chess-move-log{background:var(--darker);border:2px solid var(--border);padding:8px;max-height:100px;overflow-y:auto;font-size:5px;color:var(--gray);line-height:2}\n.chat-wrap{display:flex;flex-direction:column;height:100px;background:var(--darker);border:2px solid var(--border)}\n.chat-msgs{flex:1;overflow-y:auto;padding:6px;font-size:5px;line-height:2}\n.chat-msg{color:var(--gray)}.chat-msg .chat-name{color:var(--cyan)}.chat-msg.system{color:var(--gold)}\n.chat-input-row{display:flex;border-top:2px solid var(--border)}\n.chat-in{flex:1;background:transparent;border:none;color:var(--white);font-family:'Press Start 2P',monospace;font-size:5px;padding:6px;outline:none}\n.chat-send{background:var(--border);border:none;color:var(--white);font-family:'Press Start 2P',monospace;font-size:5px;padding:6px 10px;cursor:pointer}\n.chat-send:hover{background:var(--gold);color:#000}\n.score-table{width:100%;background:var(--panel);border:2px solid var(--border);margin-top:8px}\n.score-row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--border);font-size:6px}\n.score-row:last-child{border-bottom:none}.score-name{color:var(--white)}.score-pts{color:var(--gold)}\n.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--panel);border:2px solid var(--gold);padding:10px 16px;font-size:7px;z-index:900;animation:toastIn .2s ease;max-width:90%;text-align:center}\n.toast.error{border-color:var(--red)}\n@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}\n.result-overlay{position:fixed;inset:0;background:rgba(0,0,10,.88);z-index:500;display:flex;align-items:center;justify-content:center}\n.result-box{background:var(--panel);border:3px solid var(--gold);padding:24px;max-width:340px;width:90%;text-align:center}\n.result-title{font-size:11px;color:var(--gold);margin-bottom:12px}\n.result-msg{font-size:7px;color:var(--white);line-height:2.2;margin-bottom:10px}\n.result-pts{font-size:22px;color:var(--green);margin:6px 0}\n.flex-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.mt8{margin-top:8px}.mt12{margin-top:12px}.mb12{margin-bottom:12px}\n.text-center{text-align:center}.hidden{display:none}\n.instructions{background:var(--darker);border:1px solid var(--border);padding:8px;font-size:5px;color:var(--gray);line-height:2.2;margin-bottom:8px}\n.conn-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:4px;box-shadow:0 0 6px var(--green)}\n.conn-dot.off{background:var(--red);box-shadow:0 0 6px var(--red)}\n.chess-variant-select{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}\n.variant-card{background:var(--panel);border:2px solid var(--border);padding:10px;cursor:pointer;text-align:center;transition:all .1s}\n.variant-card:hover{border-color:var(--gold);background:var(--hover)}\n.variant-card.selected{border-color:var(--green)}\n.variant-icon{font-size:20px;margin-bottom:6px}\n.variant-name{font-size:5px;color:var(--gold);line-height:1.6}\n.variant-desc{font-size:4px;color:var(--gray);margin-top:4px;line-height:1.8}\n.mine-wrap{display:flex;justify-content:center;overflow-x:auto;padding:4px 0}\n.mine-grid{display:inline-grid;gap:2px}\n.mine-cell{width:38px;height:38px;background:var(--panel);border:2px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;font-family:'VT323',monospace;user-select:none;transition:background .1s}\n.mine-cell:hover:not(.revealed):not(.flagged){background:var(--hover);border-color:var(--gold)}\n.mine-cell.revealed{background:var(--darker);border-color:#1a1a3a;cursor:default}\n.mine-cell.flagged{background:var(--panel)}.mine-cell.mine-hit{background:var(--red)}\n.mine-cell.safe-reveal{background:#0a2a0a;border-color:var(--green)}\n.num-1{color:#40a0ff}.num-2{color:#40e040}.num-3{color:#e04040}.num-4{color:#8040ff}\n.num-5{color:#ff8040}.num-6{color:#40e0e0}.num-7{color:#e0e040}.num-8{color:var(--white)}\n.puzzle-area{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}\n.puzzle-board{display:inline-grid}\n.puzzle-cell{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;user-select:none;transition:all .15s;border:1px solid transparent}\n.puzzle-cell.light-sq{background:#c8a76a}.puzzle-cell.dark-sq{background:#8b6040}\n.puzzle-cell:hover{filter:brightness(1.3);z-index:2}\n.puzzle-cell.sel-sq{outline:3px solid var(--gold);z-index:3}\n.puzzle-cell.correct-cell{outline:3px solid var(--green);background:rgba(64,224,64,.25)!important}\n.piece-tray{background:var(--panel);border:2px solid var(--border);padding:10px;min-width:60px}\n.tray-piece{width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;border:2px solid var(--border);margin-bottom:6px;background:var(--darker);transition:all .1s}\n.tray-piece:hover{border-color:var(--gold);background:var(--hover)}\n.tray-piece.sel{border-color:var(--green);background:#0a200a}\n.tray-piece.disabled{opacity:.3;pointer-events:none}\n.guess-wrap{text-align:center;padding:0 8px}\n.guess-timer{font-size:20px;color:var(--gold);animation:timerPulse 1s infinite;margin:6px 0}\n.guess-timer.urgent{color:var(--red);animation:timerPulse .4s infinite}\n@keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.6}}\n.guess-question{font-size:7px;color:var(--cyan);margin:6px 0;line-height:1.8}\n.guess-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:500px;margin:10px auto}\n.g-btn{background:var(--panel);border:2px solid var(--border);padding:10px 6px;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:5px;color:var(--white);transition:all .1s;text-align:center}\n.g-btn:hover:not(.locked){border-color:var(--gold);background:var(--hover)}\n.g-btn.locked{cursor:default}\n.g-btn.correct-ans{border-color:var(--green);background:#0a200a;color:var(--green)}\n.g-btn.wrong-ans{border-color:var(--red);background:#200a0a;color:var(--red)}\n.piece-val{font-size:9px;color:var(--cyan);margin-top:4px}\n.streak-bar{display:flex;gap:4px;justify-content:center;margin:6px 0}\n.streak-pip{width:12px;height:12px;background:var(--border)}\n.streak-pip.lit{background:var(--gold);box-shadow:0 0 6px rgba(240,192,64,.7)}\n.final-scores-list{margin:12px 0}\n.medal{font-size:14px}\n</style>\n</head>\n<body>\n<div class=\"scanlines\"></div>\n<div class=\"header\">\n  <div class=\"title-main\">\u265f CHESS ARCADE \u265f</div>\n  <div class=\"title-sub\">PIXEL PARTY \u2014 ONLINE</div>\n</div>\n\n<!-- MENU -->\n<div id=\"screen-menu\" class=\"screen active\">\n  <div class=\"page\" style=\"max-width:420px\">\n    <div style=\"margin:20px 0 14px;text-align:center;font-size:8px;color:var(--gray)\">INGRESA TU NOMBRE</div>\n    <input class=\"pixel-input\" id=\"my-name\" placeholder=\"TU NOMBRE...\" maxlength=\"12\" style=\"margin-bottom:14px\">\n    <div class=\"section-title\">\u25b6 CREAR SALA</div>\n    <button class=\"btn btn-gold\" style=\"width:100%;margin-bottom:14px\" onclick=\"createRoom()\">\u2726 CREAR NUEVA SALA</button>\n    <div class=\"section-title\">\u25b6 UNIRSE</div>\n    <div class=\"flex-row mb12\">\n      <input class=\"pixel-input\" id=\"room-code-input\" placeholder=\"C\u00d3DIGO (ej: AB3X)\" maxlength=\"4\" style=\"flex:1;text-transform:uppercase;font-size:8px;padding:9px\">\n      <button class=\"btn btn-blue btn-sm\" onclick=\"joinRoom()\">ENTRAR</button>\n    </div>\n    <div style=\"font-size:5px;color:var(--gray);text-align:center;line-height:2;margin-top:16px\">\n      2\u20134 jugadores \u00b7 Ajedrez \u00b7 Buscaminas \u00b7 Rompecabezas \u00b7 Adivina\n    </div>\n  </div>\n</div>\n\n<!-- LOBBY -->\n<div id=\"screen-lobby\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"room-code-display\">\n      <div class=\"room-code-label\">C\u00d3DIGO DE SALA \u2014 COMPARTE CON TUS AMIGOS</div>\n      <div class=\"room-code-value\" id=\"lobby-code\">----</div>\n      <div class=\"room-code-hint\">Todos ingresan este c\u00f3digo en el men\u00fa</div>\n    </div>\n    <div class=\"section-title\">\u25b6 JUGADORES <span id=\"lobby-count\" style=\"font-size:5px;color:var(--gray)\">(0/4)</span></div>\n    <div class=\"players-list\" id=\"lobby-players\"></div>\n    <div id=\"host-controls\" class=\"hidden\">\n      <div class=\"section-title\">\u25b6 MODO DE JUEGO</div>\n      <div class=\"game-cards\">\n        <div class=\"game-card\" onclick=\"setMode('chess')\">\n          <span class=\"game-icon\">\u265f</span>\n          <div class=\"game-name\">AJEDREZ ONLINE</div>\n          <div class=\"game-desc\">2, 3 o 4 jugadores en tiempo real</div>\n        </div>\n        <div class=\"game-card\" onclick=\"setMode('minesweeper')\">\n          <span class=\"game-icon\">\ud83d\udca3</span>\n          <div class=\"game-name\">BUSCAMINAS</div>\n          <div class=\"game-desc\">Piezas ocultas, evita bombas</div>\n        </div>\n        <div class=\"game-card\" onclick=\"setMode('puzzle')\">\n          <span class=\"game-icon\">\ud83e\udde9</span>\n          <div class=\"game-name\">ROMPECABEZAS</div>\n          <div class=\"game-desc\">Coloca piezas en posici\u00f3n correcta</div>\n        </div>\n        <div class=\"game-card\" onclick=\"setMode('guess')\">\n          <span class=\"game-icon\">\ud83c\udfaf</span>\n          <div class=\"game-name\">ADIVINA LA PIEZA</div>\n          <div class=\"game-desc\">\u00bfCu\u00e1l vale m\u00e1s? \u00a1S\u00e9 el primero!</div>\n        </div>\n      </div>\n      <div id=\"chess-variant-host\" class=\"hidden\">\n        <div class=\"section-title\">\u25b6 VARIANTE DE AJEDREZ</div>\n        <div class=\"chess-variant-select\">\n          <div class=\"variant-card\" onclick=\"setChessVariant(2)\">\n            <div class=\"variant-icon\">\u2694\ufe0f</div>\n            <div class=\"variant-name\">2 JUGADORES</div>\n            <div class=\"variant-desc\">Ajedrez cl\u00e1sico 8\u00d78</div>\n          </div>\n          <div class=\"variant-card\" onclick=\"setChessVariant(3)\">\n            <div class=\"variant-icon\">\ud83d\udd3a</div>\n            <div class=\"variant-name\">3 JUGADORES</div>\n            <div class=\"variant-desc\">Tablero 12\u00d712 triangular</div>\n          </div>\n          <div class=\"variant-card\" onclick=\"setChessVariant(4)\">\n            <div class=\"variant-icon\">\ud83c\udf10</div>\n            <div class=\"variant-name\">4 JUGADORES</div>\n            <div class=\"variant-desc\">Tablero 14\u00d714 de 4 ej\u00e9rcitos</div>\n          </div>\n        </div>\n      </div>\n      <button class=\"btn btn-gold\" style=\"width:100%;margin-top:8px\" id=\"start-btn\" onclick=\"startGame()\">\u25b6 INICIAR PARTIDA</button>\n    </div>\n    <div id=\"guest-waiting\" class=\"hidden\" style=\"text-align:center;font-size:7px;color:var(--gray);margin-top:10px\">\n      Esperando al host<span class=\"waiting-dot\">...</span>\n    </div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"chat-msgs\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"chat-input\" placeholder=\"Escribe un mensaje...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n    <div class=\"mt8 text-center\">\n      <button class=\"btn btn-red btn-xs\" onclick=\"leaveRoom()\">\u25c0 SALIR</button>\n    </div>\n  </div>\n</div>\n\n<!-- CHESS -->\n<div id=\"screen-chess\" class=\"screen\">\n  <div class=\"page\" style=\"max-width:900px\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"chess-turn-display\">TURNO: ---</div>\n      <div class=\"status-info\" id=\"chess-status-info\">---</div>\n    </div>\n    <div class=\"chess-layout\">\n      <div class=\"chess-board-wrap\">\n        <div id=\"chess-board\" class=\"chess-board\"></div>\n      </div>\n      <div class=\"chess-sidebar\">\n        <div class=\"chess-players-panel\" id=\"chess-players-panel\"></div>\n        <div class=\"chess-move-log\" id=\"chess-move-log\">Historial de jugadas...</div>\n        <div class=\"chat-wrap\">\n          <div class=\"chat-msgs\" id=\"chess-chat\"></div>\n          <div class=\"chat-input-row\">\n            <input class=\"chat-in\" id=\"chess-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n            <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n          </div>\n        </div>\n        <div class=\"flex-row mt8\" style=\"justify-content:center;gap:6px\">\n          <button class=\"btn btn-blue btn-xs\" id=\"chess-revancha-btn\" onclick=\"newRound()\" style=\"display:none\">\u21ba REVANCHA</button>\n          <button class=\"btn btn-red btn-xs\" onclick=\"leaveRoom()\">\u25c0 SALIR</button>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- MINESWEEPER -->\n<div id=\"screen-minesweeper\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"mine-turn\">TURNO: ---</div>\n      <div class=\"status-info\" id=\"mine-flags\">\ud83d\udea9 0/10</div>\n    </div>\n    <div class=\"instructions\">CLICK: revelar \u00b7 CLICK DERECHO: bandera \ud83d\udea9 \u00b7 Piezas dan puntos \u00b7 \u00a1Bombas pasan turno!</div>\n    <div class=\"mine-wrap\"><div id=\"mine-grid\" class=\"mine-grid\"></div></div>\n    <div class=\"score-table mt8\" id=\"mine-scores\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"mine-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"mine-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- PUZZLE -->\n<div id=\"screen-puzzle\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"puzzle-turn\">TURNO: ---</div>\n      <div class=\"status-info\" id=\"puzzle-prog\">PIEZAS: 0/10</div>\n    </div>\n    <div class=\"instructions\">Selecciona una pieza \u2192 Haz clic en su casilla correcta del tablero</div>\n    <div class=\"puzzle-area\" id=\"puzzle-area\"></div>\n    <div class=\"score-table mt8\" id=\"puzzle-scores\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"puzzle-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"puzzle-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- GUESS -->\n<div id=\"screen-guess\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"guess-round\">RONDA: 1/10</div>\n      <div class=\"status-info\">\u00a1Primero en responder gana!</div>\n    </div>\n    <div class=\"instructions\">\u00bfQu\u00e9 pieza vale m\u00e1s? Toca r\u00e1pido. Racha de 3+ = bonus +2pts.</div>\n    <div class=\"guess-wrap\">\n      <div class=\"guess-timer\" id=\"guess-timer\">10</div>\n      <div class=\"guess-question\" id=\"guess-question\">CARGANDO...</div>\n      <div class=\"streak-bar\" id=\"streak-bar\"></div>\n      <div class=\"guess-opts\" id=\"guess-opts\"></div>\n    </div>\n    <div class=\"score-table mt8\" id=\"guess-scores\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"guess-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"guess-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- GAME OVER -->\n<div id=\"screen-gameover\" class=\"screen\">\n  <div class=\"page\" style=\"text-align:center\">\n    <div style=\"font-size:13px;color:var(--gold);margin:16px 0\">\ud83c\udfc6 RESULTADOS</div>\n    <div id=\"go-scores\" class=\"final-scores-list\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"go-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"go-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n    <div class=\"flex-row mt12\" style=\"justify-content:center;gap:10px\">\n      <button class=\"btn btn-blue btn-sm\" id=\"revancha-btn\" onclick=\"newRound()\" style=\"display:none\">\u21ba REVANCHA (HOST)</button>\n      <button class=\"btn btn-red btn-sm\" onclick=\"leaveRoom()\">\u25c0 SALIR</button>\n    </div>\n  </div>\n</div>\n\n<div id=\"result-overlay\" class=\"result-overlay hidden\">\n  <div class=\"result-box\">\n    <div class=\"result-title\" id=\"res-title\"></div>\n    <div class=\"result-msg\" id=\"res-msg\"></div>\n    <div class=\"result-pts\" id=\"res-pts\"></div>\n    <button class=\"btn btn-gold btn-sm\" onclick=\"closeResult()\">OK \u25b6</button>\n  </div>\n</div>\n\n<script>\n// \u2500\u2500 STATE \u2500\u2500\nlet ws=null,myId=null,myName='',roomCode=null,isHost=false,roomData=null;\nlet selectedMode=null,chessVariant=2;\nlet selectedPiece=null,guessTimerInterval=null,guessTimeLeft=10,guessAnswered=false;\nlet resultQueue=[],showingResult=false;\n// Chess client state\nlet chessSelected=null,chessLegalMoves=[],chessMyColor=null;\n\n// \u2500\u2500 PIECE SYMBOLS (Unicode chess) \u2500\u2500\nconst PIECE_SYMS = {\n  white:{K:'\u2654',Q:'\u2655',R:'\u2656',B:'\u2657',N:'\u2658',P:'\u2659'},\n  black:{K:'\u265a',Q:'\u265b',R:'\u265c',B:'\u265d',N:'\u265e',P:'\u265f'},\n  red:  {K:'\u2654',Q:'\u2655',R:'\u2656',B:'\u2657',N:'\u2658',P:'\u2659'},\n  blue: {K:'\u2654',Q:'\u2655',R:'\u2656',B:'\u2657',N:'\u2658',P:'\u2659'},\n};\nconst COLOR_LABELS={white:'BLANCAS',black:'NEGRAS',red:'ROJAS',blue:'AZULES'};\nconst COLOR_HEX={white:'#f5f0e0',black:'#4a4a6a',red:'#e04040',blue:'#4080ff'};\n\n// \u2500\u2500 WS \u2500\u2500\nfunction connect(cb){\n  const proto=location.protocol==='https:'?'wss':'ws';\n  ws=new WebSocket(`${proto}://${location.host}`);\n  ws.onopen=cb;\n  ws.onmessage=e=>handleMsg(JSON.parse(e.data));\n  ws.onclose=()=>showToast('Conexi\u00f3n perdida. Recarga la p\u00e1gina.',true);\n  ws.onerror=()=>showToast('Error de conexi\u00f3n',true);\n}\nfunction sendWS(msg){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));}\n\n// \u2500\u2500 MESSAGE HANDLER \u2500\u2500\nfunction handleMsg(msg){\n  switch(msg.type){\n    case 'joined':\n      myId=msg.playerId;roomCode=msg.roomCode;isHost=msg.isHost;\n      document.getElementById('lobby-code').textContent=roomCode;\n      showScreen('screen-lobby'); break;\n    case 'room_state':\n      roomData=msg.room; renderLobby();\n      if(roomData.gameState==='playing') renderGameState(); break;\n    case 'game_started': renderGameState(); break;\n    case 'chess_state':\n      roomData={...roomData,gameData:msg.gameData,currentPlayerIdx:msg.currentPlayerIdx};\n      renderChessBoard(); renderChessPlayers(); break;\n    case 'chess_move_result':\n      handleChessMoveResult(msg); break;\n    case 'chess_check':\n      showToast(`\u00a1JAQUE a ${COLOR_LABELS[msg.color]}!`); break;\n    case 'chess_checkmate':\n      showToast(`\u265b JAQUE MATE \u2014 Gana ${COLOR_LABELS[msg.winner]}!`); break;\n    case 'chess_eliminated':\n      showToast(`${COLOR_LABELS[msg.color]} fue eliminado!`); break;\n    case 'mine_bomb': queueResult('\ud83d\udca5 \u00a1BOMBA!',`${msg.playerName} pis\u00f3 una mina. Turno perdido.`,0); break;\n    case 'mine_piece': queueResult(`${msg.piece.sym} \u00a1${msg.piece.name}!`,`${msg.playerName} encontr\u00f3 un ${msg.piece.name}!`,msg.pts); break;\n    case 'puzzle_correct': queueResult(`${msg.piece.sym} \u00a1CORRECTO!`,`${msg.playerName} coloc\u00f3 la pieza!`,msg.pts); break;\n    case 'puzzle_wrong': queueResult('\u274c INCORRECTO',`${msg.playerName} fall\u00f3. Turno pasa.`,0); break;\n    case 'guess_result':\n      clearInterval(guessTimerInterval); guessAnswered=true;\n      revealGuessAnswer(msg.correctIdx,msg.correct?null:-1);\n      if(msg.correct) queueResult('\u2705 \u00a1CORRECTO!',`${msg.playerName} respondi\u00f3 primero! ${msg.streak>=3?'\ud83d\udd25 RACHA x'+msg.streak:''}`,msg.pts);\n      else queueResult('\u274c INCORRECTO',`${msg.playerName} fall\u00f3.`,0);\n      updateStreak(msg.streak); break;\n    case 'guess_timeout':\n      clearInterval(guessTimerInterval); guessAnswered=true;\n      revealGuessAnswer(msg.correctIdx,-1);\n      queueResult('\u23f1 TIEMPO!','Nadie respondi\u00f3 a tiempo.',0); break;\n    case 'game_over':\n      clearInterval(guessTimerInterval);\n      setTimeout(()=>showGameOver(msg.scores),500); break;\n    case 'error': showToast(msg.msg,true); break;\n    case 'chat': appendChat(msg); break;\n  }\n}\n\n// \u2500\u2500 SCREENS \u2500\u2500\nfunction showScreen(id){\n  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));\n  document.getElementById(id).classList.add('active');\n}\nfunction renderGameState(){\n  if(!roomData) return;\n  const mode=roomData.gameMode;\n  if(mode==='chess'){showScreen('screen-chess');initChessClient();renderChessBoard();renderChessPlayers();}\n  else if(mode==='minesweeper'){showScreen('screen-minesweeper');renderMine();}\n  else if(mode==='puzzle'){showScreen('screen-puzzle');renderPuzzle();}\n  else if(mode==='guess'){showScreen('screen-guess');renderGuess();}\n}\n\n// \u2500\u2500 MENU \u2500\u2500\nfunction createRoom(){\n  myName=document.getElementById('my-name').value.trim().toUpperCase()||'PLAYER1';\n  connect(()=>sendWS({type:'create_room',name:myName}));\n}\nfunction joinRoom(){\n  myName=document.getElementById('my-name').value.trim().toUpperCase()||'PLAYER';\n  const code=document.getElementById('room-code-input').value.trim().toUpperCase();\n  if(!code){showToast('Ingresa un c\u00f3digo',true);return;}\n  connect(()=>sendWS({type:'join_room',name:myName,code}));\n}\nfunction leaveRoom(){\n  if(ws)ws.close(); ws=null;myId=null;roomCode=null;isHost=false;roomData=null;chessMyColor=null;\n  showScreen('screen-menu');\n}\nfunction setMode(mode){\n  selectedMode=mode; sendWS({type:'set_game',mode});\n  document.getElementById('chess-variant-host').classList.toggle('hidden',mode!=='chess');\n}\nfunction setChessVariant(v){\n  chessVariant=v; sendWS({type:'set_chess_variant',variant:v});\n  document.querySelectorAll('.variant-card').forEach((c,i)=>c.classList.toggle('selected',[2,3,4][i]===v));\n}\nfunction startGame(){sendWS({type:'start_game'});}\nfunction newRound(){sendWS({type:'new_round'});showScreen('screen-lobby');}\n\n// \u2500\u2500 LOBBY RENDER \u2500\u2500\nfunction renderLobby(){\n  if(!roomData) return;\n  const {players,hostId,gameMode,chessVariant:cv}=roomData;\n  document.getElementById('lobby-count').textContent=`(${players.length}/4)`;\n  document.getElementById('lobby-players').innerHTML=players.map((p,i)=>`\n    <div class=\"player-card ${p.id===myId?'me':''} ${p.id===hostId?'host':''}\">\n      <div class=\"p-num\">JUGADOR ${i+1}</div>\n      <div class=\"p-name\">${p.name}${p.id===myId?' \u25c0':''}</div>\n      <div class=\"p-score\">${p.score} PTS</div>\n      <div class=\"p-badge\">${p.id===hostId?'\ud83d\udc51':''}</div>\n    </div>`).join('');\n  if(isHost){\n    document.getElementById('host-controls').classList.remove('hidden');\n    document.getElementById('guest-waiting').classList.add('hidden');\n    document.querySelectorAll('.game-card').forEach((c,i)=>{\n      c.classList.toggle('selected',['chess','minesweeper','puzzle','guess'][i]===gameMode);\n    });\n    if(gameMode==='chess'){\n      document.getElementById('chess-variant-host').classList.remove('hidden');\n      document.querySelectorAll('.variant-card').forEach((c,i)=>{\n        c.classList.toggle('selected',[2,3,4][i]===(cv||2));\n      });\n    }\n    const canStart=players.length>=2&&gameMode&&(gameMode!=='chess'||players.length===(cv||2));\n    const btn=document.getElementById('start-btn');\n    btn.style.opacity=canStart?'1':'0.4';btn.style.pointerEvents=canStart?'auto':'none';\n    if(gameMode==='chess'){\n      const need=cv||2;\n      btn.textContent=`\u25b6 INICIAR (${players.length}/${need} jugadores)`;\n    } else btn.textContent='\u25b6 INICIAR PARTIDA';\n  } else {\n    document.getElementById('host-controls').classList.add('hidden');\n    document.getElementById('guest-waiting').classList.remove('hidden');\n  }\n}\n\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n// CHESS CLIENT\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nfunction initChessClient(){\n  if(!roomData?.gameData) return;\n  const {colors,playerCount}=roomData.gameData;\n  // Assign my color based on player order\n  const myIdx=roomData.players.findIndex(p=>p.id===myId);\n  chessMyColor = myIdx>=0 && myIdx<colors.length ? colors[myIdx] : null;\n  chessSelected=null; chessLegalMoves=[];\n  document.getElementById('chess-revancha-btn').style.display=isHost?'inline-block':'none';\n}\n\nfunction renderChessBoard(){\n  if(!roomData?.gameData) return;\n  const {board,colors,currentColorIdx,lastMove,eliminated,status,winner,playerCount}=roomData.gameData;\n  const size=board.length;\n  const activeColor=colors[currentColorIdx];\n  const isMyTurn=chessMyColor===activeColor && status==='playing';\n\n  const boardEl=document.getElementById('chess-board');\n  const cellSize=size===8?54:size===12?40:32;\n  boardEl.style.gridTemplateColumns=`repeat(${size},${cellSize}px)`;\n  boardEl.innerHTML='';\n\n  // Find kings in check\n  const checksMap={};\n  if(status==='playing') {\n    colors.forEach(color=>{\n      if(eliminated.includes(color)) return;\n      // simplified: just highlight active color king if in check\n    });\n  }\n\n  for(let r=0;r<size;r++){\n    for(let c=0;c<size;c++){\n      // For 14x14 corners\n      if(size===14&&((r<3&&c<3)||(r<3&&c>10)||(r>10&&c<3)||(r>10&&c>10))){\n        const ph=document.createElement('div');\n        ph.style.cssText=`width:${cellSize}px;height:${cellSize}px;background:#000`;\n        boardEl.appendChild(ph);\n        continue;\n      }\n      const isLight=(r+c)%2===0;\n      const piece=board[r][c];\n      const cell=document.createElement('div');\n      cell.className=`chess-cell ${isLight?'light':'dark'}`;\n      cell.style.cssText=`width:${cellSize}px;height:${cellSize}px`;\n      cell.dataset.r=r; cell.dataset.c=c;\n\n      // Highlights\n      if(lastMove){\n        if(lastMove.from[0]===r&&lastMove.from[1]===c) cell.classList.add('last-from');\n        if(lastMove.to[0]===r&&lastMove.to[1]===c) cell.classList.add('last-to');\n      }\n      if(chessSelected&&chessSelected[0]===r&&chessSelected[1]===c) cell.classList.add('selected');\n      if(chessLegalMoves.some(m=>m.to[0]===r&&m.to[1]===c)){\n        if(piece) cell.classList.add('legal-cap');\n        else cell.classList.add('legal-move');\n      }\n      if(piece?.type==='K'&&eliminated.includes(piece.color)) cell.classList.add('eliminated-cell');\n\n      // Piece\n      if(piece){\n        const sym=PIECE_SYMS[piece.color]?.[piece.type]||'?';\n        const span=document.createElement('span');\n        span.style.cssText=`font-size:${cellSize*0.7}px;line-height:1;color:${COLOR_HEX[piece.color]};text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.6);display:block`;\n        span.textContent=sym;\n        cell.appendChild(span);\n      }\n\n      cell.addEventListener('click',()=>chessClick(r,c));\n      boardEl.appendChild(cell);\n    }\n  }\n\n  // Turn display\n  const curPlayer=roomData.players[roomData.currentPlayerIdx];\n  const activeLabel=COLOR_LABELS[activeColor]||activeColor;\n  const isMine=chessMyColor===activeColor;\n  document.getElementById('chess-turn-display').textContent=\n    status==='finished'?`\u265b FIN DE PARTIDA`:\n    status==='draw'?'TABLAS':\n    `TURNO: ${activeLabel}${isMine?' (T\u00da)':''}`;\n  document.getElementById('chess-status-info').textContent=\n    status==='finished'?`GANADOR: ${COLOR_LABELS[winner]||winner}`:\n    `${playerCount} JUGADORES \u00b7 ${curPlayer?.name||''}`;\n\n  if(status!=='playing'){\n    document.getElementById('chess-revancha-btn').style.display=isHost?'inline-block':'none';\n  }\n}\n\nfunction renderChessPlayers(){\n  if(!roomData?.gameData) return;\n  const {colors,currentColorIdx,eliminated,playerCount}=roomData.gameData;\n  const panel=document.getElementById('chess-players-panel');\n  panel.innerHTML='<div style=\"font-size:5px;color:var(--gray);margin-bottom:6px\">JUGADORES</div>'+\n    roomData.players.map((p,i)=>{\n      const color=colors[i];\n      if(!color) return '';\n      const isActive=i===roomData.currentPlayerIdx;\n      const isElim=eliminated.includes(color);\n      return `<div class=\"chess-player-row ${isActive?'active-player':''} ${isElim?'eliminated-row':''}\">\n        <div class=\"color-dot dot-${color}\"></div>\n        <div class=\"player-name-chess\">${p.name}${p.id===myId?' \u25c0':''}</div>\n        <div style=\"font-size:5px;color:${isActive?'var(--gold)':'var(--gray)'}\">\n          ${isElim?'\ud83d\udc80':isActive?'\u25cf':'\u25cb'}\n        </div>\n      </div>`;\n    }).join('');\n}\n\nfunction chessClick(r,c){\n  if(!roomData?.gameData) return;\n  const {board,colors,currentColorIdx,status}=roomData.gameData;\n  if(status!=='playing') return;\n  const activeColor=colors[currentColorIdx];\n  if(chessMyColor!==activeColor) return; // not my turn\n\n  const piece=board[r][c];\n\n  // If clicking a legal move destination\n  if(chessSelected && chessLegalMoves.some(m=>m.to[0]===r&&m.to[1]===c)){\n    sendWS({type:'chess_move',from:chessSelected,to:[r,c]});\n    chessSelected=null; chessLegalMoves=[];\n    renderChessBoard(); return;\n  }\n\n  // Select own piece\n  if(piece && piece.color===chessMyColor){\n    chessSelected=[r,c];\n    // Request legal moves from server or compute locally\n    sendWS({type:'chess_get_moves',from:[r,c]});\n  } else {\n    chessSelected=null; chessLegalMoves=[];\n    renderChessBoard();\n  }\n}\n\nfunction handleChessMoveResult(msg){\n  if(msg.legalMoves!==undefined){\n    chessLegalMoves=msg.legalMoves||[];\n    renderChessBoard(); return;\n  }\n  // Move applied\n  const log=document.getElementById('chess-move-log');\n  if(msg.notation){\n    const div=document.createElement('div');\n    div.textContent=msg.notation;\n    log.appendChild(div); log.scrollTop=log.scrollHeight;\n  }\n}\n\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n// MINESWEEPER\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nconst MINE_PIECES=[\n  {sym:'\u2654',name:'REY',val:0},{sym:'\u2655',name:'REINA',val:9},{sym:'\u2656',name:'TORRE',val:5},\n  {sym:'\u2657',name:'ALFIL',val:3},{sym:'\u2658',name:'CABALLO',val:3},{sym:'\u2659',name:'PE\u00d3N',val:1},\n  {sym:'\u265a',name:'REY',val:0},{sym:'\u265b',name:'REINA',val:9},{sym:'\u265c',name:'TORRE',val:5},\n  {sym:'\u265d',name:'ALFIL',val:3},{sym:'\u265e',name:'CABALLO',val:3},{sym:'\u265f',name:'PE\u00d3N',val:1},\n];\nfunction renderMine(){\n  if(!roomData?.gameData) return;\n  const d=roomData.gameData;\n  const curPlayer=roomData.players[roomData.currentPlayerIdx];\n  const isMyTurn=curPlayer?.id===myId;\n  document.getElementById('mine-turn').textContent=`TURNO: ${curPlayer?.name}${isMyTurn?' (T\u00da)':''}`;\n  const flags=d.board.filter(c=>c.flagged).length;\n  document.getElementById('mine-flags').textContent=`\ud83d\udea9 ${flags}/${d.bombs}`;\n  const grid=document.getElementById('mine-grid');\n  grid.style.gridTemplateColumns=`repeat(${d.cols},38px)`;\n  grid.innerHTML='';\n  d.board.forEach((cell,idx)=>{\n    const div=document.createElement('div');\n    div.className='mine-cell';\n    if(cell.revealed){\n      div.classList.add('revealed');\n      if(cell.isBomb){div.classList.add('mine-hit');div.textContent='\ud83d\udca3';}\n      else{const piece=d.pieceMap[idx];\n        if(piece){div.classList.add('safe-reveal');div.textContent=piece.sym;}\n        else if(cell.adj>0){div.classList.add(`num-${cell.adj}`);div.textContent=cell.adj;}}\n    }else if(cell.flagged){div.classList.add('flagged');div.textContent='\ud83d\udea9';}\n    if(isMyTurn){\n      div.addEventListener('click',()=>sendWS({type:'mine_click',idx}));\n      div.addEventListener('contextmenu',e=>{e.preventDefault();sendWS({type:'mine_flag',idx});});\n    }\n    grid.appendChild(div);\n  });\n  renderScores('mine-scores');\n}\n\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n// PUZZLE\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nfunction renderPuzzle(){\n  if(!roomData?.gameData) return;\n  const d=roomData.gameData;\n  const curPlayer=roomData.players[roomData.currentPlayerIdx];\n  const isMyTurn=curPlayer?.id===myId;\n  const placed=d.solution.filter(p=>p.placed).length;\n  document.getElementById('puzzle-turn').textContent=`TURNO: ${curPlayer?.name}${isMyTurn?' (T\u00da)':''}`;\n  document.getElementById('puzzle-prog').textContent=`PIEZAS: ${placed}/${d.total}`;\n  const area=document.getElementById('puzzle-area');\n  let boardHTML='<div><div class=\"puzzle-board\" style=\"grid-template-columns:repeat(8,44px)\">';\n  for(let r=0;r<8;r++) for(let c=0;c<8;c++){\n    const idx=r*8+c,isLight=(r+c)%2===0,pp=d.placed[idx];\n    boardHTML+=`<div class=\"puzzle-cell ${isLight?'light-sq':'dark-sq'}\" onclick=\"puzzlePlace(${idx})\">${pp?pp.sym:''}</div>`;\n  }\n  boardHTML+='</div></div>';\n  const remaining=d.solution.filter(p=>!p.placed);\n  let trayHTML='<div class=\"piece-tray\"><div style=\"font-size:5px;color:var(--gray);margin-bottom:6px\">PIEZAS</div>';\n  remaining.forEach(p=>{\n    const isSel=selectedPiece===p.id,dis=!isMyTurn;\n    trayHTML+=`<div class=\"tray-piece${isSel?' sel':''}${dis?' disabled':''}\" onclick=\"selectPiece(${p.id})\">${p.sym}</div>`;\n  });\n  trayHTML+='</div>';\n  area.innerHTML=boardHTML+trayHTML;\n  renderScores('puzzle-scores');\n}\nfunction selectPiece(id){\n  const cur=roomData?.players[roomData.currentPlayerIdx];\n  if(cur?.id!==myId) return;\n  selectedPiece=selectedPiece===id?null:id; renderPuzzle();\n}\nfunction puzzlePlace(boardIdx){\n  if(selectedPiece===null) return;\n  const cur=roomData?.players[roomData.currentPlayerIdx];\n  if(cur?.id!==myId) return;\n  sendWS({type:'puzzle_place',pieceId:selectedPiece,boardIdx}); selectedPiece=null;\n}\n\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n// GUESS\n// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nfunction renderGuess(){\n  if(!roomData?.gameData) return;\n  const d=roomData.gameData,q=d.currentQuestion;\n  if(!q) return;\n  document.getElementById('guess-round').textContent=`RONDA: ${d.round+1}/${d.totalRounds}`;\n  document.getElementById('guess-question').textContent='\u00bfCU\u00c1L PIEZA VALE M\u00c1S PUNTOS?';\n  const opts=document.getElementById('guess-opts');\n  opts.innerHTML=q.pieces.map((p,i)=>`\n    <div class=\"g-btn\" onclick=\"guessAns(${i})\">\n      <div style=\"font-size:26px;margin-bottom:5px\">${p.sym}</div>\n      <div>${p.name}</div>\n      <div class=\"piece-val\">${p.val===0?'INVALUABLE':p.val+' PTS'}</div>\n    </div>`).join('');\n  guessAnswered=false; clearInterval(guessTimerInterval); guessTimeLeft=10;\n  const timerEl=document.getElementById('guess-timer');\n  timerEl.classList.remove('urgent'); timerEl.textContent='10';\n  guessTimerInterval=setInterval(()=>{\n    guessTimeLeft--; timerEl.textContent=guessTimeLeft;\n    if(guessTimeLeft<=3) timerEl.classList.add('urgent');\n    if(guessTimeLeft<=0){clearInterval(guessTimerInterval);if(!guessAnswered){guessAnswered=true;sendWS({type:'guess_timeout'});}}\n  },1000);\n  updateStreak(d.streak); renderScores('guess-scores');\n}\nfunction guessAns(idx){\n  if(guessAnswered) return; guessAnswered=true; clearInterval(guessTimerInterval);\n  sendWS({type:'guess_answer',idx});\n}\nfunction revealGuessAnswer(correctIdx,wrongIdx){\n  document.querySelectorAll('.g-btn').forEach((b,i)=>{\n    b.classList.add('locked');\n    if(i===correctIdx) b.classList.add('correct-ans');\n    else if(i===wrongIdx) b.classList.add('wrong-ans');\n  });\n}\nfunction updateStreak(streak){\n  const bar=document.getElementById('streak-bar');\n  if(!bar) return;\n  bar.innerHTML=Array(5).fill(0).map((_,i)=>`<div class=\"streak-pip${i<streak?' lit':''}\"></div>`).join('');\n}\n\n// \u2500\u2500 GAME OVER \u2500\u2500\nfunction showGameOver(scores){\n  clearInterval(guessTimerInterval);\n  const medals=['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49','4\ufe0f\u20e3'];\n  const sorted=[...scores].sort((a,b)=>b.score-a.score);\n  document.getElementById('go-scores').innerHTML=sorted.map((p,i)=>`\n    <div class=\"score-row\">\n      <div class=\"score-name\"><span class=\"medal\">${medals[i]||''}</span> ${p.name}</div>\n      <div class=\"score-pts\">${p.score} PTS</div>\n    </div>`).join('');\n  document.getElementById('revancha-btn').style.display=isHost?'inline-block':'none';\n  showScreen('screen-gameover');\n}\n\n// \u2500\u2500 SCORES \u2500\u2500\nfunction renderScores(elId){\n  if(!roomData) return;\n  const el=document.getElementById(elId); if(!el) return;\n  el.innerHTML=roomData.players.map(p=>`\n    <div class=\"score-row\">\n      <div class=\"score-name\"><span class=\"conn-dot${p.connected===false?' off':''}\"></span>${p.name}</div>\n      <div class=\"score-pts\">${p.score} PTS</div>\n    </div>`).join('');\n}\n\n// \u2500\u2500 RESULT OVERLAY \u2500\u2500\nfunction queueResult(title,msg,pts){resultQueue.push({title,msg,pts});if(!showingResult)showNextResult();}\nfunction showNextResult(){\n  if(resultQueue.length===0){showingResult=false;return;}\n  showingResult=true;\n  const {title,msg,pts}=resultQueue.shift();\n  document.getElementById('res-title').textContent=title;\n  document.getElementById('res-msg').innerHTML=msg;\n  document.getElementById('res-pts').textContent=pts?`+${pts} PTS!`:'';\n  document.getElementById('result-overlay').classList.remove('hidden');\n}\nfunction closeResult(){\n  document.getElementById('result-overlay').classList.add('hidden');\n  setTimeout(showNextResult,200);\n}\n\n// \u2500\u2500 CHAT \u2500\u2500\nfunction appendChat(msg){\n  ['chat-msgs','chess-chat','mine-chat','puzzle-chat','guess-chat','go-chat'].forEach(id=>{\n    const el=document.getElementById(id); if(!el) return;\n    const div=document.createElement('div');\n    div.className=`chat-msg${msg.system?' system':''}`;\n    div.innerHTML=msg.system?`\u26a1 ${msg.msg}`:`<span class=\"chat-name\">${msg.playerName}:</span> ${msg.msg}`;\n    el.appendChild(div); el.scrollTop=el.scrollHeight;\n  });\n}\nfunction sendChat(){\n  const ids=['chat-input','chess-chat-input','mine-chat-input','puzzle-chat-input','guess-chat-input','go-chat-input'];\n  let msg='';\n  ids.forEach(id=>{const el=document.getElementById(id);if(el&&el.value.trim()){msg=el.value.trim();el.value='';}});\n  if(msg) sendWS({type:'chat',msg});\n}\n\n// \u2500\u2500 TOAST \u2500\u2500\nfunction showToast(msg,isError=false){\n  const t=document.createElement('div'); t.className=`toast${isError?' error':''}`;\n  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3500);\n}\n\n// \u2500\u2500 EVENTS \u2500\u2500\ndocument.getElementById('my-name').addEventListener('keydown',e=>{if(e.key==='Enter')createRoom();});\ndocument.getElementById('room-code-input').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom();});\ndocument.getElementById('room-code-input').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase();});\n['chat-input','chess-chat-input','mine-chat-input','puzzle-chat-input','guess-chat-input','go-chat-input'].forEach(id=>{\n  const el=document.getElementById(id);\n  if(el) el.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});\n});\n</script>\n</body>\n</html>";

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

const wss = new WebSocketServer({ server });
const rooms = new Map();
const clients = new Map();

function genCode(){ return Math.random().toString(36).substring(2,6).toUpperCase(); }
function genId(){ return crypto.randomUUID().slice(0,8); }
function broadcast(roomCode, msg, excludeWs=null){
  const room=rooms.get(roomCode); if(!room) return;
  const data=JSON.stringify(msg);
  room.players.forEach(p=>{if(p.ws!==excludeWs&&p.ws.readyState===WebSocket.OPEN)p.ws.send(data);});
}
function broadcastAll(roomCode,msg){ broadcast(roomCode,msg,null); }
function send(ws,msg){ if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function roomState(room){
  return { type:'room_state', room:{
    code:room.code, hostId:room.hostId, gameMode:room.gameMode,
    gameState:room.gameState, currentPlayerIdx:room.currentPlayerIdx,
    chessVariant:room.chessVariant||2,
    players:room.players.map(p=>({id:p.id,name:p.name,score:p.score,connected:p.ws.readyState===WebSocket.OPEN})),
    gameData:room.gameData
  }};
}

// ── PIECES for minigames ──
const PIECES=[
  {sym:'♔',name:'REY',val:0},{sym:'♕',name:'REINA',val:9},{sym:'♖',name:'TORRE',val:5},
  {sym:'♗',name:'ALFIL',val:3},{sym:'♘',name:'CABALLO',val:3},{sym:'♙',name:'PEÓN',val:1},
  {sym:'♚',name:'REY',val:0},{sym:'♛',name:'REINA',val:9},{sym:'♜',name:'TORRE',val:5},
  {sym:'♝',name:'ALFIL',val:3},{sym:'♞',name:'CABALLO',val:3},{sym:'♟',name:'PEÓN',val:1},
];
function initMinesweeper(){
  const rows=8,cols=8,bombs=10,total=rows*cols;
  const bombSet=new Set();
  while(bombSet.size<bombs) bombSet.add(Math.floor(Math.random()*total));
  const board=[],pieceMap=[];
  for(let i=0;i<total;i++){
    const isBomb=bombSet.has(i);
    board.push({isBomb,revealed:false,flagged:false,adj:0});
    pieceMap.push(isBomb?null:PIECES[Math.floor(Math.random()*PIECES.length)]);
  }
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const idx=r*cols+c; if(board[idx].isBomb) continue;
    let cnt=0;
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&board[nr*cols+nc].isBomb) cnt++;
    }
    board[idx].adj=cnt;
  }
  return {rows,cols,bombs,board,pieceMap};
}
function floodReveal(data,r,c){
  const {rows,cols,board,pieceMap}=data;
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
    const nr=r+dr,nc=c+dc;
    if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
    const ni=nr*cols+nc;
    if(board[ni].revealed||board[ni].flagged||board[ni].isBomb) continue;
    board[ni].revealed=true;
    if(board[ni].adj===0&&!pieceMap[ni]) floodReveal(data,nr,nc);
  }
}
function initPuzzle(){
  const solution=[
    {sym:'♔',pos:4,val:0},{sym:'♛',pos:27,val:9},{sym:'♜',pos:0,val:5},
    {sym:'♜',pos:7,val:5},{sym:'♝',pos:18,val:3},{sym:'♞',pos:42,val:3},
    {sym:'♙',pos:8,val:1},{sym:'♙',pos:9,val:1},{sym:'♟',pos:55,val:1},{sym:'♚',pos:60,val:0}
  ].map((p,i)=>({...p,id:i,placed:false}));
  return {solution,placed:Array(64).fill(null),total:solution.length};
}
function initGuess(){ return {round:0,totalRounds:10,streak:0,currentQuestion:null,answered:false}; }
function makeGuessQuestion(){
  const pool=PIECES.filter(p=>p.name!=='REY').sort(()=>Math.random()-.5).slice(0,3);
  const correctIdx=pool.reduce((best,p,i)=>p.val>pool[best].val?i:best,0);
  return {pieces:pool,correctIdx};
}

wss.on('connection', ws => {
  clients.set(ws, null);
  ws.on('message', raw => {
    let msg; try{ msg=JSON.parse(raw); } catch{ return; }
    const info=clients.get(ws);

    switch(msg.type){
      case 'create_room':{ const code=genCode(),playerId=genId();
        const room={code,hostId:playerId,gameMode:null,gameState:'lobby',currentPlayerIdx:0,chessVariant:2,
          players:[{id:playerId,name:msg.name||'HOST',score:0,ws}],gameData:null};
        rooms.set(code,room); clients.set(ws,{roomCode:code,playerId});
        send(ws,{type:'joined',playerId,roomCode:code,isHost:true}); send(ws,roomState(room)); break; }

      case 'join_room':{ const room=rooms.get(msg.code?.toUpperCase());
        if(!room){send(ws,{type:'error',msg:'Sala no encontrada'});return;}
        if(room.players.length>=4){send(ws,{type:'error',msg:'Sala llena'});return;}
        if(room.gameState!=='lobby'){send(ws,{type:'error',msg:'Partida en curso'});return;}
        const playerId=genId();
        room.players.push({id:playerId,name:msg.name||'PLAYER',score:0,ws});
        clients.set(ws,{roomCode:room.code,playerId});
        send(ws,{type:'joined',playerId,roomCode:room.code,isHost:false});
        broadcastAll(room.code,roomState(room));
        broadcast(room.code,{type:'chat',system:true,msg:`${msg.name} se unió!`},ws); break; }

      case 'set_game':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        room.gameMode=msg.mode; broadcastAll(room.code,roomState(room)); break; }

      case 'set_chess_variant':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        room.chessVariant=msg.variant; broadcastAll(room.code,roomState(room)); break; }

      case 'start_game':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        const variant=room.chessVariant||2;
        if(room.gameMode==='chess'&&room.players.length!==variant){
          send(ws,{type:'error',msg:`Necesitas exactamente ${variant} jugadores para esta variante`}); return;
        }
        if(room.players.length<2){send(ws,{type:'error',msg:'Necesitas 2+ jugadores'});return;}
        if(!room.gameMode){send(ws,{type:'error',msg:'Elige un modo'});return;}
        room.players.forEach(p=>p.score=0);
        room.currentPlayerIdx=0; room.gameState='playing';
        if(room.gameMode==='chess') room.gameData=initChessGame(variant);
        else if(room.gameMode==='minesweeper') room.gameData=initMinesweeper();
        else if(room.gameMode==='puzzle') room.gameData=initPuzzle();
        else { room.gameData=initGuess(); room.gameData.currentQuestion=makeGuessQuestion(); }
        broadcastAll(room.code,roomState(room));
        broadcastAll(room.code,{type:'game_started',mode:room.gameMode}); break; }

      case 'chess_get_moves':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing'||room.gameMode!=='chess') return;
        const gs=room.gameData;
        const [fr,fc]=msg.from;
        const piece=gs.board[fr][fc];
        if(!piece) return;
        const colorIdx=gs.colors.indexOf(piece.color);
        if(gs.colors[gs.currentColorIdx]!==piece.color) return;
        const curPlayerColorIdx=gs.colors.indexOf(piece.color);
        const playerForColor=room.players[curPlayerColorIdx];
        if(!playerForColor||playerForColor.id!==info.playerId) return;
        const legal=getLegalMoves(gs.board,fr,fc,gs.lastMove,gs.castlingRights);
        send(ws,{type:'chess_move_result',legalMoves:legal}); break; }

      case 'chess_move':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing'||room.gameMode!=='chess') return;
        const gs=room.gameData;
        const activeColor=gs.colors[gs.currentColorIdx];
        const playerForColor=room.players[gs.colors.indexOf(activeColor)];
        if(!playerForColor||playerForColor.id!==info.playerId){
          send(ws,{type:'error',msg:'No es tu turno'}); return;
        }
        const [fr,fc]=msg.from,[tr,tc]=msg.to;
        const result=chessMove(gs,fr,fc,tr,tc);
        if(!result.ok){send(ws,{type:'error',msg:result.error});return;}
        room.gameData=result.newState;
        room.currentPlayerIdx=result.newState.currentColorIdx;
        // Notation
        const p=gs.board[fr][fc];
        const notation=`${activeColor[0].toUpperCase()}: ${p?.type}${String.fromCharCode(97+fc)}${8-fr}→${String.fromCharCode(97+tc)}${8-tr}${result.captured?'x':''}`;
        broadcastAll(room.code,{type:'chess_state',gameData:room.gameData,currentPlayerIdx:room.currentPlayerIdx});
        broadcastAll(room.code,{type:'chess_move_result',notation});
        if(result.inCheck) broadcastAll(room.code,{type:'chess_check',color:gs.colors[result.newState.currentColorIdx]});
        if(result.checkmated) broadcastAll(room.code,{type:'chess_checkmate',winner:result.newState.winner});
        if(result.newEliminated.length>gs.eliminated.length){
          const newlyElim=result.newEliminated.filter(c=>!gs.eliminated.includes(c));
          newlyElim.forEach(c=>broadcastAll(room.code,{type:'chess_eliminated',color:c}));
        }
        if(result.newState.status==='finished'||result.newState.status==='draw'){
          room.gameState='finished';
          const scores=room.players.map((p,i)=>{
            const color=gs.colors[i];
            const isWinner=result.newState.winner===color;
            return {name:p.name,score:p.score+(isWinner?10:0)};
          });
          broadcastAll(room.code,{type:'game_over',scores});
        }
        break; }

      case 'mine_click':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const cur=room.players[room.currentPlayerIdx];
        if(cur.id!==info.playerId){send(ws,{type:'error',msg:'No es tu turno'});return;}
        const d=room.gameData,idx=msg.idx,cell=d.board[idx];
        if(cell.revealed||cell.flagged) return; cell.revealed=true;
        if(cell.isBomb){
          d.board.forEach(c=>{if(c.isBomb)c.revealed=true;});
          broadcastAll(room.code,{type:'mine_bomb',playerName:cur.name,idx});
          broadcastAll(room.code,roomState(room));
          setTimeout(()=>{d.board.forEach(c=>{if(c.isBomb)c.revealed=false;});
            room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;
            broadcastAll(room.code,roomState(room));},2000);
        }else{
          const piece=d.pieceMap[idx];
          if(cell.adj===0&&!piece) floodReveal(d,Math.floor(idx/d.cols),idx%d.cols);
          if(piece){const pts=piece.val===0?1:piece.val;cur.score+=pts;broadcastAll(room.code,{type:'mine_piece',playerName:cur.name,piece,pts,idx});}
          const allDone=d.board.every(c=>c.isBomb||c.revealed);
          broadcastAll(room.code,roomState(room));
          if(allDone){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else if(piece){room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;broadcastAll(room.code,roomState(room));}
        } break; }

      case 'mine_flag':{ if(!info) return; const room=rooms.get(info.roomCode); if(!room) return;
        const cell=room.gameData.board[msg.idx];
        if(!cell.revealed){cell.flagged=!cell.flagged;broadcastAll(room.code,roomState(room));} break; }

      case 'puzzle_place':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const cur=room.players[room.currentPlayerIdx];
        if(cur.id!==info.playerId){send(ws,{type:'error',msg:'No es tu turno'});return;}
        const d=room.gameData,piece=d.solution.find(p=>p.id===msg.pieceId&&!p.placed);
        if(!piece) return;
        if(msg.boardIdx===piece.pos){
          piece.placed=true;d.placed[msg.boardIdx]={sym:piece.sym};
          const pts=piece.val===0?1:piece.val;cur.score+=pts;
          broadcastAll(room.code,{type:'puzzle_correct',playerName:cur.name,piece,pts});
          const allPlaced=d.solution.every(p=>p.placed);
          broadcastAll(room.code,roomState(room));
          if(allPlaced){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else{room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;broadcastAll(room.code,roomState(room));}
        }else{
          broadcastAll(room.code,{type:'puzzle_wrong',playerName:cur.name});
          room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;
          broadcastAll(room.code,roomState(room));
        } break; }

      case 'guess_answer':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const d=room.gameData; if(d.answered) return; d.answered=true;
        const player=room.players.find(p=>p.id===info.playerId); if(!player) return;
        const {pieces,correctIdx}=d.currentQuestion;
        const isCorrect=msg.idx===correctIdx;
        if(isCorrect){d.streak++;const bonus=d.streak>=3?2:0;const pts=3+bonus;player.score+=pts;
          broadcastAll(room.code,{type:'guess_result',correct:true,playerName:player.name,pts,streak:d.streak,correctIdx,pieces});}
        else{d.streak=0;broadcastAll(room.code,{type:'guess_result',correct:false,playerName:player.name,pts:0,streak:0,correctIdx,pieces});}
        broadcastAll(room.code,roomState(room)); d.round++;
        setTimeout(()=>{
          if(d.round>=d.totalRounds){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else{d.answered=false;d.currentQuestion=makeGuessQuestion();broadcastAll(room.code,roomState(room));}
        },3000); break; }

      case 'guess_timeout':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const d=room.gameData; if(d.answered) return; d.answered=true; d.streak=0;
        const {correctIdx,pieces}=d.currentQuestion;
        broadcastAll(room.code,{type:'guess_timeout',correctIdx,pieces}); d.round++;
        setTimeout(()=>{
          if(d.round>=d.totalRounds){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else{d.answered=false;d.currentQuestion=makeGuessQuestion();broadcastAll(room.code,roomState(room));}
        },3000); break; }

      case 'new_round':{ if(!info) return; const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        room.players.forEach(p=>p.score=0);
        room.currentPlayerIdx=0;room.gameState='lobby';room.gameData=null;
        broadcastAll(room.code,roomState(room)); break; }

      case 'chat':{ if(!info) return; const room=rooms.get(info.roomCode); if(!room) return;
        const player=room.players.find(p=>p.id===info.playerId);
        broadcastAll(room.code,{type:'chat',playerName:player?.name,msg:msg.msg}); break; }
    }
  });
  ws.on('close', ()=>{
    const info=clients.get(ws);
    if(info){ const room=rooms.get(info.roomCode);
      if(room){ const p=room.players.find(p=>p.id===info.playerId);
        broadcast(room.code,{type:'chat',system:true,msg:`${p?.name} se desconectó`},ws);
        if(room.hostId===info.playerId&&room.players.length>1){
          const next=room.players.find(p=>p.id!==info.playerId); if(next) room.hostId=next.id;
        }
        room.players=room.players.filter(p=>p.id!==info.playerId);
        if(room.players.length===0) rooms.delete(info.roomCode);
        else broadcastAll(room.code,roomState(room));
      }
    }
    clients.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Chess Arcade running on port ${PORT}`));
