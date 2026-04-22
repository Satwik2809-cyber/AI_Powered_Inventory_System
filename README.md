# Sanjeevika - AI-Powered Inventory & Event Management System

## Overview

Sanjeevika is a comprehensive, state-of-the-art inventory and event management platform tailored for sellers and administrators who need robust stock tracking, multi-day event management, and AI-driven automation. 

The application is structured into a secure Four-Vault Architecture, merging granular telemetry with modern glassmorphic web design to maximize both utility and aesthetics. 

## Features & The Four-Vault Architecture

### 1. Main Vault (Global Inventory)
- **Centralized Ledger:** Complete view of the company’s global inventory, rate configurations, and historical restock batches.
- **Dynamic Thresholding:** Flag items manually or automatically when they drop below defined thresholds.
- **Category & Role Management:** Allocate items and assign permissions based on distinct user roles.

### 2. Event Vault (Field Operations)
- **Multi-Day Architecture:** Segregate and provision inventory for specific sales events, keeping it completely separated from the Main Vault.
- **Real-Time Telemetry:** Fetch granular metrics representing exact sales arrays (online vs. cash), total operations completed, and items exchanged throughout the active day/phase.
- **Stock Injection & Returns:** Package bulk goods from the main vault specifically for an event and effortlessly return unsold assets back post-closure without manual data-entry overlap.
- **Live Event Grid View:** Expanded phase analytics showcasing the quantity sold, total aggregated amounts, and the individual seller contributions.

### 3. User Vault (Staff Workspace)
- **Agent Dashboard:** Individual sellers get a simplified view tracking items authorized for their category.
- **Point of Sale (POS):** Fast, asynchronous sales registry where staff can quickly add items, quantities, and finalize digital or cash receipts.
- **Contribution History:** Log of past sales linked to their user account.

### 4. Brain Vault (AI & Automation)
- **Voice & Visual AI Context:** Harness advanced AI pipelines capable of voice dictation parsing and camera-based barcode scanning or optical item detection to speed up POS or packing. (AI extensions enabled within Dashboard).
- **Data Extrapolation:** Generate insights, summary statistics, and AI recommendations to limit overhead and optimize future event provisioning.

## Tech Stack

This project strictly follows modern web paradigms using best-in-class libraries.

**Frontend:**
- **Framework:** React / Vite (TypeScript)
- **Styling:** TailwindCSS with a distinct dark aesthetic / glassmorphic UI.
- **Components:** Radix / shadcn-ui inspired structure, Lucide Icons.
- **Routing:** Built-in React Router.

**Backend:**
- **Framework:** FastAPI (Python)
- **Database:** SQLite running via SQLModel (SQLAlchemy).
- **Security:** Standard robust JWT-inspired roles or session context.
- **Environment:** Isolated `.venv` execution handling localized dependencies via `requirements.txt`.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.10+)

### Setting up the Backend

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Uvicorn Server:
   ```bash
   uvicorn main:app --reload
   ```

### Setting up the Frontend

1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install Node dependencies (Excluding `node_modules` from tracking):
   ```bash
   npm install
   ```
3. Run the Development Server:
   ```bash
   npm run dev
   ```

## Contribution & Git Flow

Test files, `node_modules`, and `.venv` environments are strictly excluded via `.gitignore` to maintain a lightweight remote repository. When pushing structure changes, make sure `backend_debug.log` and SQLite database records are cleaned unless explicit testing state is required.

*For internal configuration details and extended specs, review the `guideline` models inside the project directories.*
