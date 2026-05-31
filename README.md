# ♟ Chess Arcade — Pixel Party Online

Juego multijugador online con 3 minijuegos de ajedrez estilo pixel art.

## Instalación

```bash
npm install
npm start
```

El servidor corre en **http://localhost:3000**

## Deploy en Railway (gratis)

1. Crea cuenta en https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Sube este proyecto a un repo de GitHub
4. Railway detecta automáticamente Node.js y lo deploya
5. Te da una URL pública (ej: `chess-arcade-production.up.railway.app`)

## Deploy en Render (gratis)

1. Crea cuenta en https://render.com
2. "New Web Service" → conecta tu repo
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Te da una URL pública para compartir

## Cómo jugar

1. Un jugador crea sala → recibe código de 4 letras
2. Comparte el código con amigos (hasta 4 jugadores)
3. Los demás ingresan el código
4. El host elige modo y presiona INICIAR

## Modos de juego

- **💣 Buscaminas Ajedrez** — Turnos rotativos, revela piezas, evita bombas
- **🧩 Rompecabezas** — Coloca piezas en su posición correcta del tablero
- **🎯 Adivina la Pieza** — ¿Cuál vale más? ¡Primero en responder gana puntos!

## Stack técnico

- **Backend:** Node.js + Express + ws (WebSockets nativos)
- **Frontend:** HTML/CSS/JS vanilla, pixel art puro
- **Protocolo:** WebSocket bidireccional, sin base de datos
