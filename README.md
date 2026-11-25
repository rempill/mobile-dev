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
* `photoUrl` (String, Optional): Server-managed, JWT-protected, versioned URL for the uploaded receipt photo.
* `localPhotoPath` (String, Client-only): Capacitor Filesystem path relative to `Directory.Data` (`pitstop-photos/...`) for offline receipt caching.
* `createdAt` (ISO Date String): Server timestamp of record creation.
* `_syncStatus` (String, Client-only): Optimistic sync state (`"synced"` or `"pending"`) for items queued while offline.
* `_photoSyncStatus` (String, Client-only): Receipt photo upload state (`"synced"` or `"pending"`).

### 2. Authentication & Data Isolation
* **JWT Authentication:** Secure user signup (`/api/auth/register`) and login (`/api/auth/login`) with JSON Web Tokens.
* **Client Route Guards:** Client-side route protection (`PrivateRouteGuard`, `AuthRouteGuard`) protecting routes (`/items`, `/items/new`, `/items/:id`) and redirecting unauthenticated users to `/login`.
* **Persistent Sessions:** Auth tokens and active user profile persisted on the device via `@ionic/storage`.
* **User Isolation:** All REST endpoints and WebSocket channels strictly isolate service items by authenticated user ID.

### 3. Offline-First & Background Sync
* **Local Persistent Storage:** Offline caching of service records and auth credentials powered by `@ionic/storage` (`_pitstop_storage`).
* **Real-time Connectivity Monitoring:** Live network status detection using `@capacitor/network`, surfaced via an interactive status chip in the app header (`Online` / `Offline`).
* **Optimistic Offline CRUD:** Create, update, and delete service records (including capturing receipt photos) while offline. Offline mutations are enqueued into a persistent `SYNC_QUEUE` with immediate UI updates and visual "Pending Sync" badges.
* **Automated Reconciliation:** Automatic queue synchronization, pending receipt photo uploads, and cache refresh as soon as network connectivity is restored, accompanied by non-intrusive toast notifications.

### 4. Real-Time Synchronization (WebSockets)
* **Authenticated WebSocket Connection:** Handshake-level JWT validation over `ws://localhost:4000/ws?token=<token>`.
* **User-Scoped Events:** Real-time push events (`ITEM_CREATED`, `ITEM_UPDATED`, `ITEM_DELETED`) delivered exclusively to the active user's connected sessions.
* **Resilient Connection:** Automatic reconnection with exponential backoff and a 30-second ping/pong heartbeat to detect dropped sockets.
* **Interactive Notifications:** In-app toast alerts triggered by live server-side changes and sync updates.

### 5. Search, Filtering & Pagination
* **Search:** Filter service records by name in real time (supported both server-side via SQL `LIKE` and client-side offline over cached items).
* **Category Filtering:** Filter items by category (`All`, `Maintenance`, `Repair`, `Inspection`).
* **Infinite Scroll & Refresh:** Server-side paginated queries (`page`, `limit`, `total`, `totalPages`, `hasMore`) with smooth mobile infinite scrolling (`IonInfiniteScroll`) and pull-to-refresh (`IonRefresher`).

### 6. Native Capabilities, Maps & UI Animations
* **Receipt Photo Capture & Storage:** Hardware camera and gallery integration (`@capacitor/camera`) paired with persistent local caching (`@capacitor/filesystem`) and JWT-protected multipart uploads (`POST/GET/DELETE /api/items/:id/photo`).
* **Interactive Maps & Native Directions:** Interactive repair shop pin selection and preview powered by `leaflet` / `react-leaflet`, GPS positioning via `@capacitor/geolocation`, and native turn-by-turn directions via `@capacitor/app-launcher` (`geo:` URI on Android with Google Maps web fallback).
* **Custom UI Animations & Haptics:** Custom Ionic animations (`staggerListAnimation`, pulsing `Pending Sync` badges, custom page transitions, and spring/zoom modal animations), `@capacitor/haptics` feedback, swipe gestures (`IonItemSliding`), floating action buttons, and dark mode support.
* **Native Android Project:** Configured `@capacitor/android` project (`client/android/`) ready for Android Studio / device deployment.

---

## Tech Stack

### Frontend (Client)
* **Framework:** Ionic Framework (v9) with React (v19)
* **Language:** TypeScript (~5.9)
* **Build Tool:** Vite (v8)
* **Routing:** React Router DOM (v6) with Ionic React Router
* **Native Runtime:** Capacitor (v8) (`@capacitor/core`, `@capacitor/android`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/geolocation`, `@capacitor/app-launcher`, `@capacitor/network`, `@capacitor/haptics`, `@capacitor/preferences`, `@capacitor/app`, `@capacitor/keyboard`, `@capacitor/status-bar`)
* **Maps:** Leaflet (`leaflet`, `react-leaflet`)
* **Storage:** `@ionic/storage` (IndexedDB / LocalStorage abstraction)
* **HTTP Client:** Axios (configured with automatic JWT bearer interceptors)
* **Icons:** Ionicons (v8)

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
├── package.json              # Monorepo root scripts (concurrent dev server execution)
├── client/                   # Frontend Ionic + React application
│   ├── android/              # Capacitor Android native project
│   ├── src/
│   │   ├── components/       # UI components (MapPickerModal, LocationPreview, ReceiptPhotoField, ReceiptThumbnail)
│   │   ├── context/          # React Context (ItemContext state, sync pipeline, WS events)
│   │   ├── pages/            # View components (Login, ItemList, ItemDetail)
│   │   ├── services/         # API (Axios), Storage (@ionic/storage), Photo, Location, and WebSocket clients
│   │   ├── theme/            # Custom Ionic animations and styling
│   │   ├── types/            # TypeScript data interfaces and DTOs
│   │   └── App.tsx           # Route setup and authentication route guards
│   ├── .env.example          # API origin configuration template (browser / emulator / device)
│   ├── capacitor.config.ts   # Capacitor mobile configuration
│   └── vite.config.ts        # Vite build configuration
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

> **Note for Android / Physical Devices:** Copy `client/.env.example` to `client/.env` and set `VITE_API_ORIGIN` (`http://10.0.2.2:4000` for Android Emulator, or `http://<your-LAN-IP>:4000` for a physical device).

---

## Default Demo Accounts

The backend database automatically initializes with seed accounts and sample vehicle service logs on first launch:

| Email | Password | Role |
| :--- | :--- | :--- |
| `demo@pitstop.com` | `password123` | Demo User (Alex Rivera) |
| `second@pitstop.com` | `password123` | Secondary Test User (Jordan Smith) |

You can also register a new account at any time directly through the app's sign-up page.
