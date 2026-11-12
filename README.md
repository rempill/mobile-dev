# PitStop - Car Maintenance & Mileage Tracker

PitStop is a cross-platform mobile application designed to help users track vehicle maintenance intervals, repair costs, and service history with seamless offline-first capability and real-time cloud synchronization.

---

## App Features

### 1. Item Data Model
Each service record includes:
* `id` (String): Unique identifier (UUID) for database indexing and client routing (temporary `temp-*` IDs assigned during offline creation).
* `userId` (String): Unique user reference ensuring strict multi-tenant vehicle data isolation.
* `serviceName` (String): Description of the service (e.g., `"Oil & Filter Change"`).
* `cost` (Numeric): Non-negative financial cost of the service (e.g., `85.50`).
* `mileage` (Numeric): Vehicle odometer reading at the time of service (e.g., `124500`).
* `serviceDate` (String / Date): Service date formatted as `YYYY-MM-DD`.
* `category` (String): Service classification (`"Maintenance"`, `"Repair"`, `"Inspection"`).
* `isCompleted` (Boolean): Service completion status (scheduled vs. completed).
* `location` (Object): `{ lat: number, lng: number }` coordinates for the repair shop map pin.
* `createdAt` (ISO Date String): Server timestamp of record creation.
* `_syncStatus` (String, Client-only): Optimistic sync state (`"synced"` or `"pending"`) for items queued while offline.

### 2. Authentication & Data Isolation
* **JWT Authentication:** Secure user signup (`/api/auth/register`) and login (`/api/auth/login`) with JSON Web Tokens.
* **Client Route Guards:** Client-side route protection (`PrivateRouteGuard`, `AuthRouteGuard`) protecting routes (`/items`, `/items/new`, `/items/:id`) and redirecting unauthenticated users to `/login`.
* **Persistent Sessions:** Auth tokens and active user profile persisted on the device via `@ionic/storage`.
* **User Isolation:** All REST endpoints and WebSocket channels strictly isolate service items by authenticated user ID.

### 3. Offline-First & Background Sync
* **Local Persistent Storage:** Offline caching of service records and auth credentials powered by `@ionic/storage` (`_pitstop_storage`).
* **Real-time Connectivity Monitoring:** Live network status detection using `@capacitor/network`, surfaced via an interactive status chip in the app header (`Online` / `Offline`).
* **Optimistic Offline CRUD:** Create, update, and delete service records while offline. Offline mutations are enqueued into a persistent `SYNC_QUEUE` with immediate UI updates and visual "Pending Sync" badges.
* **Automated Reconciliation:** Automatic queue synchronization and cache refresh as soon as network connectivity is restored, accompanied by non-intrusive toast notifications.

### 4. Real-Time Synchronization (WebSockets)
* **Authenticated WebSocket Connection:** Handshake-level JWT validation over `ws://localhost:4000/ws?token=<token>`.
* **User-Scoped Events:** Real-time push events (`ITEM_CREATED`, `ITEM_UPDATED`, `ITEM_DELETED`) delivered exclusively to the active user's connected sessions.
* **Resilient Connection:** Automatic reconnection with exponential backoff and a 30-second ping/pong heartbeat to detect dropped sockets.
* **Interactive Notifications:** In-app toast alerts triggered by live server-side changes and sync updates.

### 5. Search, Filtering & Pagination
* **Search:** Filter service records by name in real time (supported both server-side via SQL `LIKE` and client-side offline over cached items).
* **Category Filtering:** Filter items by category (`All`, `Maintenance`, `Repair`, `Inspection`).
* **Infinite Scroll & Refresh:** Server-side paginated queries (`page`, `limit`, `total`, `totalPages`, `hasMore`) with smooth mobile infinite scrolling (`IonInfiniteScroll`) and pull-to-refresh (`IonRefresher`).

### 6. Native Capabilities & UI Animations
* **Native Bridges:** Hardware camera integration (`@capacitor/camera`) to photograph invoices/receipts and haptics (`@capacitor/haptics`).
* **Fluid UI/UX:** Mobile swipe gestures (`IonItemSliding`), expanding card animations, contextual badges, floating action buttons, and responsive dark mode support.

---

## Tech Stack

### Frontend (Client)
* **Framework:** Ionic Framework (v9) with React (v19)
* **Language:** TypeScript (~5.9)
* **Build Tool:** Vite (v8)
* **Routing:** React Router DOM (v6) with Ionic React Router
* **Native Runtime:** Capacitor (v8) (`@capacitor/core`, `@capacitor/network`, `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/preferences`)
* **Storage:** `@ionic/storage` (IndexedDB / LocalStorage abstraction)
* **HTTP Client:** Axios (configured with automatic JWT bearer interceptors)
* **Icons:** Ionicons (v8)

### Backend (Server)
* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js (v5)
* **Language:** TypeScript with `tsx` / `ts-node-dev`
* **Database:** SQLite via `better-sqlite3` (configured with WAL mode for performance)
* **Authentication:** JSON Web Tokens (`jsonwebtoken`)
* **Real-Time Communication:** `ws` (WebSockets with authenticated handshake & heartbeat checks)
* **CORS & Environment:** `cors`, `dotenv`

---

## Project Structure

```text
mobile-dev/
├── package.json              # Monorepo root scripts (concurrent dev server execution)
├── client/                   # Frontend Ionic + React application
│   ├── src/
│   │   ├── context/          # React Context (ItemContext state, sync pipeline, WS events)
│   │   ├── pages/            # View components (Login, ItemList, ItemDetail)
│   │   ├── services/         # API (Axios), Storage (@ionic/storage), and WebSocket client
│   │   ├── types/            # TypeScript data interfaces and DTOs
│   │   └── App.tsx           # Route setup and authentication route guards
│   ├── capacitor.config.ts   # Capacitor mobile configuration
│   └── vite.config.ts        # Vite build configuration
└── server/                   # Backend Express + SQLite server
    ├── src/
    │   ├── controllers/      # REST endpoint controllers (CRUD & pagination)
    │   ├── middleware/       # JWT authentication and route protection middleware
    │   ├── routes/           # Express route definitions (/api/items, /api/auth)
    │   ├── store/            # SQLite database schema, user store, and service item store
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

### Installation
Clone the repository and install dependencies for the root workspace, client, and server:

```bash
# Install root dependencies
npm install

# Install client dependencies
npm --prefix client install

# Install server dependencies
npm --prefix server install
```

### Running the Application

You can launch both the frontend and backend concurrently with a single command from the project root:

```bash
npm run dev
```

Alternatively, you can run them individually:

* **Start Backend Server:**
  ```bash
  npm run server
  # Server runs on http://localhost:4000
  # WebSocket listener runs on ws://localhost:4000/ws
  ```

* **Start Frontend Client:**
  ```bash
  npm run client
  # Client runs on http://localhost:5173
  ```

---

## Default Demo Accounts

The backend database automatically initializes with seed accounts and sample vehicle service logs on first launch:

| Email | Password | Role |
| :--- | :--- | :--- |
| `demo@pitstop.com` | `password123` | Demo User (Alex Rivera) |
| `second@pitstop.com` | `password123` | Secondary Test User (Jordan Smith) |

You can also register a new account at any time directly through the app's sign-up page.
