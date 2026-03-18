# Manual de Claude Code — Chess Master

Guía completa para desarrolladores que clonan este repositorio y quieren entender cómo funciona el proyecto, cómo inicializarlo y cómo trabajar con Claude Code como asistente de desarrollo.

---

## Tabla de contenidos

1. [¿Qué es Claude Code?](#1-qué-es-claude-code)
2. [Instalación y requisitos previos](#2-instalación-y-requisitos-previos)
3. [Inicializar el proyecto desde cero](#3-inicializar-el-proyecto-desde-cero)
4. [Estructura del proyecto](#4-estructura-del-proyecto)
5. [Cómo funciona CLAUDE.md](#5-cómo-funciona-claudemd)
6. [Trabajar con Claude Code en este proyecto](#6-trabajar-con-claude-code-en-este-proyecto)
7. [Plugins MCP disponibles](#7-plugins-mcp-disponibles)
8. [Prompts de referencia](#8-prompts-de-referencia)
9. [Comandos slash disponibles](#9-comandos-slash-disponibles)
10. [Flujos de trabajo documentados](#10-flujos-de-trabajo-documentados)
11. [Buenas prácticas para el equipo](#11-buenas-prácticas-para-el-equipo)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. ¿Qué es Claude Code?

Claude Code es el CLI oficial de Anthropic para interactuar con Claude directamente desde la terminal. No es un chat — es un **agente de ingeniería de software** que puede:

- Leer y modificar archivos del proyecto
- Ejecutar comandos en la terminal
- Buscar en el codebase con grep/glob
- Navegar el historial de git
- Desplegar infraestructura en AWS
- Crear commits y pull requests
- Mantener memoria entre sesiones

```
┌────────────────────────────────────────────────────────┐
│  Chat normal con LLM          Claude Code              │
├──────────────────────────────┬─────────────────────────┤
│  Lee código que tú le pegas  │  Lee el código real      │
│  Sugiere cambios             │  Edita archivos          │
│  No tiene contexto del repo  │  Conoce toda la base     │
│  Sin memoria entre chats     │  Memoria persistente     │
│  No ejecuta comandos         │  Corre tests, builds     │
└──────────────────────────────┴─────────────────────────┘
```

### Cómo piensa Claude Code

Antes de modificar algo, Claude Code siempre:

1. **Lee** los archivos relevantes para entender el código actual
2. **Explora** la estructura del proyecto si no la conoce
3. **Planifica** el approach antes de editar
4. **Actúa** haciendo cambios mínimos y enfocados
5. **Verifica** que los cambios son correctos

---

## 2. Instalación y requisitos previos

### Requisitos del sistema

| Herramienta | Versión mínima | Para qué |
|-------------|----------------|----------|
| Node.js | 18+ | Frontend y Backend |
| npm | 9+ | Gestión de paquetes |
| Docker Desktop | Cualquiera reciente | DynamoDB local |
| Git | 2.x | Control de versiones |
| Claude Code | Última | Asistente de desarrollo |

### Instalar Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Verificar instalación:

```bash
claude --version
```

### Iniciar Claude Code en el proyecto

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd chess-game

# Lanzar Claude Code
claude
```

Al iniciarse, Claude Code **lee automáticamente el archivo `CLAUDE.md`** de la raíz y carga el contexto del proyecto. No necesitas explicar nada de la arquitectura.

> **Nota de autenticación**: La primera vez que ejecutes `claude`, te pedirá autenticarte con tu cuenta de Anthropic (claude.ai). Sigue las instrucciones en pantalla.

---

## 3. Inicializar el proyecto desde cero

### Paso 1 — Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd chess-game

# Instalar dependencias del backend
cd backend && npm install && cd ..

# Instalar dependencias del frontend
cd frontend && npm install && cd ..
```

### Paso 2 — Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
```

El archivo `.env.example` ya tiene los valores correctos para desarrollo local:

```env
PORT=3001
NODE_ENV=development
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_GAMES=chess-games
DYNAMODB_TABLE_PLAYERS=chess-players
FRONTEND_URL=http://localhost:5173
```

No necesitas credenciales AWS reales en desarrollo — Docker simula DynamoDB localmente.

### Paso 3 — Levantar DynamoDB local

```bash
docker compose up -d
```

Esto levanta:
- `chess-dynamodb` → DynamoDB en modo in-memory en el puerto `8000`
- `chess-dynamodb-setup` → crea automáticamente las tablas `chess-games` y `chess-players`

Verificar que las tablas existen:

```bash
aws dynamodb list-tables \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --no-cli-pager \
  --no-sign-request
# Salida esperada: { "TableNames": ["chess-games", "chess-players"] }
```

### Paso 4 — Iniciar el servidor de desarrollo

En dos terminales separadas:

```bash
# Terminal 1 — Backend
cd backend && npm run dev
# → Chess backend running on http://localhost:3001

# Terminal 2 — Frontend
cd frontend && npm run dev
# → Local: http://localhost:5173
```

O desde la raíz (cada uno en su terminal):

```bash
npm run dev:backend
npm run dev:frontend
```

### Paso 5 — Verificar que todo funciona

```bash
# Health check del backend
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}

# Abrir el frontend
open http://localhost:5173
```

### Paso 6 — Iniciar Claude Code

```bash
claude
```

Claude Code leerá el `CLAUDE.md` y estará listo para ayudarte con el proyecto.

---

## 4. Estructura del proyecto

```
chess-game/
│
├── CLAUDE.md                    ← Instrucciones para Claude Code
├── README.md                    ← Documentación de la aplicación
├── README-CLAUDE.md             ← Este archivo
├── docker-compose.yml           ← DynamoDB local
├── package.json                 ← Scripts raíz del monorepo
│
├── backend/
│   ├── src/
│   │   ├── index.ts             ← Entry point: Express + socket.io
│   │   ├── config/env.ts        ← Validación de env con zod
│   │   ├── types/index.ts       ← Tipos compartidos + SOCKET_EVENTS
│   │   ├── routes/
│   │   │   ├── games.ts         ← GET|POST /api/v1/games
│   │   │   └── players.ts       ← GET /api/v1/players, /leaderboard
│   │   ├── socket/
│   │   │   ├── index.ts         ← Registro de handlers
│   │   │   ├── lobbyHandler.ts  ← create_room, join_room, cancel_room
│   │   │   └── gameHandler.ts   ← make_move, resign, draw, sync
│   │   ├── services/
│   │   │   ├── dynamodb.ts      ← Wrapper DocumentClient
│   │   │   ├── gameService.ts   ← CRUD partidas + lógica de negocio
│   │   │   └── playerService.ts ← CRUD jugadores + Elo
│   │   ├── engine/
│   │   │   └── stockfishManager.ts  ← Gestión de procesos Stockfish
│   │   ├── workers/
│   │   │   └── stockfishProcess.ts  ← Proceso hijo Stockfish (IPC)
│   │   └── middleware/
│   │       └── errorHandler.ts
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx              ← Router + Footer + LeaderboardDrawer
    │   ├── main.tsx
    │   ├── types/index.ts       ← Espejo de backend/src/types/index.ts
    │   ├── config/constants.ts  ← API_URL, WS_URL, TIME_CONTROLS
    │   ├── pages/
    │   │   ├── LandingPage.tsx  ← Hero + feature cards
    │   │   ├── LobbyPage.tsx    ← Lista de salas + crear partida
    │   │   └── GamePage.tsx     ← Tablero / WaitingRoom
    │   ├── components/
    │   │   ├── game/            ← ChessBoard, PlayerCard, Timer, etc.
    │   │   ├── layout/
    │   │   │   ├── Navbar.tsx
    │   │   │   ├── Footer.tsx
    │   │   │   ├── LeaderboardDrawer.tsx
    │   │   │   └── PageTransition.tsx
    │   │   ├── lobby/           ← RoomCard, CreateRoomModal
    │   │   └── ui/              ← Button, Modal, Badge, Spinner
    │   ├── store/
    │   │   ├── gameStore.ts     ← Estado de la partida activa
    │   │   ├── lobbyStore.ts    ← Lista de salas
    │   │   ├── playerStore.ts   ← Identidad del jugador (persistida)
    │   │   └── uiStore.ts       ← Estado de drawers/modales globales
    │   ├── hooks/
    │   │   ├── useChessGame.ts
    │   │   ├── useGameTimer.ts
    │   │   └── useSocket.ts
    │   └── lib/
    │       ├── api.ts           ← Cliente axios
    │       └── socket.ts        ← Singleton socket.io-client
    └── package.json
```

---

## 5. Cómo funciona CLAUDE.md

`CLAUDE.md` es el **contrato del proyecto** con Claude Code. Se carga automáticamente al iniciar una sesión y define:

```
┌──────────────────────────────────────────────────────────────┐
│                        CLAUDE.md                             │
├──────────────────────────────────────────────────────────────┤
│  Tech Stack          → Claude usa las librerías correctas    │
│  Comandos de dev     → Claude ejecuta el build/dev correcto  │
│  Variables de env    → Claude no inventa nombres de var      │
│  Restricciones       → Claude no viola la arquitectura       │
│  Eventos WebSocket   → Claude mantiene el contrato de API    │
│  Bugs corregidos     → Claude no re-introduce errores        │
│  Convenciones        → Claude mantiene el estilo del código  │
└──────────────────────────────────────────────────────────────┘
```

### Regla de oro

> Cuando Claude comete un error o hace algo que no querías, **corrígelo y documenta la corrección en `CLAUDE.md`**. La próxima sesión Claude no repetirá el mismo error.

### Ejemplo real de corrección

```markdown
## Bugs corregidos (no reintroducir)

| Bug | Causa raíz | Solución |
|-----|-----------|----------|
| Sala de espera no se podía cancelar | No existía evento CANCEL_ROOM | ... |
```

Ahora Claude sabe que `CANCEL_ROOM` debe existir y no intentará implementar esa funcionalidad de otra manera.

---

## 6. Trabajar con Claude Code en este proyecto

### Iniciar una sesión

```bash
cd chess-game
claude
```

Claude carga el contexto de `CLAUDE.md` automáticamente. Puedes empezar a pedir cambios directamente.

### Modos de operación

Claude Code tiene dos modos principales:

| Modo | Cómo activar | Cuándo usarlo |
|------|-------------|---------------|
| **Interactivo** | `claude` | Desarrollo diario, debugging |
| **No interactivo** | `claude -p "prompt"` | Automatización, CI/CD |

### Permisos de herramientas

La primera vez que Claude intenta hacer algo (editar un archivo, ejecutar un comando), te pedirá confirmación. Puedes configurar permisos permanentes:

```bash
# Aprobar automáticamente lecturas y ediciones (recomendado)
claude --dangerously-skip-permissions
# ⚠️ Úsalo solo en entornos controlados
```

O en la sesión interactiva responde `y` a cada acción para aprobarla.

### Flujo de trabajo típico

**1. Describir el problema**

```
Tú: el temporizador no se detiene cuando la partida termina por jaque mate

Claude: [lee useGameTimer.ts, GamePage.tsx, gameStore.ts]
        [identifica que el timer no revisa game.status === 'completed']
        [edita useGameTimer.ts para pausar cuando status no es 'active']
```

**2. Agregar una feature**

```
Tú: agrega un chat en tiempo real dentro de la partida

Claude: [lee socket/index.ts, types/index.ts, GamePage.tsx]
        [propone approach: nuevo evento CHAT_MESSAGE, store chatStore]
        [implementa backend: handler + emit al room]
        [implementa frontend: store + componente ChatBox + hook]
        [actualiza CLAUDE.md con el nuevo evento]
```

**3. Revisar código**

```
Tú: revisa gameHandler.ts y busca posibles race conditions

Claude: [lee gameHandler.ts completo]
        [identifica: addMoveToGame hace dos operaciones separadas que podrían desincronizarse]
        [sugiere usar una transacción o un lock optimista]
```

**4. Refactorizar**

```
Tú: los tipos de GameState están duplicados en frontend y backend, unifícalos

Claude: [lee ambos types/index.ts]
        [propone crear un paquete compartido en /shared]
        [o sugiere generar el frontend desde el backend con ts-to-zod]
        [espera confirmación del approach antes de modificar]
```

### Comandos útiles dentro de Claude Code

```bash
# En la sesión interactiva de claude:

/help          # Ver todos los comandos disponibles
/clear         # Limpiar contexto de la conversación actual
/compact       # Comprimir el contexto para liberar tokens
/cost          # Ver el costo de la sesión actual
/exit          # Salir de Claude Code
```

---

## 7. Plugins MCP disponibles

Este proyecto tiene configurados plugins **MCP (Model Context Protocol)** que extienden las capacidades de Claude Code con herramientas especializadas para AWS.

### plugin:deploy-on-aws — Infraestructura como código

Permite diseñar, validar y desplegar infraestructura AWS directamente desde la conversación.

**Herramientas disponibles:**

| Herramienta | Qué hace |
|-------------|----------|
| `validate_cloudformation_template` | Valida sintaxis con `cfn-lint` |
| `check_cloudformation_template_compliance` | Revisa seguridad y compliance con `cfn-guard` |
| `get_cloudformation_pre_deploy_validation_instructions` | Instrucciones para change sets pre-deploy |
| `troubleshoot_cloudformation_deployment` | Diagnóstica fallos con análisis de CloudTrail |
| `search_cdk_documentation` | Busca en la documentación oficial de AWS CDK |
| `search_cdk_samples_and_constructs` | Busca ejemplos y constructos de la comunidad |
| `search_cloudformation_documentation` | Busca documentación de recursos CloudFormation |
| `cdk_best_practices` | Genera/revisa código CDK siguiendo best practices |

**Ejemplo de uso:**

```
Tú: genera el stack CDK para desplegar esto en producción

Claude: [analiza el proyecto]
        [detecta: frontend estático → S3 + CloudFront]
        [detecta: backend con WebSocket → App Runner (no Lambda)]
        [detecta: DynamoDB On-Demand ya definida]
        [usa search_cdk_documentation para el construct de App Runner]
        [genera infrastructure/lib/chess-stack.ts]
        [valida con validate_cloudformation_template]
        [verifica compliance con check_cloudformation_template_compliance]
```

### plugin:deploy-on-aws:awspricing — Estimación de costos

Calcula el costo estimado antes de desplegar.

```
Tú: ¿cuánto costaría este proyecto para 200 usuarios activos mensuales?

Claude: [usa get_pricing para App Runner, DynamoDB, CloudFront, S3]
        [genera reporte con breakdown por servicio]
        [incluye recomendaciones Well-Architected para optimizar costos]
```

**Herramientas:**

| Herramienta | Qué hace |
|-------------|----------|
| `get_pricing_service_codes` | Lista todos los servicios AWS disponibles |
| `get_pricing` | Obtiene precios con filtros (región, tipo de instancia, etc.) |
| `generate_cost_report` | Genera reporte detallado de costos en markdown |
| `analyze_cdk_project` | Analiza un proyecto CDK y estima su costo |

### plugin:deploy-on-aws:awsknowledge — Documentación AWS

```
Tú: ¿qué diferencia hay entre App Runner y ECS Fargate para este caso?

Claude: [usa aws___search_documentation]
        [usa aws___recommend para este caso de uso específico]
        [compara latencia de cold start, costo por request, soporte WebSocket]
```

---

## 8. Prompts de referencia

### Inicialización y setup

```bash
# Verificar que Claude entendió el proyecto
"resume en 3 puntos qué hace este proyecto y qué stack usa"

# Si hay algo desactualizado en CLAUDE.md
"revisa el proyecto y actualiza CLAUDE.md para que refleje el estado actual"
```

### Bugs y debugging

```bash
# Bug específico
"cuando creo una sala y el oponente se une, el timer no arranca para el jugador blanco"

# Investigación
"revisa lobbyHandler.ts y gameHandler.ts y dime si hay algún problema con el manejo de errores"

# Race conditions
"¿puede haber un problema si dos jugadores intentan hacer move al mismo tiempo?"
```

### Features nuevas

```bash
# Feature con contexto claro
"agrega notificación sonora cuando es tu turno — solo un beep suave"

# Feature compleja
"implementa un sistema de revancha: al terminar la partida, cualquier jugador puede proponer jugar de nuevo"

# Feature de analytics
"agrega tracking de cuántas partidas se juegan por día — en DynamoDB, sin servicios externos"
```

### Código y calidad

```bash
# Code review
"revisa ChessBoardWrapper.tsx y dime si hay algún problema de rendimiento"

# Refactor específico
"extrae la lógica de Elo de playerService.ts a una función pura en utils/elo.ts y agrega tests"

# Tipado
"el tipo Player tiene color? como opcional pero siempre se asigna, ¿cómo mejoramos esto?"
```

### Infraestructura AWS

```bash
# Despliegue
"genera el stack CDK completo para desplegar en us-east-1 con el presupuesto de $30/mes"

# Costo
"estima el costo para 100 partidas simultáneas con Stockfish activo"

# Seguridad
"revisa que el stack CDK no tenga recursos públicos sin autenticación"

# Troubleshooting
"el deploy de CloudFormation falló con este error: [pegar error]"
```

---

## 9. Comandos slash disponibles

Los comandos slash son atajos que activan workflows predefinidos:

```bash
/deploy        # Analiza el proyecto y genera/aplica infraestructura AWS
/commit        # Crea un commit con mensaje semántico bien formateado
/review-pr     # Revisa un pull request de GitHub
```

### Ejemplo: `/commit`

```
Tú: /commit

Claude: [revisa git status y git diff]
        [lee los últimos commits para seguir el estilo]
        [redacta mensaje semántico]
        [hace git add de los archivos relevantes]
        [crea el commit]
```

### Ejemplo: `/deploy`

```
Tú: /deploy

Claude: [analiza package.json, docker-compose.yml, CLAUDE.md]
        [identifica servicios AWS necesarios]
        [genera stack CDK o CloudFormation]
        [valida la plantilla]
        [presenta el plan y pide confirmación antes de desplegar]
```

---

## 10. Flujos de trabajo documentados

Estas son sesiones reales de desarrollo en este proyecto:

### Sesión 1 — Auditoría inicial del proyecto

**Prompt**: "realiza revision del proyecto y ajusta el claude.md"

**Lo que hizo Claude:**
- Leyó `package.json` de frontend y backend para verificar dependencias reales
- Comparó lo que decía `CLAUDE.md` vs lo que existe en el código
- Corrigió: Stockfish usa `child_process.fork()` + IPC, no Worker Threads
- Corrigió: las claves de DynamoDB son `pk`/`sk`, no `gameId`/`createdAt`
- Agregó: `docker-compose.yml`, `DYNAMODB_ENDPOINT`, `react-router-dom`, `zod`

**Lección**: CLAUDE.md puede quedar desactualizado — pedir revisión periódica es buena práctica.

---

### Sesión 2 — Leaderboard y sistema de Elo

**Prompt**: "podemos agregar alguna tabla de mejores puntajes o ganadores?"

**Lo que hizo Claude:**
- Leyó `playerService.ts` y descubrió que `getLeaderboard()` ya existía pero no se llamaba
- Leyó `gameHandler.ts` para entender los puntos de fin de partida
- Implementó `updatePlayerStats()` con Elo estándar K=32
- Conectó la llamada en los 3 puntos de `game_over`: checkmate, resignación, empate
- Creó `LeaderboardPage.tsx`, ruta `/leaderboard`, link en Navbar

**Lección**: Claude encontró código que ya existía y lo conectó en lugar de duplicarlo.

---

### Sesión 3 — Fix de bugs críticos

**Prompt**: "cuando se crea un juego para que un usuario se suba no permite eliminar, y si el usuario quiere salir tampoco deja"

**Lo que hizo Claude:**
- Identificó 3 root causes leyendo `lobbyHandler.ts`, `gameHandler.ts`, `GamePage.tsx` y `types/index.ts`
- Root cause 1: no existe evento `CANCEL_ROOM` en ningún lado
- Root cause 2: `LEAVE_GAME` solo hace `socket.leave()` sin cambiar estado en DDB
- Root cause 3: `GamePage` renderiza tablero aunque `game.status === 'waiting'`
- Implementó `CANCEL_ROOM` en backend (types + handler + service)
- Implementó `CANCEL_ROOM` en frontend (types + GamePage)
- Creó componente `WaitingRoom` con link de invitación y botón Cancel
- Documentó los bugs en `CLAUDE.md` para no reintroducirlos

**Lección**: Describir el síntoma (no la solución técnica) permite a Claude identificar múltiples root causes.

---

### Sesión 4 — Leaderboard como drawer

**Prompt**: "el Leaderboard busca un mejor lugar donde agregarlo puede ser un botón"

**Lo que hizo Claude:**
- Convirtió la ruta `/leaderboard` en un drawer lateral con `framer-motion`
- Creó `uiStore.ts` con Zustand para el estado del drawer
- Actualizó Navbar con botón 🏆 (texto en desktop, solo icono en mobile)
- Hizo la card de Leaderboard en LandingPage clickeable para abrir el drawer
- Eliminó `LeaderboardPage.tsx` y la ruta de `App.tsx`
- Creó `Footer.tsx` con créditos de roxs

---

## 11. Buenas prácticas para el equipo

### Al usar Claude Code

**✅ Hacer:**
- Describir el comportamiento esperado vs el comportamiento actual
- Mostrar mensajes de error completos
- Pedir que Claude lea el código antes de proponer cambios
- Revisar los cambios antes de aprobarlos
- Actualizar `CLAUDE.md` cuando corrijas algo importante

**❌ No hacer:**
- Pegar código enorme en el prompt — Claude puede leer los archivos directamente
- Aceptar todos los cambios sin revisarlos
- Usar Claude Code para subir secretos o credenciales a git
- Ignorar cuando Claude dice que no puede hacer algo sin más información

### Al actualizar CLAUDE.md

Añade entradas en estas secciones cuando corresponda:

```markdown
## Bugs corregidos (no reintroducir)
| Bug nuevo | Causa raíz | Solución implementada |

## Restricciones de arquitectura
# Si agregas una nueva regla arquitectónica

## Eventos WebSocket
# Si agregas un nuevo evento, actualizar aquí Y en ambos types/index.ts
```

### Sincronizar tipos entre frontend y backend

Los `SOCKET_EVENTS` y tipos de `GameState` están en **dos archivos**:
- `backend/src/types/index.ts`
- `frontend/src/types/index.ts`

Siempre que agregues un evento o cambies un tipo, actualiza ambos. Claude Code lo hace automáticamente si se lo indicas.

> **Deuda técnica conocida**: en el futuro estos tipos deberían estar en un paquete compartido `/shared`. Cuando se haga, actualizar `CLAUDE.md`.

---

## 12. Preguntas frecuentes

**¿Claude Code modifica archivos sin pedir permiso?**
Depende del modo de permisos. En el modo por defecto, pide confirmación antes de editar archivos o ejecutar comandos. Puedes aprobar acciones individualmente o configurar permisos automáticos.

**¿Puedo usar Claude Code sin conexión a internet?**
No. Claude Code requiere conectividad para llamar a la API de Anthropic.

**¿Cuánto cuesta usar Claude Code?**
Los costos dependen del modelo y uso. Ver precios actuales en anthropic.com/pricing. El CLI te muestra el costo al final de cada sesión con `/cost`.

**¿Claude Code tiene acceso a mis credenciales AWS?**
Solo si están en tu entorno (`~/.aws/credentials` o variables de entorno). No las lee directamente — solo las usa si ejecuta comandos de AWS CLI. Nunca las escribe en archivos de código.

**¿Qué pasa si Claude hace un cambio incorrecto?**
Usa `git diff` para revisar y `git checkout -- .` para revertir. Claude Code no hace commits automáticamente — necesitas hacerlo explícitamente con `/commit`.

**¿Puedo tener múltiples sesiones de Claude Code abiertas?**
Sí, pero cada sesión tiene su propio contexto. Para trabajo coordinado, usa una sola sesión.

**¿Cómo sé si CLAUDE.md está desactualizado?**
Pide: `"revisa el proyecto y compara con CLAUDE.md — ¿hay algo desactualizado?"`. Claude comparará el código real contra las instrucciones y reportará diferencias.

---

*Built by [roxs](https://github.com/roxsross) · Powered by Claude Code + AWS*
