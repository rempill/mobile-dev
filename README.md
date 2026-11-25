# PitStop - Car Maintenance & Mileage Tracker

PitStop is a native Android application (with a Node.js + SQLite backend) designed to help users track vehicle maintenance intervals, repair costs, and service history with offline-first capability and real-time cloud synchronization.

---

## App Features

### 1. Item Data Model
Each service record includes:
* `id` (String): Unique identifier (UUID) for database indexing and client routing.
* `userId` (String): Unique user reference ensuring strict multi-tenant vehicle data isolation.
* `serviceName` (String): Description of the service (e.g., `"Oil & Filter Change"`).
* `cost` (Numeric): Non-negative financial cost of the service (e.g., `85.50`).
* `mileage` (Numeric): Vehicle odometer reading at the time of service (e.g., `124500`).
* `serviceDate` (String / Date): Service date formatted as `YYYY-MM-DD`.
* `category` (String): Service classification (`"Maintenance"`, `"Repair"`, `"Inspection"`).
* `isCompleted` (Boolean): Service completion status (scheduled vs. completed).
* `location` (Object): `{ lat: number, lng: number }` coordinates for the repair shop map pin.
* `photoUrl` (String, Optional): Server-managed, JWT-protected, versioned URL for the uploaded receipt photo.
* `createdAt` (ISO Date String): Server timestamp of record creation.

### 2. Authentication & Data Isolation
* **JWT Authentication:** Secure user signup (`/api/auth/register`) and login (`/api/auth/login`) with JSON Web Tokens.
* **User Isolation:** All REST endpoints and WebSocket channels strictly isolate service items by authenticated user ID.
* _Android client implementation: TBD_

### 3. Offline-First & Background Sync
* _Android client implementation: TBD_

### 4. Real-Time Synchronization (WebSockets)
* **Authenticated WebSocket Connection:** Handshake-level JWT validation over `ws://localhost:4000/ws?token=<token>`.
* **User-Scoped Events:** Real-time push events (`ITEM_CREATED`, `ITEM_UPDATED`, `ITEM_DELETED`) delivered exclusively to the active user's connected sessions.
* **Resilient Connection:** 30-second ping/pong heartbeat to detect dropped sockets.
* _Android client implementation: TBD_

### 5. Search, Filtering & Pagination
* **Server Queries:** Paginated queries (`page`, `limit`, `total`, `totalPages`, `hasMore`), search by name, and category filtering (`All`, `Maintenance`, `Repair`, `Inspection`).
* _Android client implementation: TBD_

### 6. Native Capabilities & UI
* _Android client implementation: TBD_

---

## Tech Stack

### Android Client
* _TBD (Android SDK)_

### Backend (Server)
* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js (v5)
* **Language:** TypeScript with `tsx` / `ts-node-dev`
* **Database:** SQLite via `better-sqlite3` (configured with WAL mode & versioned schema migrations)
* **File Uploads:** `multer` (multipart/form-data receipt photo uploads)
* **Authentication:** JSON Web Tokens (`jsonwebtoken`)
* **Real-Time Communication:** `ws` (WebSockets with authenticated handshake & heartbeat checks)
* **CORS & Environment:** `cors`, `dotenv`

---

## Project Structure

```text
mobile-dev/
├── package.json              # Root scripts for running the backend server
└── server/                   # Backend Express + SQLite server
    ├── src/
    │   ├── controllers/      # REST endpoint controllers (CRUD, pagination & photo uploads)
    │   ├── middleware/       # JWT authentication and route protection middleware
    │   ├── routes/           # Express route definitions (/api/items, /api/auth)
    │   ├── store/            # SQLite database schema, migrations, user store, and service item store
    │   ├── types/            # Backend types and WebSocket event definitions
    │   ├── ws/               # WebSocket server and scoped broadcast service
    │   └── index.ts          # Server entry point & HTTP/WS listener
    └── pitstop.db            # Persistent SQLite database file
```

---

## Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* npm (v9 or higher)
* Android Studio / Android SDK _(for the Android app)_

### Backend Setup & Running
Install dependencies for the root workspace and server:

```bash
# Install root dependencies
npm install

# Install server dependencies
npm --prefix server install
```

Start the backend server:

```bash
npm run server
# or: npm run dev
# Server runs on http://localhost:4000
# WebSocket listener runs on ws://localhost:4000/ws
```

### Android Client Setup
* _TBD_

---

## Default Demo Accounts

The backend database automatically initializes with seed accounts and sample vehicle service logs on first launch:

| Email | Password | Role |
| :--- | :--- | :--- |
| `demo@pitstop.com` | `password123` | Demo User (Alex Rivera) |
| `second@pitstop.com` | `password123` | Secondary Test User (Jordan Smith) |

You can also register a new account at any time via `/api/auth/register`.
