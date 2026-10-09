# Collabify

A real-time team collaboration platform with Kanban boards, collaborative documents, notifications, and AI-powered board summaries.

## Features

- **Authentication** — Register, login, JWT access tokens with httpOnly refresh cookies
- **Workspaces** — Multi-workspace support with role-based access (admin, member, viewer)
- **Kanban Boards** — Drag-and-drop task management with real-time sync across clients
- **Collaborative Docs** — Markdown editor with live cursors, typing sync, and auto-save
- **Notifications** — Real-time bell notifications with sound alerts
- **AI Board Summary** — Groq-powered kanban board analysis and suggestions
- **Profile Management** — Avatar upload (Cloudinary), bio, password change
- **Due Date Reminders** — Daily cron job at 9:00 AM for tasks due tomorrow

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router, Socket.io Client |
| Backend | Node.js, Express, Socket.io, Mongoose, JWT, bcrypt |
| Database | MongoDB |
| AI | Groq SDK (Llama 3) |
| Storage | Cloudinary (avatars) |
| Other | node-cron, @hello-pangea/dnd, TipTap |

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string
- Cloudinary account (for avatar uploads)
- Groq API key (for AI summaries)

### 1. Clone and install

```bash
git clone <repo-url>
cd Collabify_nnn

cd server && npm install
cd ../client && npm install
```

### 2. Environment variables

**`server/.env`**

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/collabify
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama3-70b-8192
NODE_ENV=development
```

**`client/.env`**

```env
VITE_SERVER_URL=http://localhost:5000
```

### 3. Run

```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Screenshots

Add screenshots here.

## API Overview

| Route Group | Base Path | Description |
|-------------|-----------|-------------|
| Auth | `/api/auth` | Register, login, refresh, logout, me |
| Workspaces | `/api/workspaces` | CRUD, members, invites |
| Boards | `/api/boards` | CRUD, columns, AI summary |
| Tasks | `/api/tasks` | CRUD, reorder, comments, attachments |
| Docs | `/api/docs` | CRUD for collaborative documents |
| Notifications | `/api/notifications` | List, mark read, delete |
| Users | `/api/users` | Profile, password, dashboard stats |
| Dev | `/api/dev/trigger-reminders` | Manually run reminder cron (non-production) |

### Socket Events

**Client → Server:** `workspace:join`, `workspace:leave`, `board:join`, `board:leave`, `doc:join`, `doc:leave`, `doc:typing`, `cursor:move`

**Server → Client:** `task:created`, `task:updated`, `task:deleted`, `board:updated`, `doc:update`, `cursor:update`, `notification:new`

## Built By

Collabify — Portfolio project demonstrating full-stack real-time collaboration.
