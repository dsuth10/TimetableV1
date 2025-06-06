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