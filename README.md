# Timetable Management System

A Flask-based web application for managing teacher aide assignments and schedules in educational institutions.

## Features

- Manage teacher aides and their qualifications
- Create and manage tasks for different categories (class support, playground, etc.)
- Schedule assignments with conflict checking
- Weekly view of assignments with structured matrix format
- Batch assignment creation with recurrence rules
- Availability management for teacher aides
- Absence management and automatic task reassignment
- **Recurrence engine with automatic horizon extension and task modification handling**
- **Scheduler system for background processing**
- Comprehensive API with full CRUD operations

## Tech Stack

- Python 3.12
- Flask
- SQLAlchemy
- SQLite
- pytest for testing
- React (Frontend)
- Vite (Build tool)

## Project Status

### ✅ Completed Features
- **Backend API (100% Complete)**
  - Database schema and migrations
  - Teacher aide management
  - Task management with recurrence support
  - Assignment management with collision detection
  - Weekly matrix endpoint for UI
  - Absence management with weekly filtering and automatic assignment handling
  - Classroom and school class management
  - **Recurrence engine with iCal RRULE support**
  - **Automatic horizon extension and task modification handling**
  - **Scheduler system for background processing**
  - Comprehensive testing suite

- **Frontend Foundation**
  - React setup with Vite
  - Basic routing structure
  - State management with Redux Toolkit

### 🚧 In Progress
- Frontend components (Timetable Grid, Task Management, etc.)
- Drag and drop functionality
- UI/UX implementation

### 📋 Planned
- Complete frontend implementation
- Drag and drop assignment functionality
- Conflict resolution modals
- Accessibility features
- Offline functionality

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/timetable.git
cd timetable
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize the database:
```bash
flask init-db
```

5. Run the development server:
```bash
flask run
```

## Testing

Run the test suite:
```bash
pytest
```

## API Documentation

### Recurrence Engine

The recurrence engine automatically generates assignment shells from recurring tasks using iCal RRULE format and includes automatic horizon extension.

**Key Features:**
- iCal RRULE parsing (e.g., `FREQ=WEEKLY;BYDAY=MO,WE,FR`)
- Configurable horizon (4 weeks default, up to 10 weeks max)
- Automatic duplicate prevention
- Task modification handling (updates future assignments)
- Background scheduler for automatic horizon extension

**Endpoints:**
- `POST /api/assignments/extend-horizon` - Extend horizon for all recurring tasks
- `POST /api/scheduler/extend-horizon` - Manual horizon extension with custom weeks
- `GET /api/scheduler/status` - Get scheduler status
- `POST /api/scheduler/control` - Start/stop scheduler

**Task Update Integration:**
When updating a recurring task, future assignments are automatically regenerated:
```json
PUT /api/tasks/{id}
{
  "start_time": "10:00",
  "end_time": "11:00"
}
```
**Response includes:** `"assignments_updated": 12` (number of future assignments updated)

For detailed documentation, see [docs/recurrence-engine.md](docs/recurrence-engine.md).

### Weekly Matrix Endpoint

The weekly matrix endpoint provides a structured view of assignments organized by day and time slots for each teacher aide, specifically designed for the frontend timetable grid component.

**Endpoint:** `GET /api/assignments/weekly-matrix?week=YYYY-WW`

**Parameters:**
- `week` (required): Week in ISO format (YYYY-WW), e.g., "2024-W01"

**Response Structure:**
```json
{
  "week": "2024-W01",
  "start_date": "2024-01-01",
  "end_date": "2024-01-07",
  "time_slots": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "aides": [
    {
      "id": 1,
      "name": "John Smith",
      "colour_hex": "#FF0000",
      "qualifications": "Special Education"
    }
  ],
  "assignments": {
    "1_Monday_09:00": {
      "assignment_id": 123,
      "task_id": 456,
      "task_title": "Morning Playground Duty",
      "task_category": "PLAYGROUND",
      "start_time": "09:00",
      "end_time": "10:00",
      "status": "ASSIGNED",
      "classroom": "Room 101",
      "school_class": "Grade 3A",
      "notes": "Supervise morning recess"
    }
  },
  "absences": {
    "1_Monday": {
      "absence_id": 789,
      "reason": "Sick leave",
      "date": "2024-01-01"
    }
  }
}
```

**Key Features:**
- 30-minute time slots from 08:00 to 16:00 (16 slots total)
- Monday through Friday only (weekends excluded)
- Assignment data organized by `{aide_id}_{day}_{time_slot}` format
- Absence data organized by `{aide_id}_{day}` format
- Full task details including classroom, school class, and notes
- Optimized for frontend consumption with eager loading

For detailed documentation, see [docs/weekly-matrix-endpoint.md](docs/weekly-matrix-endpoint.md).

### Absence Management API

The absence management system allows marking teacher aides as absent and automatically handles the reassignment of their tasks.

**Key Features:**
- Mark aides absent for specific dates
- Automatic release of assignments when absences are created
- Weekly filtering for timetable overlay integration
- Unique constraint prevents duplicate absences for same aide/date
- Attempts to restore assignments when absences are deleted

**Weekly Filtering:**
- `GET /api/absences?week=YYYY-WW` - Returns absences for the specified week
- Uses ISO week format (YYYY-WW), e.g., "2024-W01"
- Returns structured response with `"absences"` array for frontend consumption

**Assignment Impact:**
- When an absence is created, all assignments for that aide on that date are automatically set to `UNASSIGNED`
- The response includes `affected_assignments` array showing which assignments were released
- When an absence is deleted, the system attempts to restore released assignments if slots are still available

**Response Format Examples:**

**Create Absence:**
```json
{
  "absence": {
    "id": 1,
    "aide_id": 5,
    "date": "2024-01-15",
    "reason": "Sick leave",
    "created_at": "2024-01-14T10:30:00"
  },
  "affected_assignments": [
    {
      "id": 123,
      "task_id": 456,
      "aide_id": null,
      "date": "2024-01-15",
      "start_time": "09:00",
      "end_time": "10:00",
      "status": "UNASSIGNED",
      "task_title": "Morning Playground Duty"
    }
  ]
}
```

**Weekly Filtering Response:**
```json
{
  "absences": [
    {
      "id": 1,
      "aide_id": 5,
      "date": "2024-01-15",
      "reason": "Sick leave",
      "created_at": "2024-01-14T10:30:00"
    }
  ]
}
```

### Teacher Aides
- GET /api/aides - List all teacher aides
- POST /api/aides - Create a new teacher aide
- GET /api/aides/{id} - Get a specific teacher aide
- PUT /api/aides/{id} - Update a teacher aide
- DELETE /api/aides/{id} - Delete a teacher aide

### Tasks
- GET /api/tasks - List all tasks
- POST /api/tasks - Create a new task
- GET /api/tasks/{id} - Get a specific task
- PUT /api/tasks/{id} - Update a task (automatically updates future assignments for recurring tasks)
- DELETE /api/tasks/{id} - Delete a task

### Assignments
- GET /api/assignments - List assignments (with optional week filter)
- POST /api/assignments - Create a new assignment
- POST /api/assignments/batch - Create multiple assignments
- POST /api/assignments/check - Check for scheduling conflicts
- GET /api/assignments/weekly-matrix - Get structured weekly matrix for UI (organized by day and time slots)
- GET /api/assignments/{id} - Get a specific assignment
- PATCH /api/assignments/{id} - Update an assignment
- DELETE /api/assignments/{id} - Delete an assignment

### Absences
- GET /api/absences - List absences (with optional week filter)
- POST /api/absences - Mark aide absent for a specific date
- GET /api/absences/{id} - Get a specific absence
- PUT /api/absences/{id} - Update an absence
- DELETE /api/absences/{id} - Remove absence and attempt to restore assignments

### Scheduler Management
- GET /api/scheduler/status - Get scheduler status
- POST /api/scheduler/control - Start/stop scheduler
- POST /api/scheduler/extend-horizon - Manual horizon extension

## License

MIT License

## Getting Started

This project includes a Flask backend and a React frontend (Vite).

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. (First time only) Reset and seed the database

If you encounter database errors or want to start fresh:

```bash
del instance\timetable.db  # On Windows
# or
rm instance/timetable.db    # On Mac/Linux
python seed.py
```

### 4. Start the Flask backend

```bash
python app.py
```
- The backend will run at http://localhost:5000
- The scheduler will automatically start for horizon extension

### 5. Start the React frontend

In a new terminal:

```bash
npm run dev
```
- The frontend will run at http://localhost:5173 (or another port if 5173 is in use)

### 6. Open the app

Visit [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## Troubleshooting

- **Blank page or 500 errors?**
  - Make sure the Flask backend is running and the database is seeded.
  - If you see errors about existing indexes, delete `instance/timetable.db` and re-run `python seed.py`.
- **API connection refused?**
  - The frontend expects the backend at http://localhost:5000. Make sure it's running.
- **Port in use?**
  - If 5173 is in use, Vite will use the next available port (e.g., 5174). Check the terminal output for the correct URL.
- **Scheduler not working?**
  - Check the scheduler status: `GET /api/scheduler/status`
  - Manually trigger horizon extension: `POST /api/scheduler/extend-horizon`

---

## Project Structure

- `api/` — Flask API code
  - `recurrence.py` — Recurrence engine with RRULE parsing
  - `scheduler.py` — Background scheduler for horizon extension
- `src/` — React frontend code
- `instance/` — SQLite database file (`timetable.db`)
- `seed.py` — Script to populate the database with test data
- `docs/` — API documentation

---

## Development Tips
- Make sure to keep backend and frontend running in separate terminals.
- If you change the database models, you may need to reset and reseed the database.
- For any issues, check both the backend and frontend terminal output for errors.
- The weekly matrix endpoint (`/api/assignments/weekly-matrix`) is optimized for frontend consumption and provides all necessary data for building the timetable grid.
- Use the collision detection endpoint (`/api/assignments/check`) before creating assignments to prevent scheduling conflicts.
- The absence management API (`/api/absences`) supports weekly filtering for timetable overlay integration and automatically handles assignment releases.
- The recurrence engine automatically handles task modifications and horizon extension - no manual intervention required.
- All backend API endpoints are now complete and ready for frontend integration. 