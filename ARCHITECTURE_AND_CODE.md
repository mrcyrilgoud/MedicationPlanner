# System Architecture & Code Walkthrough

This document provides a comprehensive deep-dive into the Medication Planner application. It covers high-level architecture, technical choices, and a line-by-line explanation of core modules.

## 1. System Architecture

The **Medication Planner** is a client-side Single Page Application (SPA) built with **React**. It is designed to work offline-first, persisting all data to the user's browser using **IndexedDB**.

### High-Level Diagram
```mermaid
graph TD
    User[User Interface] <--> Components[React Components]
    Components <--> Context[InventoryContext (State)]
    Context <--> Adapter[Storage Adapter]
    Adapter <--> IDB[(IndexedDB)]
```

### Key Technical Choices

1.  **React + Vite**: Chosen for fast development, efficient hot-module replacement (HMR), and a lightweight build process.
2.  **Context API**: Used for global state management (`InventoryContext`). Since the app's state (inventory) is cohesive and relatively small (thousands of items, not millions), React Context is sufficient and avoids the boilerplate of Redux.
3.  **IndexedDB (IDB)**: Selected over `localStorage` for data persistence.
    *   **Why?** `localStorage` is synchronous (blocks UI), limited to ~5MB, and only stores strings. IndexedDB is asynchronous, supports large storage quotas, and stores structured JS objects.
    *   **Implementation**: We use the `idb` wrapper library to make IndexedDB easier to use with Promises.
4.  **Lucide React**: A lightweight icon library that provides consistent SVG icons.
5.  **Responsive Design**: The app detects "Phone", "Tablet", or "Computer" modes in `App.jsx` to tailor the layout (e.g., bottom nav vs. sidebar).

---

## 2. Code Walkthrough

This section explains how the code works, file by file.

### 2.1 Core Application Logic

#### `src/main.jsx`
The entry point of the application.
-   **Lines 8-14**: Finds the DOM element with `id="root"` and mounts the React app.
-   **`StrictMode`**: Active in development to highlight potential problems (like double-invoking Effects).
-   **`ErrorBoundary`**: Wraps the entire app to catch unhandled errors and prevent a white screen crash.

#### `src/App.jsx`
The main shell of the application. Handles routing (simple state-based routing) and layout.
-   **State `deviceMode`**: Uses `window.innerWidth` to determine if the user is on a phone, tablet, or computer. This controls whether to show a Sidebar (Lines 132-169) or Bottom Navigation (Lines 176-206).
-   **State `currentView`**: A string ('dashboard', 'inventory', 'add', 'settings') that determines which component to render in the `main-content` area. This is a lightweight alternative to `react-router`.
-   **Providers**: Wraps the UI in `ToastProvider` and `InventoryProvider` so efficient notifications and data access are available globally.

#### `src/context/InventoryContext.jsx`
The "Brain" of the application. It holds the business logic.

*   **Data Structure**:
    *   `medications`: Array of metadata (Name, threshold, unit, etc.).
    *   `batches`: Array of actual stock items (Quantity, expiry date, lot info).
    *   *Why split them?* Separating "Definition" (Medication) from "Instance" (Batch) allows us to track multiple expiry dates for the same drug (e.g., one box expires Jan 2025, another June 2026).

*   **Initialization (Lines 20-58)**:
    *   On mount, it calls `storage.getMedications()` and `storage.getBatches()`.
    *   It contains a **Migration Script** (Lines 27-47) that checks if data exists in `localStorage` (from an old version) and moves it to IndexedDB seamlessly.

*   **`addMedication` / `addBatch`**:
    *   Creates new objects with `crypto.randomUUID()` for unique IDs.
    *   Updates local state immediately (Optimistic UI) and saves to DB asynchronously.

*   **`consumeMedication` (Lines 102-160)**:
    *   The most complex logic. When a user creates a "usage", we need to deduct it from specific batches.
    *   **Logic**: It sorts batches by **Expiry Date** first (FIFO - First In First Out). It deducts from the oldest batch first until the requested amount is filled.
    *   **Immutability**: Creates a shallow copy of the state array to ensure React re-renders correctly.

*   **`getStats` (Lines 229-262)**:
    *   Calculates "Expiring Soon" (within 30 days) and "Low Stock" (below defined threshold).
    *   **Runout Calculation**: Uses usage rate (e.g., 2 pills/day) to predict when the user will reach 0.

### 2.2 Data Persistence

#### `src/storage/index.js`
The Abstraction Layer.
-   It exports a `storage` object that proxies calls to the underlying adapter (`idbAdapter` or `localStorageAdapter`).
-   This Pattern permits swapping the backend (e.g., to a Cloud API) without changing any UI code.

#### `src/storage/idbAdapter.js`
The Concrete Implementation for IndexedDB.
-   **`openDB`**: Opens a database named `MedInventoryDB`.
-   **`upgrade` (Lines 7-30)**: Runs only when the version number changes. It creates "Object Stores" (like tables) for `medications` and `batches` and ensures indices exist.
-   **`saveMedication` / `saveBatch`**: Uses `db.put` which acts as an "Upsert" (Insert or Update).

### 2.3 User Interface Components

#### `src/components/Dashboard.jsx`
-   Displays high-level stats cards (Expiring, Low Stock).
-   Each card has an `onClick` that navigates to the Inventory view with a specific Filter applied.

#### `src/components/MedicationList.jsx`
-   **Grouping Logic (Lines 126-164)**:
    *   Smartly groups medications. If a user has linked "Generic Ibuprofen" with "Brand Advil", they show up in the same cluster.
    *   Calculates total quantity across all batches for a medication to display a single aggregate number.
-   **Rendering**: Maps over the groups and renders `MedicationItem`.

#### `src/components/AddRestockForm.jsx`
-   A complex form that handles both **New Medications** and **Restocks**.
-   **Smart Search (Lines 39-85)**:
    *   When user types, it searches existing meds.
    *   It also checks `drugAliases.js` (e.g., if user types "Tylenol", it suggests linking to existing "Acetaminophen").
-   **Unified Submit**: Handles creating the medication definition (if new) and the batch entry in one transaction logic.

#### `src/components/DataManagement.jsx`
-   **Import/Export Logic**:
    *   **Export**: Creates a JSON blob of the entire `medications` and `batches` arrays and triggers a browser download.
    *   **Import**: Reads a JSON file, parses it, and merges the data using `InventoryContext.importData`.
-   **Preferences**: Allows users to toggle Device Mode (Phone/Tablet/Computer) and Theme (Light/Dark/Blue).

### 2.4 Utilities & Helpers

#### `src/context/ToastContext.jsx`
-   A custom notification system.
-   **Why custom?** To avoid external dependencies for simple requirements.
-   **Structure**: Uses a fixed-position container (Lines 34-48) to render a list of toast messages floating above the UI.
-   **`notify` object**: Exposes simple methods (`notify.success`, `notify.error`) to the rest of the app.

#### `src/utils/drugAliases.js`
-   **Purpose**: To link Brand names to Generics to prevent duplicate entries (e.g., tracking "Advil" and "Ibuprofen" separately).
-   **Data Structure**: `COMMON_DRUG_ALIASES` maps generic names to arrays of brand names.
-   **Logic**: `findBestMatch` checks if a user's input matches a known alias and returns the canonical (generic) name.

#### `src/utils/calculations.js` (implied usage)
-   Contains logic for predicting runout dates based on current stock and usage rate.


---

## 3. Directory Structure
```
src/
├── components/         # UI Elements
│   ├── forms/          # Sub-components for forms
│   └── ...
├── context/            # React Contexts (State)
├── storage/            # Database Adapters
├── utils/              # Helper functions (Math, Date formatting)
└── ...
```
