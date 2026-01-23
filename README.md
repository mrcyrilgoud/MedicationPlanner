# Medication Planner

A robust, offline-first Progressive Web Application (PWA) for managing personal medication inventories, tracking expiration dates, and predicting stock runouts.

![App Screenshot](https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=1000)
*(Note: Replace with actual screenshot)*

## Features

-   **Detailed Inventory Tracking**: Track medication by batches (expiration dates, lot numbers).
-   **Smart Alerts**: Get notified about low stock or expiring medications.
-   **Usage Analytics**: Automatically calculates when you will run out of medication based on your daily usage.
-   **Offline First**: All data is stored locally in your browser using IndexedDB. No internet connection required.
-   **Responsive Design**: optimized for Mobile, Tablet, and Desktop.

## Documentation

**[View Detailed Architecture & Code Walkthrough](./ARCHITECTURE_AND_CODE.md)**

For a deep dive into how the system works, including the decision to use IndexedDB, the React Context architecture, and a line-by-line explanation of core components, please read the [ARCHITECTURE_AND_CODE.md](./ARCHITECTURE_AND_CODE.md) file.

## Getting Started

### Prerequisites
-   Node.js (v18 or higher)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/MedicationPlanner.git
    cd MedicationPlanner
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser to `http://localhost:5173`.

## Tech Stack
-   **Frontend**: React, Vite
-   **State Management**: React Context API
-   **Database**: IndexedDB (via `idb`)
-   **Creating Components**: CSS Modules / Vanilla CSS
-   **Icons**: Lucide React

## License
MIT
