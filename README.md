# Timetable Management System

A Flask-based web application for managing teacher aide assignments and schedules in educational institutions.

## Features

- Manage teacher aides and their qualifications
- Create and manage tasks for different categories (class support, playground, etc.)
- Schedule assignments with conflict checking
- Weekly view of assignments
- Batch assignment creation with recurrence rules
- Availability management for teacher aides

## Tech Stack

- Python 3.12
- Flask
- SQLAlchemy
- SQLite
- pytest for testing

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
- PUT /api/tasks/{id} - Update a task
- DELETE /api/tasks/{id} - Delete a task

### Assignments
- GET /api/assignments - List assignments (with optional week filter)
- POST /api/assignments - Create a new assignment
- POST /api/assignments/batch - Create multiple assignments
- POST /api/assignments/check - Check for scheduling conflicts
- GET /api/assignments/{id} - Get a specific assignment
- PATCH /api/assignments/{id} - Update an assignment
- DELETE /api/assignments/{id} - Delete an assignment

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

---

## Project Structure

- `api/` — Flask API code
- `src/` — React frontend code
- `instance/` — SQLite database file (`timetable.db`)
- `seed.py` — Script to populate the database with test data

---

## Development Tips
- Make sure to keep backend and frontend running in separate terminals.
- If you change the database models, you may need to reset and reseed the database.
- For any issues, check both the backend and frontend terminal output for errors. 