const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');

const HTML = "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Chess Arcade \u2013 Pixel Party</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap\" rel=\"stylesheet\">\n<style>\n*{box-sizing:border-box;margin:0;padding:0;image-rendering:pixelated}\n:root{\n  --dark:#0a0a1a;--darker:#050510;--gold:#f0c040;--gold2:#d4a520;\n  --green:#40e040;--red:#e04040;--blue:#4080ff;--cyan:#40e0e0;\n  --white:#e8e8f0;--gray:#606080;--panel:#111128;--border:#303060;--hover:#202048;\n}\nbody{background:var(--dark);font-family:'Press Start 2P',monospace;color:var(--white);min-height:100vh;overflow-x:hidden}\n.scanlines{position:fixed;inset:0;pointer-events:none;z-index:1000;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px)}\n\n/* HEADER */\n.header{text-align:center;padding:18px 16px 12px;background:linear-gradient(180deg,#050510,var(--dark));border-bottom:3px solid var(--gold);position:relative}\n.title-main{font-size:13px;color:var(--gold);text-shadow:0 0 12px rgba(240,192,64,.6),2px 2px 0 #000;animation:pulse 2s infinite}\n.title-sub{font-size:7px;color:var(--cyan);margin-top:6px;letter-spacing:4px}\n@keyframes pulse{0%,100%{text-shadow:0 0 10px rgba(240,192,64,.6),2px 2px 0 #000}50%{text-shadow:0 0 22px rgba(240,192,64,.9),2px 2px 0 #000}}\n\n/* SCREENS */\n.screen{display:none}.screen.active{display:block}\n.page{max-width:700px;margin:0 auto;padding:16px}\n\n/* BUTTONS */\n.btn{font-family:'Press Start 2P',monospace;cursor:pointer;border:none;outline:none;padding:10px 14px;font-size:7px;letter-spacing:1px;transition:transform .1s,box-shadow .1s;position:relative}\n.btn:active{transform:translateY(2px)}\n.btn-gold{background:var(--gold);color:#000;box-shadow:0 4px 0 var(--gold2),4px 4px 0 #000}\n.btn-gold:hover{transform:translateY(-2px);box-shadow:0 6px 0 var(--gold2),6px 6px 0 #000}\n.btn-blue{background:var(--blue);color:#fff;box-shadow:0 4px 0 #2060cc,4px 4px 0 #000}\n.btn-blue:hover{transform:translateY(-2px);box-shadow:0 6px 0 #2060cc,6px 6px 0 #000}\n.btn-green{background:var(--green);color:#000;box-shadow:0 4px 0 #20a020,4px 4px 0 #000}\n.btn-green:hover{transform:translateY(-2px);box-shadow:0 6px 0 #20a020,6px 6px 0 #000}\n.btn-red{background:var(--red);color:#fff;box-shadow:0 4px 0 #902020,4px 4px 0 #000}\n.btn-sm{padding:7px 10px;font-size:6px}\n.btn-xs{padding:5px 8px;font-size:5px}\n\n/* INPUTS */\n.pixel-input{background:var(--darker);border:2px solid var(--border);color:var(--white);font-family:'Press Start 2P',monospace;font-size:8px;padding:9px;width:100%;outline:none}\n.pixel-input:focus{border-color:var(--gold)}\n.pixel-input.input-sm{font-size:7px;padding:7px}\n\n/* CARDS */\n.card{background:var(--panel);border:2px solid var(--border);padding:14px}\n.card-gold{border-color:var(--gold)}\n.section-title{font-size:7px;color:var(--gold);margin-bottom:10px;display:flex;align-items:center;gap:8px}\n.section-title::after{content:'';flex:1;height:2px;background:var(--border)}\n\n/* LOBBY */\n.game-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}\n.game-card{background:var(--panel);border:2px solid var(--border);padding:12px 8px;cursor:pointer;text-align:center;transition:all .1s;position:relative}\n.game-card:hover{border-color:var(--gold);background:var(--hover);transform:translateY(-2px)}\n.game-card.selected{border-color:var(--green)}\n.game-icon{font-size:24px;display:block;margin-bottom:8px}\n.game-name{font-size:5px;color:var(--gold);margin-bottom:4px;line-height:1.6}\n.game-desc{font-size:4px;color:var(--gray);line-height:1.8}\n\n.players-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}\n.player-card{background:var(--darker);border:2px solid var(--border);padding:10px;position:relative}\n.player-card.me{border-color:var(--cyan)}\n.player-card.host{border-color:var(--gold)}\n.p-num{font-size:5px;color:var(--gray);margin-bottom:4px}\n.p-name{font-size:8px;color:var(--white)}\n.p-score{font-size:10px;color:var(--gold);margin-top:4px}\n.p-badge{position:absolute;top:5px;right:6px;font-size:8px}\n.waiting-dot{display:inline-block;animation:blink 1s step-end infinite;color:var(--green)}\n@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}\n\n/* ROOM CODE DISPLAY */\n.room-code-display{background:var(--darker);border:3px solid var(--gold);padding:14px;text-align:center;margin:12px 0}\n.room-code-label{font-size:6px;color:var(--gray);margin-bottom:8px}\n.room-code-value{font-size:24px;color:var(--gold);letter-spacing:8px;text-shadow:0 0 12px rgba(240,192,64,.5)}\n.room-code-hint{font-size:5px;color:var(--gray);margin-top:8px}\n\n/* STATUS BAR */\n.status-bar{background:var(--panel);border-top:2px solid var(--border);border-bottom:2px solid var(--border);padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-size:6px;margin-bottom:10px}\n.status-turn{color:var(--cyan)}.status-info{color:var(--gray)}\n\n/* MINESWEEPER */\n.mine-wrap{display:flex;justify-content:center;overflow-x:auto;padding:4px 0}\n.mine-grid{display:inline-grid;gap:2px}\n.mine-cell{width:38px;height:38px;background:var(--panel);border:2px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;font-family:'VT323',monospace;user-select:none;transition:background .1s}\n.mine-cell:hover:not(.revealed):not(.flagged){background:var(--hover);border-color:var(--gold)}\n.mine-cell.revealed{background:var(--darker);border-color:#1a1a3a;cursor:default}\n.mine-cell.flagged{background:var(--panel)}\n.mine-cell.mine-hit{background:var(--red)}\n.mine-cell.safe-reveal{background:#0a2a0a;border-color:var(--green)}\n.num-1{color:#40a0ff}.num-2{color:#40e040}.num-3{color:#e04040}.num-4{color:#8040ff}\n.num-5{color:#ff8040}.num-6{color:#40e0e0}.num-7{color:#e0e040}.num-8{color:var(--white)}\n\n/* PUZZLE */\n.puzzle-area{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}\n.puzzle-board{display:inline-grid}\n.puzzle-cell{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;user-select:none;transition:all .15s;border:1px solid transparent}\n.puzzle-cell.light-sq{background:#c8a76a}.puzzle-cell.dark-sq{background:#8b6040}\n.puzzle-cell:hover{filter:brightness(1.3);z-index:2}\n.puzzle-cell.selected-sq{outline:3px solid var(--gold);z-index:3}\n.puzzle-cell.correct-cell{outline:3px solid var(--green);background:rgba(64,224,64,.25)!important}\n.puzzle-cell.wrong-cell{outline:3px solid var(--red)}\n.piece-tray{background:var(--panel);border:2px solid var(--border);padding:10px;min-width:60px}\n.tray-piece{width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;border:2px solid var(--border);margin-bottom:6px;background:var(--darker);transition:all .1s}\n.tray-piece:hover{border-color:var(--gold);background:var(--hover)}\n.tray-piece.sel{border-color:var(--green);background:#0a200a}\n.tray-piece.disabled{opacity:.3;pointer-events:none}\n\n/* GUESS */\n.guess-wrap{text-align:center;padding:0 8px}\n.guess-timer{font-size:20px;color:var(--gold);animation:timerPulse 1s infinite;margin:6px 0}\n.guess-timer.urgent{color:var(--red);animation:timerPulse .4s infinite}\n@keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.6}}\n.guess-question{font-size:7px;color:var(--cyan);margin:6px 0;line-height:1.8}\n.guess-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:500px;margin:10px auto}\n.g-btn{background:var(--panel);border:2px solid var(--border);padding:10px 6px;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:5px;color:var(--white);transition:all .1s;text-align:center}\n.g-btn:hover:not(.locked){border-color:var(--gold);background:var(--hover)}\n.g-btn.locked{cursor:default}\n.g-btn.correct-ans{border-color:var(--green);background:#0a200a;color:var(--green)}\n.g-btn.wrong-ans{border-color:var(--red);background:#200a0a;color:var(--red)}\n.piece-val{font-size:9px;color:var(--cyan);margin-top:4px}\n.streak-bar{display:flex;gap:4px;justify-content:center;margin:6px 0}\n.streak-pip{width:12px;height:12px;background:var(--border)}\n.streak-pip.lit{background:var(--gold);box-shadow:0 0 6px rgba(240,192,64,.7)}\n.round-info{font-size:7px;color:var(--gray);text-align:center;margin-top:6px}\n\n/* CHAT */\n.chat-wrap{display:flex;flex-direction:column;height:120px;background:var(--darker);border:2px solid var(--border);margin-top:10px}\n.chat-msgs{flex:1;overflow-y:auto;padding:6px;font-size:5px;line-height:2}\n.chat-msg{color:var(--gray)}.chat-msg .chat-name{color:var(--cyan)}.chat-msg.system{color:var(--gold)}\n.chat-input-row{display:flex;border-top:2px solid var(--border)}\n.chat-in{flex:1;background:transparent;border:none;color:var(--white);font-family:'Press Start 2P',monospace;font-size:5px;padding:6px;outline:none}\n.chat-send{background:var(--border);border:none;color:var(--white);font-family:'Press Start 2P',monospace;font-size:5px;padding:6px 10px;cursor:pointer}\n.chat-send:hover{background:var(--gold);color:#000}\n\n/* SCORES */\n.score-table{width:100%;background:var(--panel);border:2px solid var(--border);margin-top:10px}\n.score-row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--border);font-size:6px}\n.score-row:last-child{border-bottom:none}\n.score-name{color:var(--white)}.score-pts{color:var(--gold)}\n\n/* TOAST */\n.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--panel);border:2px solid var(--gold);padding:10px 16px;font-size:7px;z-index:900;animation:toastIn .2s ease;max-width:90%;text-align:center}\n.toast.error{border-color:var(--red)}\n@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}\n\n/* OVERLAY RESULT */\n.result-overlay{position:fixed;inset:0;background:rgba(0,0,10,.88);z-index:500;display:flex;align-items:center;justify-content:center}\n.result-box{background:var(--panel);border:3px solid var(--gold);padding:24px;max-width:340px;width:90%;text-align:center}\n.result-title{font-size:11px;color:var(--gold);margin-bottom:12px}\n.result-msg{font-size:7px;color:var(--white);line-height:2.2;margin-bottom:10px}\n.result-pts{font-size:22px;color:var(--green);margin:6px 0}\n\n/* MISC */\n.flex-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.mt8{margin-top:8px}.mt12{margin-top:12px}.mb12{margin-bottom:12px}\n.text-center{text-align:center}.hidden{display:none}\n.instructions{background:var(--darker);border:1px solid var(--border);padding:8px;font-size:5px;color:var(--gray);line-height:2.2;margin-bottom:10px}\n.final-scores-list{margin:12px 0}\n.medal{font-size:14px}\n.conn-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:4px;box-shadow:0 0 6px var(--green)}\n.conn-dot.off{background:var(--red);box-shadow:0 0 6px var(--red)}\n</style>\n</head>\n<body>\n<div class=\"scanlines\"></div>\n\n<div class=\"header\">\n  <div class=\"title-main\">\u265f CHESS ARCADE \u265f</div>\n  <div class=\"title-sub\">PIXEL PARTY \u2014 ONLINE</div>\n</div>\n\n<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCREEN: MENU \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n<div id=\"screen-menu\" class=\"screen active\">\n  <div class=\"page\" style=\"max-width:420px\">\n    <div style=\"margin:20px 0 16px;text-align:center;font-size:8px;color:var(--gray)\">INGRESA TU NOMBRE</div>\n    <input class=\"pixel-input\" id=\"my-name\" placeholder=\"TU NOMBRE...\" maxlength=\"12\" style=\"margin-bottom:14px\">\n    \n    <div class=\"section-title\">\u25b6 CREAR SALA</div>\n    <button class=\"btn btn-gold\" style=\"width:100%;margin-bottom:16px\" onclick=\"createRoom()\">\u2726 CREAR NUEVA SALA</button>\n    \n    <div class=\"section-title\">\u25b6 UNIRSE</div>\n    <div class=\"flex-row mb12\">\n      <input class=\"pixel-input input-sm\" id=\"room-code-input\" placeholder=\"C\u00d3DIGO (ej: AB3X)\" maxlength=\"4\" style=\"flex:1;text-transform:uppercase\">\n      <button class=\"btn btn-blue btn-sm\" onclick=\"joinRoom()\">ENTRAR</button>\n    </div>\n    \n    <div style=\"font-size:5px;color:var(--gray);text-align:center;line-height:2;margin-top:20px\">\n      2\u20134 jugadores \u00b7 Buscaminas \u00b7 Rompecabezas \u00b7 Adivina la Pieza\n    </div>\n  </div>\n</div>\n\n<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCREEN: LOBBY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n<div id=\"screen-lobby\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"room-code-display\">\n      <div class=\"room-code-label\">C\u00d3DIGO DE SALA \u2014 COMPARTE CON TUS AMIGOS</div>\n      <div class=\"room-code-value\" id=\"lobby-code\">----</div>\n      <div class=\"room-code-hint\">Todos ingresan este c\u00f3digo en el men\u00fa</div>\n    </div>\n\n    <div class=\"section-title\">\u25b6 JUGADORES <span id=\"lobby-count\" style=\"font-size:5px;color:var(--gray)\">(0/4)</span></div>\n    <div class=\"players-list\" id=\"lobby-players\"></div>\n\n    <div id=\"host-controls\" class=\"hidden\">\n      <div class=\"section-title\">\u25b6 MODO DE JUEGO</div>\n      <div class=\"game-cards\">\n        <div class=\"game-card\" onclick=\"setMode('minesweeper')\">\n          <span class=\"game-icon\">\ud83d\udca3</span>\n          <div class=\"game-name\">BUSCAMINAS</div>\n          <div class=\"game-desc\">Turnos, piezas ocultas, evita bombas</div>\n        </div>\n        <div class=\"game-card\" onclick=\"setMode('puzzle')\">\n          <span class=\"game-icon\">\ud83e\udde9</span>\n          <div class=\"game-name\">ROMPECABEZAS</div>\n          <div class=\"game-desc\">Coloca piezas en posici\u00f3n correcta</div>\n        </div>\n        <div class=\"game-card\" onclick=\"setMode('guess')\">\n          <span class=\"game-icon\">\ud83c\udfaf</span>\n          <div class=\"game-name\">ADIVINA</div>\n          <div class=\"game-desc\">\u00bfCu\u00e1l vale m\u00e1s? \u00a1S\u00e9 el primero!</div>\n        </div>\n      </div>\n      <button class=\"btn btn-gold\" style=\"width:100%;margin-top:8px\" id=\"start-btn\" onclick=\"startGame()\">\u25b6 INICIAR PARTIDA</button>\n    </div>\n    <div id=\"guest-waiting\" class=\"hidden\" style=\"text-align:center;font-size:7px;color:var(--gray);margin-top:10px\">\n      Esperando al host<span class=\"waiting-dot\">...</span>\n    </div>\n\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"chat-msgs\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"chat-input\" placeholder=\"Escribe un mensaje...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n\n    <div class=\"mt8 text-center\">\n      <button class=\"btn btn-red btn-xs\" onclick=\"leaveRoom()\">\u25c0 SALIR</button>\n    </div>\n  </div>\n</div>\n\n<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCREEN: MINESWEEPER \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n<div id=\"screen-minesweeper\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"mine-turn\">TURNO: ---</div>\n      <div class=\"status-info\" id=\"mine-flags\">\ud83d\udea9 0/10</div>\n    </div>\n    <div class=\"instructions\">\n      CLICK: revelar \u00b7 CLICK DERECHO: bandera \ud83d\udea9 \u00b7 Piezas dan puntos \u00b7 \u00a1Bombas pasan turno!\n    </div>\n    <div class=\"mine-wrap\"><div id=\"mine-grid\" class=\"mine-grid\"></div></div>\n    <div class=\"score-table mt8\" id=\"mine-scores\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"mine-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"mine-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCREEN: PUZZLE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n<div id=\"screen-puzzle\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"puzzle-turn\">TURNO: ---</div>\n      <div class=\"status-info\" id=\"puzzle-prog\">PIEZAS: 0/10</div>\n    </div>\n    <div class=\"instructions\">\n      Selecciona una pieza \u2192 Haz clic en su casilla correcta del tablero\n    </div>\n    <div class=\"puzzle-area\" id=\"puzzle-area\"></div>\n    <div class=\"score-table mt8\" id=\"puzzle-scores\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"puzzle-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"puzzle-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCREEN: GUESS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n<div id=\"screen-guess\" class=\"screen\">\n  <div class=\"page\">\n    <div class=\"status-bar\">\n      <div class=\"status-turn\" id=\"guess-round\">RONDA: 1/10</div>\n      <div class=\"status-info\">\u00a1Primero en responder gana!</div>\n    </div>\n    <div class=\"instructions\">\n      \u00bfQu\u00e9 pieza vale m\u00e1s? Toca r\u00e1pido. Racha de 3+ = bonus de +2 pts.\n    </div>\n    <div class=\"guess-wrap\">\n      <div class=\"guess-timer\" id=\"guess-timer\">10</div>\n      <div class=\"guess-question\" id=\"guess-question\">CARGANDO...</div>\n      <div class=\"streak-bar\" id=\"streak-bar\"></div>\n      <div class=\"guess-opts\" id=\"guess-opts\"></div>\n      <div class=\"round-info\" id=\"guess-round-info\"></div>\n    </div>\n    <div class=\"score-table mt8\" id=\"guess-scores\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"guess-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"guess-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCREEN: GAME OVER \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n<div id=\"screen-gameover\" class=\"screen\">\n  <div class=\"page\" style=\"text-align:center\">\n    <div style=\"font-size:13px;color:var(--gold);margin:16px 0\">\ud83c\udfc6 RESULTADOS</div>\n    <div id=\"go-scores\" class=\"final-scores-list\"></div>\n    <div class=\"chat-wrap mt8\">\n      <div class=\"chat-msgs\" id=\"go-chat\"></div>\n      <div class=\"chat-input-row\">\n        <input class=\"chat-in\" id=\"go-chat-input\" placeholder=\"Chat...\" maxlength=\"60\">\n        <button class=\"chat-send\" onclick=\"sendChat()\">\u00bb</button>\n      </div>\n    </div>\n    <div class=\"flex-row mt12\" style=\"justify-content:center;gap:10px\">\n      <button class=\"btn btn-blue btn-sm\" id=\"revancha-btn\" onclick=\"newRound()\" style=\"display:none\">\u21ba REVANCHA (HOST)</button>\n      <button class=\"btn btn-red btn-sm\" onclick=\"leaveRoom()\">\u25c0 SALIR</button>\n    </div>\n  </div>\n</div>\n\n<!-- RESULT OVERLAY -->\n<div id=\"result-overlay\" class=\"result-overlay hidden\">\n  <div class=\"result-box\">\n    <div class=\"result-title\" id=\"res-title\"></div>\n    <div class=\"result-msg\" id=\"res-msg\"></div>\n    <div class=\"result-pts\" id=\"res-pts\"></div>\n    <button class=\"btn btn-gold btn-sm\" onclick=\"closeResult()\">OK \u25b6</button>\n  </div>\n</div>\n\n<script>\n// \u2500\u2500\u2500 STATE \u2500\u2500\u2500\nlet ws = null;\nlet myId = null;\nlet myName = '';\nlet roomCode = null;\nlet isHost = false;\nlet roomData = null;\nlet selectedMode = null;\nlet selectedPiece = null;\nlet guessTimerInterval = null;\nlet guessTimeLeft = 10;\nlet guessAnswered = false;\nlet resultQueue = [];\nlet showingResult = false;\n\n// \u2500\u2500\u2500 WS CONNECTION \u2500\u2500\u2500\nfunction connect(cb) {\n  const proto = location.protocol === 'https:' ? 'wss' : 'ws';\n  ws = new WebSocket(`${proto}://${location.host}`);\n  ws.onopen = cb;\n  ws.onmessage = e => handleMsg(JSON.parse(e.data));\n  ws.onclose = () => showToast('Conexi\u00f3n perdida. Recarga la p\u00e1gina.', true);\n  ws.onerror = () => showToast('Error de conexi\u00f3n', true);\n}\n\nfunction send(msg) {\n  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));\n}\n\n// \u2500\u2500\u2500 MESSAGE HANDLER \u2500\u2500\u2500\nfunction handleMsg(msg) {\n  switch(msg.type) {\n    case 'joined':\n      myId = msg.playerId;\n      roomCode = msg.roomCode;\n      isHost = msg.isHost;\n      document.getElementById('lobby-code').textContent = roomCode;\n      showScreen('screen-lobby');\n      break;\n\n    case 'room_state':\n      roomData = msg.room;\n      renderLobby();\n      if (roomData.gameState === 'playing') {\n        renderGameState();\n      }\n      break;\n\n    case 'game_started':\n      renderGameState();\n      break;\n\n    case 'mine_bomb':\n      queueResult('\ud83d\udca5 \u00a1BOMBA!', `${msg.playerName} pis\u00f3 una mina. Turno perdido.`, 0);\n      break;\n\n    case 'mine_piece':\n      queueResult(`${msg.piece.sym} \u00a1${msg.piece.name}!`, `${msg.playerName} encontr\u00f3 un ${msg.piece.name}!`, msg.pts);\n      break;\n\n    case 'puzzle_correct':\n      queueResult(`${msg.piece.sym} \u00a1CORRECTO!`, `${msg.playerName} coloc\u00f3 la pieza correctamente!`, msg.pts);\n      break;\n\n    case 'puzzle_wrong':\n      queueResult('\u274c INCORRECTO', `${msg.playerName} fall\u00f3 la posici\u00f3n. Turno pasa.`, 0);\n      break;\n\n    case 'guess_result':\n      clearInterval(guessTimerInterval);\n      guessAnswered = true;\n      revealGuessAnswer(msg.correctIdx, msg.correct ? null : -1);\n      if (msg.correct) {\n        queueResult('\u2705 \u00a1CORRECTO!', `${msg.playerName} respondi\u00f3 primero! ${msg.streak >= 3 ? '\ud83d\udd25 RACHA x'+msg.streak : ''}`, msg.pts);\n      } else {\n        queueResult('\u274c INCORRECTO', `${msg.playerName} fall\u00f3.`, 0);\n      }\n      updateStreak(msg.streak);\n      break;\n\n    case 'guess_timeout':\n      clearInterval(guessTimerInterval);\n      guessAnswered = true;\n      revealGuessAnswer(msg.correctIdx, -1);\n      queueResult('\u23f1 TIEMPO!', 'Nadie respondi\u00f3 a tiempo.', 0);\n      break;\n\n    case 'game_over':\n      clearInterval(guessTimerInterval);\n      setTimeout(() => showGameOver(msg.scores), 500);\n      break;\n\n    case 'error':\n      showToast(msg.msg, true);\n      break;\n\n    case 'chat':\n      appendChat(msg);\n      break;\n  }\n}\n\n// \u2500\u2500\u2500 SCREENS \u2500\u2500\u2500\nfunction showScreen(id) {\n  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));\n  document.getElementById(id).classList.add('active');\n}\n\nfunction renderGameState() {\n  if (!roomData) return;\n  const mode = roomData.gameMode;\n  if (mode === 'minesweeper') { showScreen('screen-minesweeper'); renderMine(); }\n  else if (mode === 'puzzle') { showScreen('screen-puzzle'); renderPuzzle(); }\n  else if (mode === 'guess') { showScreen('screen-guess'); renderGuess(); }\n}\n\n// \u2500\u2500\u2500 MENU ACTIONS \u2500\u2500\u2500\nfunction createRoom() {\n  myName = document.getElementById('my-name').value.trim().toUpperCase() || 'PLAYER1';\n  connect(() => send({ type: 'create_room', name: myName }));\n}\n\nfunction joinRoom() {\n  myName = document.getElementById('my-name').value.trim().toUpperCase() || 'PLAYER';\n  const code = document.getElementById('room-code-input').value.trim().toUpperCase();\n  if (!code) { showToast('Ingresa un c\u00f3digo de sala', true); return; }\n  connect(() => send({ type: 'join_room', name: myName, code }));\n}\n\nfunction leaveRoom() {\n  if (ws) ws.close();\n  ws = null; myId = null; roomCode = null; isHost = false; roomData = null;\n  showScreen('screen-menu');\n}\n\n// \u2500\u2500\u2500 LOBBY \u2500\u2500\u2500\nfunction renderLobby() {\n  if (!roomData) return;\n  const { players, hostId, gameMode, gameState } = roomData;\n  \n  document.getElementById('lobby-count').textContent = `(${players.length}/4)`;\n  \n  const medals = ['\ud83d\udc51','\ud83e\udd48','\ud83e\udd49','4\ufe0f\u20e3'];\n  document.getElementById('lobby-players').innerHTML = players.map((p,i) => `\n    <div class=\"player-card ${p.id===myId?'me':''} ${p.id===hostId?'host':''}\">\n      <div class=\"p-num\">JUGADOR ${i+1}</div>\n      <div class=\"p-name\">${p.name}${p.id===myId?' \u25c0':''}</div>\n      <div class=\"p-score\">${p.score} PTS</div>\n      <div class=\"p-badge\">${p.id===hostId?'\ud83d\udc51':''}</div>\n    </div>\n  `).join('');\n\n  if (isHost) {\n    document.getElementById('host-controls').classList.remove('hidden');\n    document.getElementById('guest-waiting').classList.add('hidden');\n    document.querySelectorAll('.game-card').forEach((c,i) => {\n      c.classList.toggle('selected', ['minesweeper','puzzle','guess'][i] === gameMode);\n    });\n    const canStart = players.length >= 2 && gameMode;\n    const btn = document.getElementById('start-btn');\n    btn.style.opacity = canStart ? '1' : '0.4';\n    btn.style.pointerEvents = canStart ? 'auto' : 'none';\n  } else {\n    document.getElementById('host-controls').classList.add('hidden');\n    document.getElementById('guest-waiting').classList.remove('hidden');\n  }\n}\n\nfunction setMode(mode) {\n  selectedMode = mode;\n  send({ type: 'set_game', mode });\n}\n\nfunction startGame() {\n  send({ type: 'start_game' });\n}\n\nfunction newRound() {\n  send({ type: 'new_round' });\n  showScreen('screen-lobby');\n}\n\n// \u2500\u2500\u2500 MINESWEEPER \u2500\u2500\u2500\nfunction renderMine() {\n  if (!roomData?.gameData) return;\n  const d = roomData.gameData;\n  const curPlayer = roomData.players[roomData.currentPlayerIdx];\n  const isMyTurn = curPlayer?.id === myId;\n\n  document.getElementById('mine-turn').textContent = `TURNO: ${curPlayer?.name}${isMyTurn?' (T\u00da)':''}`;\n  const flags = d.board.filter(c=>c.flagged).length;\n  document.getElementById('mine-flags').textContent = `\ud83d\udea9 ${flags}/${d.bombs}`;\n\n  const grid = document.getElementById('mine-grid');\n  grid.style.gridTemplateColumns = `repeat(${d.cols},38px)`;\n  grid.innerHTML = '';\n\n  d.board.forEach((cell, idx) => {\n    const div = document.createElement('div');\n    div.className = 'mine-cell';\n    if (cell.revealed) {\n      div.classList.add('revealed');\n      if (cell.isBomb) { div.classList.add('mine-hit'); div.textContent = '\ud83d\udca3'; }\n      else {\n        const piece = d.pieceMap[idx];\n        if (piece) { div.classList.add('safe-reveal'); div.textContent = piece.sym; }\n        else if (cell.adj > 0) { div.classList.add(`num-${cell.adj}`); div.textContent = cell.adj; }\n      }\n    } else if (cell.flagged) {\n      div.classList.add('flagged'); div.textContent = '\ud83d\udea9';\n    }\n    if (isMyTurn) {\n      div.addEventListener('click', () => send({ type: 'mine_click', idx }));\n      div.addEventListener('contextmenu', e => { e.preventDefault(); send({ type: 'mine_flag', idx }); });\n    }\n    grid.appendChild(div);\n  });\n\n  renderScores('mine-scores');\n}\n\n// \u2500\u2500\u2500 PUZZLE \u2500\u2500\u2500\nfunction renderPuzzle() {\n  if (!roomData?.gameData) return;\n  const d = roomData.gameData;\n  const curPlayer = roomData.players[roomData.currentPlayerIdx];\n  const isMyTurn = curPlayer?.id === myId;\n  const placed = d.solution.filter(p=>p.placed).length;\n\n  document.getElementById('puzzle-turn').textContent = `TURNO: ${curPlayer?.name}${isMyTurn?' (T\u00da)':''}`;\n  document.getElementById('puzzle-prog').textContent = `PIEZAS: ${placed}/${d.total}`;\n\n  const area = document.getElementById('puzzle-area');\n  \n  let boardHTML = '<div><div class=\"puzzle-board\" style=\"grid-template-columns:repeat(8,44px)\">';\n  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {\n    const idx=r*8+c;\n    const isLight=(r+c)%2===0;\n    const placedPiece=d.placed[idx];\n    boardHTML += `<div class=\"puzzle-cell ${isLight?'light-sq':'dark-sq'}\" data-idx=\"${idx}\" onclick=\"puzzlePlace(${idx})\">${placedPiece?placedPiece.sym:''}</div>`;\n  }\n  boardHTML += '</div></div>';\n\n  const remaining = d.solution.filter(p=>!p.placed);\n  let trayHTML = '<div class=\"piece-tray\"><div style=\"font-size:5px;color:var(--gray);margin-bottom:6px\">PIEZAS</div>';\n  remaining.forEach(p => {\n    const isSel = selectedPiece===p.id;\n    const dis = !isMyTurn;\n    trayHTML += `<div class=\"tray-piece${isSel?' sel':''}${dis?' disabled':''}\" onclick=\"selectPiece(${p.id})\">${p.sym}</div>`;\n  });\n  trayHTML += '</div>';\n\n  area.innerHTML = boardHTML + trayHTML;\n  renderScores('puzzle-scores');\n}\n\nfunction selectPiece(id) {\n  const curPlayer = roomData?.players[roomData.currentPlayerIdx];\n  if (curPlayer?.id !== myId) return;\n  selectedPiece = selectedPiece === id ? null : id;\n  renderPuzzle();\n}\n\nfunction puzzlePlace(boardIdx) {\n  if (selectedPiece === null) return;\n  const curPlayer = roomData?.players[roomData.currentPlayerIdx];\n  if (curPlayer?.id !== myId) return;\n  send({ type: 'puzzle_place', pieceId: selectedPiece, boardIdx });\n  selectedPiece = null;\n}\n\n// \u2500\u2500\u2500 GUESS \u2500\u2500\u2500\nfunction renderGuess() {\n  if (!roomData?.gameData) return;\n  const d = roomData.gameData;\n  const q = d.currentQuestion;\n  if (!q) return;\n\n  document.getElementById('guess-round').textContent = `RONDA: ${d.round+1}/${d.totalRounds}`;\n  document.getElementById('guess-question').textContent = '\u00bfCU\u00c1L PIEZA VALE M\u00c1S PUNTOS?';\n\n  const opts = document.getElementById('guess-opts');\n  opts.innerHTML = q.pieces.map((p,i) => `\n    <div class=\"g-btn\" onclick=\"guessAns(${i})\">\n      <div style=\"font-size:26px;margin-bottom:5px\">${p.sym}</div>\n      <div>${p.name}</div>\n      <div class=\"piece-val\">${p.val===0?'INVALUABLE':p.val+' PTS'}</div>\n    </div>\n  `).join('');\n\n  guessAnswered = false;\n  clearInterval(guessTimerInterval);\n  guessTimeLeft = 10;\n  const timerEl = document.getElementById('guess-timer');\n  timerEl.classList.remove('urgent');\n  timerEl.textContent = '10';\n\n  guessTimerInterval = setInterval(() => {\n    guessTimeLeft--;\n    timerEl.textContent = guessTimeLeft;\n    if (guessTimeLeft <= 3) timerEl.classList.add('urgent');\n    if (guessTimeLeft <= 0) {\n      clearInterval(guessTimerInterval);\n      if (!guessAnswered) { guessAnswered = true; send({ type: 'guess_timeout' }); }\n    }\n  }, 1000);\n\n  updateStreak(d.streak);\n  renderScores('guess-scores');\n}\n\nfunction guessAns(idx) {\n  if (guessAnswered) return;\n  guessAnswered = true;\n  clearInterval(guessTimerInterval);\n  send({ type: 'guess_answer', idx });\n}\n\nfunction revealGuessAnswer(correctIdx, wrongIdx) {\n  const btns = document.querySelectorAll('.g-btn');\n  btns.forEach((b,i) => {\n    b.classList.add('locked');\n    if (i === correctIdx) b.classList.add('correct-ans');\n    else if (i === wrongIdx) b.classList.add('wrong-ans');\n  });\n}\n\nfunction updateStreak(streak) {\n  const bar = document.getElementById('streak-bar');\n  if (!bar) return;\n  bar.innerHTML = Array(5).fill(0).map((_,i)=>`<div class=\"streak-pip${i<streak?' lit':''}\"></div>`).join('');\n}\n\n// \u2500\u2500\u2500 GAME OVER \u2500\u2500\u2500\nfunction showGameOver(scores) {\n  clearInterval(guessTimerInterval);\n  const medals = ['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49','4\ufe0f\u20e3'];\n  const sorted = [...scores].sort((a,b)=>b.score-a.score);\n  document.getElementById('go-scores').innerHTML = sorted.map((p,i)=>`\n    <div class=\"score-row\">\n      <div class=\"score-name\"><span class=\"medal\">${medals[i]||'  '}</span> ${p.name}</div>\n      <div class=\"score-pts\">${p.score} PTS</div>\n    </div>\n  `).join('');\n  document.getElementById('revancha-btn').style.display = isHost ? 'inline-block' : 'none';\n  showScreen('screen-gameover');\n}\n\n// \u2500\u2500\u2500 SCORES RENDER \u2500\u2500\u2500\nfunction renderScores(elId) {\n  if (!roomData) return;\n  const el = document.getElementById(elId);\n  if (!el) return;\n  el.innerHTML = roomData.players.map(p=>`\n    <div class=\"score-row\">\n      <div class=\"score-name\"><span class=\"conn-dot${p.connected===false?' off':''}\"></span>${p.name}</div>\n      <div class=\"score-pts\">${p.score} PTS</div>\n    </div>\n  `).join('');\n}\n\n// \u2500\u2500\u2500 RESULT OVERLAY \u2500\u2500\u2500\nfunction queueResult(title, msg, pts) {\n  resultQueue.push({title, msg, pts});\n  if (!showingResult) showNextResult();\n}\n\nfunction showNextResult() {\n  if (resultQueue.length === 0) { showingResult = false; return; }\n  showingResult = true;\n  const {title, msg, pts} = resultQueue.shift();\n  document.getElementById('res-title').textContent = title;\n  document.getElementById('res-msg').innerHTML = msg;\n  document.getElementById('res-pts').textContent = pts ? `+${pts} PTS!` : '';\n  document.getElementById('result-overlay').classList.remove('hidden');\n}\n\nfunction closeResult() {\n  document.getElementById('result-overlay').classList.add('hidden');\n  setTimeout(showNextResult, 200);\n}\n\n// \u2500\u2500\u2500 CHAT \u2500\u2500\u2500\nfunction appendChat(msg) {\n  const chatIds = ['chat-msgs','mine-chat','puzzle-chat','guess-chat','go-chat'];\n  chatIds.forEach(id => {\n    const el = document.getElementById(id);\n    if (!el) return;\n    const div = document.createElement('div');\n    div.className = `chat-msg${msg.system?' system':''}`;\n    div.innerHTML = msg.system \n      ? `\u26a1 ${msg.msg}`\n      : `<span class=\"chat-name\">${msg.playerName}:</span> ${msg.msg}`;\n    el.appendChild(div);\n    el.scrollTop = el.scrollHeight;\n  });\n}\n\nfunction sendChat() {\n  const inputs = ['chat-input','mine-chat-input','puzzle-chat-input','guess-chat-input','go-chat-input'];\n  let msg = '';\n  inputs.forEach(id => { const el=document.getElementById(id); if(el&&el.value.trim()){msg=el.value.trim();el.value='';} });\n  if (msg) send({ type: 'chat', msg });\n}\n\n// \u2500\u2500\u2500 TOAST \u2500\u2500\u2500\nfunction showToast(msg, isError=false) {\n  const t = document.createElement('div');\n  t.className = `toast${isError?' error':''}`;\n  t.textContent = msg;\n  document.body.appendChild(t);\n  setTimeout(() => t.remove(), 3000);\n}\n\n// \u2500\u2500\u2500 EVENT LISTENERS \u2500\u2500\u2500\ndocument.getElementById('my-name').addEventListener('keydown', e => { if(e.key==='Enter') createRoom(); });\ndocument.getElementById('room-code-input').addEventListener('keydown', e => { if(e.key==='Enter') joinRoom(); });\ndocument.getElementById('room-code-input').addEventListener('input', e => { e.target.value=e.target.value.toUpperCase(); });\n\nconst chatInputs = ['chat-input','mine-chat-input','puzzle-chat-input','guess-chat-input','go-chat-input'];\nchatInputs.forEach(id => {\n  const el = document.getElementById(id);\n  if (el) el.addEventListener('keydown', e => { if(e.key==='Enter') sendChat(); });\n});\n</script>\n</body>\n</html>\n";

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

const wss = new WebSocketServer({ server });

const rooms = new Map();
const clients = new Map();

function genCode() { return Math.random().toString(36).substring(2,6).toUpperCase(); }
function genId() { return crypto.randomUUID().slice(0,8); }
function broadcast(roomCode, msg, excludeWs=null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(msg);
  room.players.forEach(p => {
    if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  });
}
function broadcastAll(roomCode, msg) { broadcast(roomCode, msg, null); }
function send(ws, msg) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function roomState(room) {
  return {
    type: 'room_state',
    room: {
      code: room.code, hostId: room.hostId, gameMode: room.gameMode,
      gameState: room.gameState, currentPlayerIdx: room.currentPlayerIdx,
      players: room.players.map(p => ({ id:p.id, name:p.name, score:p.score, connected:p.ws.readyState===WebSocket.OPEN })),
      gameData: room.gameData
    }
  };
}

const PIECES = [
  {sym:'\u2654',name:'REY',val:0},{sym:'\u2655',name:'REINA',val:9},{sym:'\u2656',name:'TORRE',val:5},
  {sym:'\u2657',name:'ALFIL',val:3},{sym:'\u2658',name:'CABALLO',val:3},{sym:'\u2659',name:'PE\u00d3N',val:1},
  {sym:'\u265a',name:'REY',val:0},{sym:'\u265b',name:'REINA',val:9},{sym:'\u265c',name:'TORRE',val:5},
  {sym:'\u265d',name:'ALFIL',val:3},{sym:'\u265e',name:'CABALLO',val:3},{sym:'\u265f',name:'PE\u00d3N',val:1},
];

function initMinesweeper() {
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
    {sym:'\u2654',pos:4,val:0},{sym:'\u265b',pos:27,val:9},{sym:'\u265c',pos:0,val:5},
    {sym:'\u265c',pos:7,val:5},{sym:'\u265d',pos:18,val:3},{sym:'\u265e',pos:42,val:3},
    {sym:'\u2659',pos:8,val:1},{sym:'\u2659',pos:9,val:1},{sym:'\u265f',pos:55,val:1},{sym:'\u265a',pos:60,val:0}
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
    let msg; try { msg=JSON.parse(raw); } catch { return; }
    const info=clients.get(ws);
    switch(msg.type) {
      case 'create_room': {
        const code=genCode(),playerId=genId();
        const room={code,hostId:playerId,gameMode:null,gameState:'lobby',currentPlayerIdx:0,
          players:[{id:playerId,name:msg.name||'HOST',score:0,ws}],gameData:null};
        rooms.set(code,room); clients.set(ws,{roomCode:code,playerId});
        send(ws,{type:'joined',playerId,roomCode:code,isHost:true});
        send(ws,roomState(room)); break;
      }
      case 'join_room': {
        const room=rooms.get(msg.code?.toUpperCase());
        if(!room){send(ws,{type:'error',msg:'Sala no encontrada'});return;}
        if(room.players.length>=4){send(ws,{type:'error',msg:'Sala llena'});return;}
        if(room.gameState!=='lobby'){send(ws,{type:'error',msg:'Partida en curso'});return;}
        const playerId=genId();
        room.players.push({id:playerId,name:msg.name||'PLAYER',score:0,ws});
        clients.set(ws,{roomCode:room.code,playerId});
        send(ws,{type:'joined',playerId,roomCode:room.code,isHost:false});
        broadcastAll(room.code,roomState(room));
        broadcast(room.code,{type:'chat',system:true,msg:`${msg.name} se uni\u00f3!`},ws); break;
      }
      case 'set_game': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        room.gameMode=msg.mode; broadcastAll(room.code,roomState(room)); break;
      }
      case 'start_game': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        if(room.players.length<2){send(ws,{type:'error',msg:'Necesitas 2+ jugadores'});return;}
        if(!room.gameMode){send(ws,{type:'error',msg:'Elige un modo'});return;}
        room.players.forEach(p=>p.score=0);
        room.currentPlayerIdx=0; room.gameState='playing';
        if(room.gameMode==='minesweeper') room.gameData=initMinesweeper();
        else if(room.gameMode==='puzzle') room.gameData=initPuzzle();
        else { room.gameData=initGuess(); room.gameData.currentQuestion=makeGuessQuestion(); }
        broadcastAll(room.code,roomState(room));
        broadcastAll(room.code,{type:'game_started',mode:room.gameMode}); break;
      }
      case 'mine_click': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const cur=room.players[room.currentPlayerIdx];
        if(cur.id!==info.playerId){send(ws,{type:'error',msg:'No es tu turno'});return;}
        const d=room.gameData,idx=msg.idx,cell=d.board[idx];
        if(cell.revealed||cell.flagged) return;
        cell.revealed=true;
        if(cell.isBomb){
          d.board.forEach(c=>{if(c.isBomb)c.revealed=true;});
          broadcastAll(room.code,{type:'mine_bomb',playerName:cur.name,idx});
          broadcastAll(room.code,roomState(room));
          setTimeout(()=>{
            d.board.forEach(c=>{if(c.isBomb)c.revealed=false;});
            room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;
            broadcastAll(room.code,roomState(room));
          },2000);
        } else {
          const piece=d.pieceMap[idx];
          if(cell.adj===0&&!piece) floodReveal(d,Math.floor(idx/d.cols),idx%d.cols);
          if(piece){const pts=piece.val===0?1:piece.val;cur.score+=pts;broadcastAll(room.code,{type:'mine_piece',playerName:cur.name,piece,pts,idx});}
          const allDone=d.board.every(c=>c.isBomb||c.revealed);
          broadcastAll(room.code,roomState(room));
          if(allDone){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else if(piece){room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;broadcastAll(room.code,roomState(room));}
        }
        break;
      }
      case 'mine_flag': {
        if(!info) return;
        const room=rooms.get(info.roomCode); if(!room) return;
        const cell=room.gameData.board[msg.idx];
        if(!cell.revealed){cell.flagged=!cell.flagged;broadcastAll(room.code,roomState(room));}
        break;
      }
      case 'puzzle_place': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const cur=room.players[room.currentPlayerIdx];
        if(cur.id!==info.playerId){send(ws,{type:'error',msg:'No es tu turno'});return;}
        const d=room.gameData;
        const piece=d.solution.find(p=>p.id===msg.pieceId&&!p.placed);
        if(!piece) return;
        if(msg.boardIdx===piece.pos){
          piece.placed=true;d.placed[msg.boardIdx]={sym:piece.sym};
          const pts=piece.val===0?1:piece.val;cur.score+=pts;
          broadcastAll(room.code,{type:'puzzle_correct',playerName:cur.name,piece,pts});
          const allPlaced=d.solution.every(p=>p.placed);
          broadcastAll(room.code,roomState(room));
          if(allPlaced){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else{room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;broadcastAll(room.code,roomState(room));}
        } else {
          broadcastAll(room.code,{type:'puzzle_wrong',playerName:cur.name});
          room.currentPlayerIdx=(room.currentPlayerIdx+1)%room.players.length;
          broadcastAll(room.code,roomState(room));
        }
        break;
      }
      case 'guess_answer': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const d=room.gameData; if(d.answered) return;
        d.answered=true;
        const player=room.players.find(p=>p.id===info.playerId); if(!player) return;
        const {pieces,correctIdx}=d.currentQuestion;
        const isCorrect=msg.idx===correctIdx;
        if(isCorrect){d.streak++;const bonus=d.streak>=3?2:0;const pts=3+bonus;player.score+=pts;broadcastAll(room.code,{type:'guess_result',correct:true,playerName:player.name,pts,streak:d.streak,correctIdx,pieces});}
        else{d.streak=0;broadcastAll(room.code,{type:'guess_result',correct:false,playerName:player.name,pts:0,streak:0,correctIdx,pieces});}
        broadcastAll(room.code,roomState(room));
        d.round++;
        setTimeout(()=>{
          if(d.round>=d.totalRounds){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else{d.answered=false;d.currentQuestion=makeGuessQuestion();broadcastAll(room.code,roomState(room));}
        },3000); break;
      }
      case 'guess_timeout': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.gameState!=='playing') return;
        const d=room.gameData; if(d.answered) return;
        d.answered=true;d.streak=0;
        const {correctIdx,pieces}=d.currentQuestion;
        broadcastAll(room.code,{type:'guess_timeout',correctIdx,pieces});
        d.round++;
        setTimeout(()=>{
          if(d.round>=d.totalRounds){room.gameState='finished';broadcastAll(room.code,{type:'game_over',scores:room.players.map(p=>({name:p.name,score:p.score}))});}
          else{d.answered=false;d.currentQuestion=makeGuessQuestion();broadcastAll(room.code,roomState(room));}
        },3000); break;
      }
      case 'new_round': {
        if(!info) return;
        const room=rooms.get(info.roomCode);
        if(!room||room.hostId!==info.playerId) return;
        room.players.forEach(p=>p.score=0);
        room.currentPlayerIdx=0;room.gameState='lobby';room.gameData=null;
        broadcastAll(room.code,roomState(room)); break;
      }
      case 'chat': {
        if(!info) return;
        const room=rooms.get(info.roomCode); if(!room) return;
        const player=room.players.find(p=>p.id===info.playerId);
        broadcastAll(room.code,{type:'chat',playerName:player?.name,msg:msg.msg}); break;
      }
    }
  });
  ws.on('close', ()=>{
    const info=clients.get(ws);
    if(info){
      const room=rooms.get(info.roomCode);
      if(room){
        const p=room.players.find(p=>p.id===info.playerId);
        broadcast(room.code,{type:'chat',system:true,msg:`${p?.name} se desconect\u00f3`},ws);
        if(room.hostId===info.playerId&&room.players.length>1){
          const next=room.players.find(p=>p.id!==info.playerId);
          if(next) room.hostId=next.id;
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
server.listen(PORT, () => console.log(`Chess Arcade running on port ${PORT}`));
