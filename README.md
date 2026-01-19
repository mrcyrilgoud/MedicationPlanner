# Medication Planner (MedPlan)

MedPlan is a comprehensive React application designed to help individuals manage their personal medication inventory, track stock levels with precision, and ensure they never run out of essential prescriptions.

## Features

-   **Inventory Management**: Easily add, edit, and remove medications from your tracked list.
-   **Batch Tracking**: Track specific batches of medication with distinct expiration dates and quantities.
-   **Smart Consumption Logic**: Uses a First-In-First-Out (FIFO) system to automatically consume the oldest stock first, ensuring you use medication before it expires.
-   **Stock Projections**:
    -   Calculates "Days Until Empty" based on daily, weekly, or monthly usage rates.
    -   Predicts when you will hit your low stock threshold.
-   **Smart Alerts**:
    -   **Low Stock**: Alerts when total quantity drops below your set threshold.
    -   **Expiring Soon**: Warns about batches expiring within 30 days.
    -   **Projected Empty**: Alerts if you are projected to run out within 7 days.
-   **Responsive Design**:
    -   **Desktop**: Full sidebar navigation.
    -   **Mobile**: Bottom navigation bar and adapted layouts.
-   **Experimental Features**:
    -   **Receipt Scanning**: Determine medication details from receipts using OCR (Tesseract.js).
    -   **Drug API Integration**: Lookup generic names and aliases via NLM RxNorm API.

## How It Works

### Architecture
The application is built with **React** and **Vite**, using **Context API** for global state management.

-   **`InventoryContext`**: The core logic hub. It manages the `medications` (definitions) and `batches` (stock instances) lists. It persists data to `localStorage` under the key `med_inventory_v1`.
-   **`ToastContext`**: Provides a notification system for success/error feedback.

### Key Logic
-   **Consumption**: When you log consumption, the app filters for batches of that medication with quantity > 0, sorts them by expiry date, and subtracts the amount starting from the oldest batch.
-   **Status Calculation**: The `getStats()` function aggregates data across all batches to provide real-time dashboard metrics.

## Tech Stack

-   **Frontend**: React 19, Vite
-   **Styling**: Plain CSS with CSS Variables (Light/Dark mode ready), Lucide React icons
-   **Utilities**: Tesseract.js (OCR)

## Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd MedicationPlanner
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

## Development

-   **Linting**: `npm run lint`
-   **Building**: `npm run build`
-   **Preview**: `npm run preview`
