# CLAUDE.md

Instrucciones para Claude Code (claude.ai/code) al trabajar en este repositorio.
Lee este archivo completo antes de hacer cualquier cambio.

> Para el setup del proyecto y guía de uso de Claude Code, ver [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

---

## Descripción del proyecto

Juego de ajedrez en tiempo real con multijugador y oponente de IA (Stockfish).
Monorepo con dos paquetes — la infraestructura AWS se genera con el plugin `deploy-on-aws` al desplegar.

```
chess-game/
├── frontend/           # React 19 + Vite  →  http://localhost:5173
├── backend/            # Express + socket.io  →  http://localhost:3001
├── docker-compose.yml  # DynamoDB local (amazon/dynamodb-local:latest)
└── package.json        # Scripts raíz
```

---

## Tech Stack

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 19, Vite 8, TypeScript strict, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, Zustand, react-router-dom, axios, socket.io-client, react-chessboard, chess.js |
| **Backend** | Node.js, Express 4, TypeScript, socket.io 4, zod (env validation), uuid |
| **IA** | `stockfish` npm v16 — WASM/NNUE, lanzado con `child_process.fork()` + IPC |
| **Base de datos** | AWS DynamoDB SDK v3: `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` |

---

## Comandos de desarrollo

```bash
# ── Requisito: DynamoDB local ──────────────────────────────
docker compose up -d          # levanta DynamoDB en :8000 (en memoria)

# ── Instalar dependencias ──────────────────────────────────
cd backend  && npm install
cd frontend && npm install

# ── Desde la raíz ─────────────────────────────────────────
npm run dev:backend            # nodemon → :3001
npm run dev:frontend           # Vite HMR → :5173
npm run build:backend          # tsc → dist/
npm run build:frontend         # vite build → dist/
```

---

## Variables de entorno

Copiar `backend/.env.example` → `backend/.env`:

```env
PORT=3001
NODE_ENV=development
AWS_REGION=us-east-1

# Desarrollo local (con docker-compose)
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
DYNAMODB_ENDPOINT=http://localhost:8000

# Producción: eliminar DYNAMODB_ENDPOINT y usar credenciales reales o IAM roles
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...

DYNAMODB_TABLE_GAMES=chess-games
DYNAMODB_TABLE_PLAYERS=chess-players
FRONTEND_URL=http://localhost:5173
```

> En producción los secretos van en **AWS Secrets Manager**, nunca en variables de entorno planas.

---

## Restricciones de arquitectura

### DynamoDB

- Ambas tablas usan **On-Demand billing**
- Esquema de claves genérico: `pk` (string) + `sk` (string)
  - `chess-games` → `pk = gameId`, `sk = createdAt`
  - `chess-players` → `pk = userId`, `sk = username`
- **Siempre usar `DynamoDBDocumentClient`** (`@aws-sdk/lib-dynamodb`) — nunca el `DynamoDBClient` crudo
- Todo acceso a DynamoDB pasa por `backend/src/services/dynamodb.ts`
- La validación del entorno usa **zod** en `backend/src/config/env.ts`

### Backend

- Endpoints REST bajo `/api/v1/...`: `/api/v1/games`, `/api/v1/players`
- Health check: `GET /health`
- Rooms de socket.io nombradas por `gameId`
- Stockfish **nunca** bloquea el event loop:
  - Se lanza con `child_process.fork()` por cada partida IA activa
  - Comunicación por IPC (`process.send` / `process.on('message')`)
  - Manager: `backend/src/engine/stockfishManager.ts`
  - Proceso hijo: `backend/src/workers/stockfishProcess.ts`
- Tipos de socket compartidos en `backend/src/types/index.ts` — **mantener sincronizados con el frontend**

### Frontend

- Rutas: `/` (LandingPage), `/lobby` (LobbyPage), `/game/:gameId` (GamePage)
- **No existe ruta `/leaderboard`** — el leaderboard es un drawer lateral
  - Se abre desde el botón 🏆 del Navbar o la card de LandingPage
  - Componente: `frontend/src/components/layout/LeaderboardDrawer.tsx`
  - Estado global: `frontend/src/store/uiStore.ts` → `openLeaderboard()` / `closeLeaderboard()`
- Stores (Zustand): `gameStore`, `lobbyStore`, `playerStore`, `uiStore`
- Hooks: `useChessGame`, `useGameTimer`, `useSocket`
- Componentes: `components/game/`, `components/layout/`, `components/lobby/`, `components/ui/`
- **Las credenciales AWS nunca se exponen en el frontend**
- Tipos de socket en `frontend/src/types/index.ts` — espejo del backend, mantener en sync

---

## Eventos WebSocket

Definidos en `types/index.ts` (backend y frontend — mantener en sync manual).
Al agregar un nuevo evento, actualizarlo en **ambos** archivos.

| Constante | Valor (string) | Dirección |
|-----------|----------------|-----------|
| `CLIENT.GET_LOBBY` | `get_lobby` | C→S |
| `CLIENT.CREATE_ROOM` | `create_room` | C→S |
| `CLIENT.JOIN_ROOM` | `join_room` | C→S |
| `CLIENT.CANCEL_ROOM` | `cancel_room` | C→S |
| `CLIENT.JOIN_GAME` | `join_game` | C→S |
| `CLIENT.LEAVE_GAME` | `leave_game` | C→S |
| `CLIENT.MAKE_MOVE` | `make_move` | C→S |
| `CLIENT.RESIGN` | `resign` | C→S |
| `CLIENT.OFFER_DRAW` | `offer_draw` | C→S |
| `CLIENT.ACCEPT_DRAW` | `accept_draw` | C→S |
| `CLIENT.SYNC_REQUEST` | `sync_request` | C→S |
| `SERVER.LOBBY_UPDATED` | `lobby_updated` | S→C |
| `SERVER.ROOM_CREATED` | `room_created` | S→C |
| `SERVER.OPPONENT_JOINED` | `opponent_joined` | S→C |
| `SERVER.GAME_UPDATED` | `game_updated` | S→C |
| `SERVER.MOVE_MADE` | `move_made` | S→C |
| `SERVER.GAME_OVER` | `game_over` | S→C |
| `SERVER.DRAW_OFFERED` | `draw_offered` | S→C |
| `SERVER.OPPONENT_DISCONNECTED` | `opponent_disconnected` | S→C |
| `SERVER.ERROR` | `error` | S→C |

---

## Leaderboard y Elo

- `updatePlayerStats(userId, result, opponentRating?)` en `playerService.ts`:
  - Actualiza `gamesPlayed`, `gamesWon`/`gamesLost`/`gamesDraw`
  - Recalcula rating con **Elo estándar K=32**: `Δ = K * (actual - expected)`, `expected = 1 / (1 + 10^((opponentRating - myRating)/400))`
  - Rating mínimo: 100
- Se llama en `gameHandler.ts` (función `recordGameResult`) en los 3 puntos de fin de partida: checkmate/stalemate, resignación, empate por acuerdo
- **Las partidas vs IA no modifican el Elo** (`isAiGame === true` → skip)
- Endpoint: `GET /api/v1/players/leaderboard` → top 20 por rating

---

## Bugs corregidos (no reintroducir)

| Bug | Causa raíz | Solución |
|-----|-----------|----------|
| Sala de espera no se podía cancelar | No existía evento `CANCEL_ROOM` | Agregado en `types/index.ts` (ambos lados), handler en `lobbyHandler.ts`, `cancelGame()` en `gameService.ts` |
| `LEAVE_GAME` no cambiaba el estado | Solo hacía `socket.leave()` sin tocar DynamoDB | Para salir de sala `waiting`, el creador usa `CANCEL_ROOM` |
| `GamePage` con `status=waiting` mostraba tablero roto | Renderizaba tablero con `players.black = null` | Nuevo componente `WaitingRoom` con link de invitación y botón Cancel |

---

## Convenciones de código

- TypeScript strict en ambos paquetes — no usar `any` salvo casos justificados con comentario
- Componentes React en PascalCase; hooks con prefijo `use`
- ESLint + Prettier configurados — respetar las reglas existentes
- No agregar `console.log` de debug en producción
- No crear rutas nuevas en el frontend sin actualizar este archivo

---

## Despliegue a AWS (plugin deploy-on-aws)

- Región: `us-east-1`
- Presupuesto estimado: ~$15–30/mes para 100–500 usuarios concurrentes
- **Backend con WebSocket persistente → Lambda no es viable → usar App Runner o ECS Fargate**
- Frontend estático → S3 + CloudFront
- En producción: secretos en AWS Secrets Manager, no variables de entorno
