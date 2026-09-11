# ProctorGrid - Exam Seating Management System

ProctorGrid is an advanced, automated exam seating management and invigilation dispatch platform. It is designed to handle the complex logistical challenge of seating thousands of students across multiple venues while adhering to strict adjacency constraints and managing teacher duty schedules.

## 🚀 Key Features

* **Automated Seating Engine**: Generates optimal seating matrices for exam halls. It actively prevents same-course adjacency conflicts (no students from the same course sitting next to each other) and handles multi-slot exam sessions.
* **Human-in-the-Loop Conflict Resolution**: While the engine aims for perfect allocation, it allows operations staff to manually perform atomic two-seat swaps or explicitly approve plans with unresolved conflicts when necessary.
* **Smart Invigilation Dispatch**: Automatically assigns teachers to exam halls based on availability, daily duty caps, and mandatory duty gap slots.
* **Automated Notifications**: Dispatches automated duty assignment emails to teaching staff, complete with PDF attachments containing the seating roster for their assigned hall.
* **High-Contrast "Obsidian" UI**: A beautiful, developer-grade dark mode dashboard built with React and Tailwind CSS v4, featuring real-time telemetry, job progress tracking, and interactive seating previews.
* **Bulk Import & Export**: Supports importing student rosters via Excel/CSV files and exporting complete seating plans as bulk ZIP files containing individual classroom PDFs.

## 🛠️ Technology Stack

**Backend**
* Python 3 & Django
* Django REST Framework (DRF)
* PostgreSQL (Relational Database)
* Redis & Celery (Asynchronous Task Queue for plan generation and email dispatch)

**Frontend**
* React 18 & TypeScript
* Vite (Build Tool)
* Tailwind CSS v4 (Styling)
* React Query (Data Fetching & State Management)
* Recharts (Telemetry & Analytics)

## 🏗️ Architecture Overview

The system is built on a scalable, asynchronous architecture to ensure the UI remains snappy even when solving NP-hard seating allocation constraints for thousands of students.

1. **Ingestion**: Exam sessions are created, and student enrollments are uploaded via Excel/CSV. A Celery worker processes the upload asynchronously.
2. **Generation**: The solver engine builds a grid topology based on classroom layouts. It runs multiple passes to place students while minimizing `course_code` adjacency conflicts. 
3. **Dispatch**: Once a plan is approved, the notification service uses Celery to batch-send emails to all assigned invigilators with attached seating PDFs.

## 🚦 Getting Started

### Prerequisites
* Docker & Docker Compose
* Node.js (v18+)

### Running the Application

1. **Clone the repository**
   ```bash
   git clone https://github.com/mayankdev-oss/ttgehu.git
   cd ttgehu
   ```

2. **Start the Backend Infrastructure (Docker)**
   This will spin up PostgreSQL, Redis, the Django web server, and the Celery worker.
   ```bash
   docker-compose up -d --build
   ```

3. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   * Frontend Dashboard: `http://localhost:5173`
   * Backend API: `http://localhost:8000/api/`

## 👥 Authors
claude, gpt, gemini (maha gathbandhan)
