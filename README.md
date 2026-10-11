# PitStop - Car Maintenance & Mileage Tracker

PitStop is a cross-platform mobile application designed to help users track vehicle maintenance intervals, repair costs, and service history.

## App Features

*   **Item Data Model:** 
    *   `id` (String): Unique identifier (UUID) for database indexing and routing
    *   `serviceName` (String): e.g., "Oil & Filter Change"
    *   `cost` (Numeric): e.g., `85.50`
    *   `mileage` (Numeric): Odometer reading at time of service, e.g., `124500`
    *   `serviceDate` (Date): e.g., `2026-10-11`
    *   `isCompleted` (Boolean): Toggle for scheduled vs. completed service
    *   `location` (Object): `{ lat: number, lng: number }` for the repair shop map pin
*   **Authentication:** Secure user login to isolate personal vehicle data.
*   **Offline Support:** Persists data to local storage, allowing users to log services in dead-zones (like underground garages).
*   **Online Synchronization:** Synchronizes local data with a remote backend automatically when network connectivity is restored.
*   **External Services:** Integrates Google Maps to pinpoint the repair shop location, and Email to export service records.
*   **Local Hardware Services:** Utilizes the device Camera to scan and attach repair invoices, and hardware sensors.
*   **Animations:** Smooth UI transitions, including list swipe actions, expanding cards, and animated sync status badges.

## Tech Stack

### Frontend (Client)
*   **Framework:** Ionic Framework with React
*   **Language:** TypeScript
*   **Native Bridge:** Capacitor
*   **Routing:** React Router DOM

### Backend (Server)
*   **Runtime:** Node.js
*   **REST API:** Express.js
*   **Real-time Events:** `ws` (Standard WebSockets)

---
