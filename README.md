# Backend Server — Collaborative Meeting & Coding Platform

Node.js REST API and Socket.IO server for a real-time collaboration workspace: user authentication, meeting rooms, live code editing, whiteboard, chat, WebRTC signaling, code execution, and dashboard analytics.

**Base URL:** `http://localhost:{PORT}/api/v1`  
**Default port:** `3000` (set via `PORT` in `.env`)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Authentication](#authentication)
- [REST API Reference](#rest-api-reference)
- [Dashboard API](#dashboard-api)
- [Meeting & Session Flow](#meeting--session-flow)
- [Private Rooms](#private-rooms)
- [Socket.IO Events](#socketio-events)
- [Code Execution](#code-execution)
- [Middleware](#middleware)
- [Error Responses](#error-responses)
- [Known Limitations](#known-limitations)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| HTTP | Express 5 |
| Real-time | Socket.IO 4 |
| ORM | Sequelize 6 |
| Database | MySQL (via `mysql2`) |
| Auth | JWT (access + refresh), Argon2 password hashing |
| Validation | Joi |
| File uploads | Multer + Cloudinary |
| Email | Nodemailer + EJS templates |
| Code execution | Judge0 CE (via Axios) |

---

## Project Structure

```
backendserver/
├── src/
│   ├── server.js              # HTTP server + Socket.IO bootstrap
│   ├── app.js                 # Express app, CORS, routes, error handler
│   ├── config/config.js       # Sequelize database config
│   ├── routes/                # API route modules
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── models/                # Sequelize models + associations
│   ├── middleware/            # Auth, refresh token, multer
│   ├── socket/index.js        # All Socket.IO handlers
│   ├── migrations/            # Database migrations
│   ├── seeders/               # Role seed data
│   ├── validation/            # Joi schemas
│   └── utils/                 # Tokens, mail, Cloudinary, errors
├── .sequelizerc
└── package.json
```

**Architecture:** Routes → Controllers → Services → Models

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL database
- (Optional) Cloudinary account for profile pictures
- (Optional) SMTP server for email verification
- (Optional) Judge0 API key for code execution

### Installation

```bash
cd backendserver
npm install
```

### Configure environment

Create a `.env` file in `backendserver/` (see [Environment Variables](#environment-variables)).

### Database setup

```bash
npm run dev:migrate
npm run dev:seed
```

This creates tables and seeds roles: **Admin** (id: 1), **User** (id: 2).

### Run the server

```bash
node src/server.js
```

> **Note:** `package.json` scripts reference `server.js` at the root. The actual entry file is `src/server.js`. Use `node src/server.js` or update the scripts to `"dev": "nodemon src/server.js"`.

Server starts on `http://localhost:3000` (or your `PORT`).

### CORS

REST API allows `http://localhost:5173` with `credentials: true` (Vite frontend).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | No | `production` enables secure cookies |
| `DB_HOST` | Yes | Database host |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `DB_DIALECT` | Yes | e.g. `mysql` |
| `JWT_ACCESS_SECRET` | Yes | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret |
| `ACTIVATION_TOKEN_SECRET` | Yes | Email activation JWT secret |
| `SMTP_HOST` | For email | Mail server host |
| `SMTP_PORT` | For email | Mail port (default: `587`) |
| `SMTP_SERVICE` | For email | Nodemailer service name |
| `SMTP_MAIL` | For email | Sender email address |
| `SMTP_PASSWORD` | For email | SMTP password |
| `CLOUD_NAME` | For uploads | Cloudinary cloud name |
| `API_KEY` | For uploads | Cloudinary API key |
| `API_SECRET` | For uploads | Cloudinary API secret |
| `JUDGE0_API_URL` | No | Judge0 endpoint (default: `https://ce.judge0.com`) |
| `JUDGE0_API_KEY` | No | RapidAPI key for Judge0 |
| `JUDGE0_RAPIDAPI_HOST` | No | Default: `judge0-ce.p.rapidapi.com` |

---

## Database

### Models

| Model | Table | Purpose |
|-------|-------|---------|
| `Role` | `roles` | Admin / User roles |
| `User` | `users` | Accounts, profile, lockout fields |
| `Session` | `sessions` | Auth refresh-token sessions (multi-device) |
| `Room` | `rooms` | Collaboration rooms |
| `Message` | `messages` | Chat messages per room |
| `SessionRoom` | `sessions_rooms` | Meeting session lifecycle |
| `CodeSnapshot` | `code_snapshots` | Saved code versions |

### Room fields

| Field | Type | Notes |
|-------|------|-------|
| `room_id` | string | Unique ID, format `room_{timestamp}` |
| `room_name` | string | Display name |
| `room_type` | string | e.g. Frontend Interview, DSA Practice |
| `is_private` | boolean | Private rooms require host approval |
| `created_by` | integer | Host user ID |
| `participants` | JSON | Reserved (not actively synced) |

### Relationships

```
Role 1──* User 1──* Session (auth)
              │
              ├──* Room 1──* Message
              │         ├──* SessionRoom
              │         └──* CodeSnapshot
```

---

## Authentication

### Registration & activation

1. `POST /auth/register` — validates input, hashes password (Argon2), optional profile picture upload to Cloudinary
2. Sends activation email with 4-digit code
3. Returns activation JWT (user is **not** in DB until activated)
4. `POST /auth/activate-user` — verifies token + code, creates user (`is_active: true`, `is_verified: true`)

### Login

1. `POST /auth/login` — email + password
2. On failure: increments `failed_login_attempts`; locks account for 12 hours after 5 failures
3. On success: returns access token (15 min) + user profile; sets `refreshToken` httpOnly cookie (7 days)
4. Upserts device session in `sessions` table (IP + device info)

### Token usage

| Context | How to authenticate |
|---------|---------------------|
| REST API | `Authorization: Bearer <accessToken>` |
| Socket.IO | `handshake.auth.token = <accessToken>` |
| Refresh | `POST /auth/refresh-token` with `refreshToken` cookie |

### Logout

| Endpoint | Behavior |
|----------|----------|
| `POST /auth/logout` | Revokes current session, clears cookie |
| `POST /auth/logout-all` | Revokes all user sessions (Bearer required) |
| `POST /auth/logout-selected` | Revokes one session by `sessionId` |

### Token payload

```json
{ "id": 1, "role": 2 }
```

---

## REST API Reference

**Success response:**

```json
{ "success": true, "message": "...", "data": { } }
```

**Error response:**

```json
{ "success": false, "message": "...", "status": "error" }
```

---

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Register user (multipart: username, email, password, full_name, optional profile_pic) |
| POST | `/activate-user` | None | Activate account `{ activation_token, activation_code }` |
| POST | `/login` | None | Login `{ email, password }` → `{ token, user }` |
| POST | `/refresh-token` | Cookie | New access token from refresh cookie |
| POST | `/logout` | Cookie | Logout current device |
| POST | `/logout-all` | Bearer | Logout all devices |
| POST | `/logout-selected` | Bearer | Logout specific session `{ sessionId }` |
| GET | `/profile` | Bearer | Get current user profile |
| PUT | `/profile` | Bearer | Update profile (optional profile_pic upload) |
| PUT | `/change-password` | Bearer | Change password |
| GET | `/sessions` | Bearer | List active login sessions |
| GET | `/users` | Bearer | List all users |
| DELETE | `/users/:id` | Bearer | Delete user by ID |

---

### Rooms — `/api/v1/room`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Bearer | Dashboard stats, recent rooms, activities |
| GET | `/get-all-rooms` | Bearer | Rooms visible to user (public + own private) |
| POST | `/create-room` | Bearer | Create room |
| GET | `/get-room/:id` | Bearer | Get room by `room_id` |
| PUT | `/update-room/:id` | Bearer | Update room |

**Create room body:**

```json
{
  "room_name": "Frontend Interview",
  "description": "Optional",
  "room_type": "Frontend Interview",
  "is_private": false
}
```

**Get room response includes:**

```json
{
  "room_id": "room_1234567890",
  "room_name": "...",
  "room_type": "...",
  "is_private": false,
  "created_by": 1,
  "is_host": true,
  "can_join": true,
  "creator": { "id": 1, "name": "...", "email": "...", "profile_pic": "..." }
}
```

---

### Messages — `/api/v1/messages`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:roomId` | Bearer | Chat history (ascending) with sender info |
| POST | `/` | Bearer | Send message `{ room_id, message }` |

---

### Sessions (meetings) — `/api/v1/session`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/start` | Bearer | Start or return active session `{ room_id }` |
| POST | `/end` | Bearer | End session (host only) |
| GET | `/:roomId` | Bearer | Active session or most recent ended session |

**End session body:**

```json
{
  "room_id": "room_1234567890",
  "final_code": "optional source code",
  "participants": [],
  "whiteboard_data": []
}
```

---

### Code snapshots — `/api/v1/code-snapshot`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:roomId` | Bearer | Latest code snapshot or `null` |
| POST | `/` | Bearer | Save snapshot `{ room_id, code, language }` |

---

### Code execution — `/api/v1/code`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/execute` | Bearer | Run code via Judge0 `{ source_code, language }` |

**Supported languages:** `javascript`, `python`, `java`, `cpp`, `go`, `rust`

**Response:**

```json
{
  "stdout": "",
  "stderr": "",
  "compile_output": "",
  "status": "Accepted",
  "time": 0.01,
  "memory": 1024,
  "success": true
}
```

---

## Dashboard API

**`GET /api/v1/room/dashboard`** (Bearer required)

Returns workspace summary for the authenticated user.

```json
{
  "stats": {
    "totalRooms": 24,
    "activeMeetings": 8,
    "completedSessions": 156,
    "totalParticipants": 12
  },
  "recentRooms": [
    {
      "id": 1,
      "room_id": "room_1234567890",
      "name": "Frontend Interview",
      "participants": 4,
      "status": "Active",
      "createdAt": "2026-07-06T10:00:00.000Z",
      "is_private": false
    }
  ],
  "recentActivities": [
    {
      "id": 1,
      "user": "Karan Kumar",
      "action": "sent a message in \"Frontend Interview\"",
      "time": "2026-07-06T10:05:00.000Z"
    }
  ]
}
```

| Stat | Source |
|------|--------|
| `totalRooms` | Count of public rooms + user's private rooms |
| `activeMeetings` | `SessionRoom` records where `end_at` is null |
| `completedSessions` | `SessionRoom` records where `end_at` is set |
| `totalParticipants` | Sum of participant counts in active sessions |
| `recentRooms` | Latest 5 visible rooms with active/completed status |
| `recentActivities` | Latest 10 messages (filtered for private room visibility) |

---

## Meeting & Session Flow

### 1. Create room

`POST /room/create-room` → server generates `room_id` as `room_{timestamp}`.

### 2. Join room (client-side)

1. Navigate to meeting URL with `room_id`
2. Connect Socket.IO with access token
3. Emit `join_room` (private rooms may require host approval — see below)
4. `POST /session/start` to begin or resume meeting session

### 3. During meeting (real-time via Socket.IO)

- Live code sync (`code_change`)
- Chat (`send_message` — also persisted to DB)
- Whiteboard drawing (in-memory on server, replayed on join)
- Participant list with mic/camera/hand-raise state
- WebRTC signaling (offer/answer/ICE)
- Typing indicators and remote cursors

### 4. Persistence (REST)

- Code auto-saved via `POST /code-snapshot`
- Chat history via `GET /messages/:roomId`
- Session end saves `final_code`, `participants`, `whiteboard_data`

### 5. End meeting

- Host calls `POST /session/end`
- Client emits socket `meeting_end` to notify all participants
- Active session gets `end_at` timestamp

---

## Private Rooms

When `is_private: true` on a room:

### REST enforcement

| Action | Rule |
|--------|------|
| List rooms / dashboard | User sees public rooms + only their own private rooms |
| Get room | Returns `can_join: false` for non-hosts |
| Start session | Non-host receives `403 Forbidden` |

### Socket enforcement

1. **Host** (`created_by === user.id`) joins immediately
2. **Previously approved guest** joins immediately (in-memory approval set)
3. **Other users** → placed in pending queue:
   - Guest receives `join_pending`
   - Host receives `join_request` with user details
4. Host emits `approve_join` or `deny_join`:
   - **Approve** → guest joins room, receives `join_approved`
   - **Deny** → guest receives `join_denied`
5. When host joins, pending requests are re-sent to the host

### Message gate (socket)

Non-host users on private rooms must be approved before `send_message` is accepted.

> **Note:** Approval state is stored in server memory and is lost on server restart.

---

## Socket.IO Events

**Connection:** Client must pass JWT in `auth.token`.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId }` | Join meeting room |
| `approve_join` | `{ roomId, userId }` | Host approves guest (private rooms) |
| `deny_join` | `{ roomId, userId }` | Host denies guest (private rooms) |
| `leave_room` | `{ roomId? }` | Leave room |
| `send_message` | `{ roomId, message }` | Send chat message |
| `code_change` | `{ roomId, code, language }` | Sync code editor |
| `typing` | `{ roomId }` | Typing indicator on |
| `stop_typing` | `{ roomId }` | Typing indicator off |
| `cursor_move` | `{ roomId, line, column }` | Remote cursor position |
| `whiteboard_draw` | `{ roomId, action }` | Draw on whiteboard |
| `whiteboard_clear` | `{ roomId }` | Clear whiteboard |
| `raise_hand` | `{ roomId }` | Raise hand |
| `lower_hand` | `{ roomId }` | Lower hand |
| `media_state` | `{ roomId, isMicMuted?, isCameraOff?, isSpeaking? }` | Media state update |
| `webrtc_offer` | `{ targetSocketId, offer }` | WebRTC offer |
| `webrtc_answer` | `{ targetSocketId, answer }` | WebRTC answer |
| `ice_candidate` | `{ targetSocketId, candidate }` | ICE candidate |
| `meeting_end` | `{ roomId }` | Broadcast meeting ended |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `join_pending` | `{ roomId, message }` | Waiting for host approval |
| `join_request` | `{ roomId, user }` | Someone wants to join (host only) |
| `join_approved` | `{ roomId }` | Join succeeded |
| `join_denied` | `{ roomId, message }` | Join rejected |
| `user_joined` | `{ user }` | Participant joined |
| `user_left` | `{ user }` | Participant left |
| `participants_list` | `{ participants }` | Full participant list |
| `whiteboard_state` | `{ actions }` | Whiteboard replay on join |
| `receive_message` | `{ message }` | New chat message |
| `code_change` | `{ roomId, code, language, userId }` | Remote code update |
| `typing` / `stop_typing` | user info | Typing indicators |
| `cursor_move` | `{ userId, name, line, column }` | Remote cursor |
| `whiteboard_draw` / `whiteboard_clear` | action / `{}` | Whiteboard sync |
| `webrtc_offer` / `webrtc_answer` / `ice_candidate` | signaling data | WebRTC P2P |
| `meeting_end` | `{ roomId }` | Meeting ended |
| `error` | `{ message }` | Error notification |

### In-memory server state

| Map | Purpose |
|-----|---------|
| `roomParticipants` | Active participants per room |
| `roomWhiteboards` | Whiteboard strokes per room |
| `pendingJoinRequests` | Pending private-room join requests |
| `approvedUsers` | Approved user IDs per private room |

---

## Code Execution

Uses **Judge0 CE** to compile and run code server-side.

| Language | Judge0 ID |
|----------|-----------|
| javascript | 63 |
| python | 71 |
| java | 62 |
| cpp | 54 |
| go | 60 |
| rust | 73 |

Live code collaboration uses Socket.IO `code_change` (not executed). Snapshots persist via `/code-snapshot`.

---

## Middleware

| Middleware | File | Purpose |
|------------|------|---------|
| `authMiddleware` | `auth.middleware.js` | Validates Bearer access token |
| `verifyRefreshToken` | `refreshToken.middleware.js` | Validates refresh cookie + DB session |
| `upload` | `multerMiddleware.js` | Profile picture upload (JPG/PNG, max 5MB) |
| `validate(schema)` | `utils/validate.js` | Joi request body validation |
| `globalErrorHandler` | `utils/globalerror.js` | Centralized error responses |
| Socket `io.use` | `socket/index.js` | JWT auth on WebSocket connect |

---

## Error Responses

| Status | When |
|--------|------|
| 400 | Validation failure |
| 401 | Missing/invalid token |
| 403 | Forbidden (e.g. private room, non-host end session) |
| 404 | Resource not found |
| 500 | Server error |

---

## Known Limitations

- Private room approvals are **in-memory only** (lost on restart)
- No `room_participants` database table; participant tracking is socket-based
- Whiteboard live state is in-memory; persisted only if sent on session end
- `description` field accepted on room create/update but not in DB schema
- `express-rate-limit` is installed but not wired up
- Admin-only routes (`/auth/users`) do not enforce role checks in middleware
- `package.json` start scripts point to wrong entry file — use `src/server.js`

---

## NPM Scripts

| Script | Command |
|--------|---------|
| `npm run dev:migrate` | Run Sequelize migrations |
| `npm run dev:migrate:undo` | Undo last migration |
| `npm run dev:seed` | Seed roles |
| `npm run dev:seed:undo` | Undo seeders |

---

## Related

Frontend app: `../frontend` — connects to this API at `VITE_API_BASE_URL` and Socket.IO at `VITE_SOCKET_URL`.
