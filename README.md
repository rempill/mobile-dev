# PitStop - Car Maintenance & Mileage Tracker

PitStop is a native Android application (with a Node.js + SQLite backend) designed to help users track vehicle maintenance intervals, repair costs, and service history.

---

## App Features

### 1. Item Data Model
Each service record includes:
* `id` (String): Unique identifier (UUID) for database indexing and client navigation.
* `userId` (String): Unique user reference ensuring user data isolation.
* `serviceName` (String): Description of the service (e.g., `"Oil & Filter Change"`).
* `cost` (Numeric): Non-negative financial cost of the service (e.g., `85.50`).
* `mileage` (Numeric): Vehicle odometer reading at the time of service (e.g., `124500`).
* `serviceDate` (String / Date): Service date formatted as `YYYY-MM-DD`.
* `category` (String): Service classification (`"Maintenance"`, `"Repair"`, `"Inspection"`).
* `isCompleted` (Boolean): Service completion status (scheduled vs. completed).
* `createdAt` (ISO Date String): Server timestamp of record creation.

### 2. Authentication (JWT)
* **Login Page:** Authenticate users using JSON Web Tokens via `/api/auth/login` (and `/api/auth/register`).
* **User Isolation:** REST endpoints isolate service items by the authenticated user ID.
* _Android client implementation: TBD_

### 3. Master-Detail User Interface (REST)
* **List Page (Master):** Fetch and display the user's service items from the REST API (`/api/items`).
* **Edit Page (Detail):** View, create, edit, and delete individual service items via REST endpoints (`/api/items`, `/api/items/:id`).
* _Android client implementation: TBD_

---

## Tech Stack

### Android Client
* _TBD (Android SDK)_

### Backend (Server)
* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js (v5)
* **Language:** TypeScript with `tsx` / `ts-node-dev`
* **Database:** SQLite via `better-sqlite3`
* **Authentication:** JSON Web Tokens (`jsonwebtoken`)
* **CORS & Environment:** `cors`, `dotenv`

---

## Project Structure

```text
mobile-dev/
├── package.json              # Root scripts for running the backend server
└── server/                   # Backend Express + SQLite server
    ├── src/
    │   ├── controllers/      # REST endpoint controllers
    │   ├── middleware/       # JWT authentication middleware
    │   ├── routes/           # Express route definitions (/api/items, /api/auth)
    │   ├── store/            # SQLite database schema, migrations, user store, and service item store
    │   ├── types/            # Backend types
    │   └── index.ts          # Server entry point
    └── pitstop.db            # Persistent SQLite database file
```

---

## Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* npm (v9 or higher)
* Android Studio / Android SDK

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
