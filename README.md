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
- **Modern React frontend with TypeScript and Material-UI**
- **Drag-and-drop assignment functionality**
- **Real-time conflict resolution**
- **Aide schedule selection with deep-linking (`?aideId=`)**
- **Comprehensive testing infrastructure with proper Router context and component isolation**
- Comprehensive API with full CRUD operations

## Tech Stack

### Backend
- Python 3.12
- Flask
- SQLAlchemy
- SQLite
- pytest for testing

### Frontend
- React 18+ with TypeScript
- Vite (Build tool)
- Material-UI v5 (UI Components)
- Zustand (State Management)
- React Router v6
- React Beautiful DnD (Drag & Drop)
- Axios (API Communication)
- Vitest (Unit Testing)
- React Testing Library (Component Testing)

## Project Status

### ✅ Completed Features

#### **Backend API (100% Complete)**
- Database schema and migrations
- Teacher aide management
- Task management with recurrence support
- Assignment management with collision detection
- Weekly matrix endpoint for UI
- Absence management with weekly filtering and automatic assignment handling
- Classroom and school class management
- **Recurrence engine with iCal RRULE support**
- **Automatic horizon extension and task modification handling**
- **Scheduler system for background processing** (disabled in dev to avoid
  file locks; controllable via `/api/scheduler/*`)
- Comprehensive testing suite

#### **Frontend Architecture (100% Complete)**
- **Modern React setup with Vite and TypeScript**
- **Comprehensive routing with React Router v6**
- **State management migration from Redux to Zustand**
- **Centralized API service layer with Axios**
- **Error boundaries and global error handling**
- **Toast notification system**
- **Responsive layout with Material-UI**
- **Performance optimizations and lazy loading**
- **TypeScript strict mode with comprehensive type safety**

#### **Frontend Components (95% Complete)**
- **Layout system with responsive sidebar**
- **Schedule component with drag-and-drop**
- **Timetable grid with weekly view**
- **Unassigned tasks panel**
- **Aide selection dropdown** on Schedule page with URL sync (`?aideId=`)
- **Drag-to-create**: dropping a flexible Task creates an Assignment at the dropped slot
- **Unified unassigned panel**: shows both unassigned Assignments and flexible Tasks; tasks become assignments when dropped
- **Task management interface**
- **Aide management interface**
- **Conflict handling on drag** with backend-validated updates and informative
  409 responses (includes conflicting assignment details)
- **Error boundaries and loading states**
- **Toast notifications for user feedback**

#### **Testing Infrastructure (100% Complete)**
- **Comprehensive test utilities with proper Router context**
- **Component isolation with custom test renderer**
- **API mocking and service layer testing**
- **Router context resolution for all component tests**
- **Material-UI theme provider integration**
- **Localization provider setup for date handling**
- **96% test pass rate with 27/28 tests passing**
- **Proper error handling and loading state testing**
- **Mock data management and cleanup**

#### **State Management (100% Complete)**
- **Zustand stores for all domains:**
  - `aidesStore` - Teacher aide management
  - `tasksStore` - Task management  
  - `assignmentsStore` - Assignment scheduling
  - `absencesStore` - Absence tracking
  - `classroomsStore` - Classroom management
  - `schoolClassesStore` - School class management
  - `uiStore` - UI state and navigation
- **Cross-store subscriptions and reactive updates**
- **Local storage persistence**
- **Optimistic updates and error handling**

#### **API Integration (100% Complete)**
- **Centralized API client with Axios**
- **Request/response interceptors**
- **Error handling and retry logic**
- **Type-safe API services for all resources**
- **Automatic loading states and toast notifications**
- **Week-based filtering and pagination support**

### 🚧 In Progress
- Final UI/UX polish and accessibility improvements
- End-to-end testing with Playwright
- Performance optimization and bundle analysis

### 📋 Planned
- Offline functionality with service workers
- Advanced filtering and search capabilities
- Export functionality (PDF, Excel)
- Mobile app development
- Advanced analytics and reporting

## Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/timetable.git
cd timetable
```

2. Create and activate a virtual environment:

**Using Bash (Git Bash):**
```bash
python -m venv venv
source venv/Scripts/activate
```

**Using PowerShell:**
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize (or reset) the database with fresh dummy data:
```bash
# Optional: remove existing DB if you want a clean slate
rm -f instance/timetable.db
python seed.py
```

### Frontend Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

### Running the Application

1. Start (or restart) the Flask backend:

**Using Bash (Git Bash):**
```bash
# If already running, stop it first, then start
python app.py
```

**Using PowerShell:**
```powershell
python app.py
```
- Backend runs at http://localhost:5000
- In development, the background scheduler is disabled by default to avoid
  SQLite file locks. You can control it via the scheduler endpoints
  (`/api/scheduler/*`) if needed.

2. Start the React frontend (in a new terminal):

**Using Bash (Git Bash):**
```bash
npm run dev
```

**Using PowerShell:**
```powershell
npm run dev
```
- Frontend runs at http://localhost:3000 by default. If 3000 is in use, Vite
  will automatically choose the next available port (e.g., http://localhost:3001)
  and print the URL in the terminal.

3. Open the application:
- Visit http://localhost:3000 in your browser

## Testing

### Backend Testing
```bash
pytest
```

### Frontend Testing
```bash
npm test
```

**Frontend Test Infrastructure:**
The frontend uses a comprehensive testing setup with:
- **Vitest** for fast unit testing
- **React Testing Library** for component testing
- **Custom test utilities** (`src/test-utils.tsx`) providing:
  - Router context for all components
  - Material-UI theme provider
  - Localization provider for date handling
  - Proper component isolation

**Test Coverage:**
- 96% test pass rate (27/28 tests passing)
- All critical Router context issues resolved
- Component rendering issues fixed
- API mocking and service layer testing
- Proper error handling and loading state testing

### End-to-End Testing
```bash
npm run test:e2e
```

## Frontend Architecture

### Testing Infrastructure

The application includes a robust testing infrastructure designed to handle complex React components with Router dependencies:

```typescript
// Custom test utilities (src/test-utils.tsx)
import { render } from './test-utils';

// Provides Router context, Material-UI theme, and localization
render(<MyComponent />, {
  route: '/test-route',
  useMemoryRouter: true
});
```

**Key Testing Features:**
- **Router Context**: All components are properly wrapped with Router context
- **Component Isolation**: Each test runs in isolation with proper cleanup
- **API Mocking**: Comprehensive mocking of API services and hooks
- **Error Boundaries**: Testing of error states and loading conditions
- **Accessibility**: ARIA attributes and keyboard navigation testing

### State Management (Zustand)
The application uses Zustand for state management, providing a lightweight and flexible alternative to Redux:

```typescript
// Example store structure
export const useAidesStore = create<AidesStore>()(
  persist(
    (set, get) => ({
      aides: [],
      loading: false,
      error: null,
      setAides: (aides) => set({ aides, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'aides-storage' }
  )
);
```

### API Service Layer
Centralized API communication with type safety:

```typescript
// Centralized API client
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Typed API services
export const aidesApi = {
  getAll: () => api.get<TeacherAide[]>('/aides'),
  create: (data: CreateAideRequest) => api.post<TeacherAide>('/aides', data),
  update: (id: number, data: UpdateAideRequest) => api.put<TeacherAide>(`/aides/${id}`, data),
  delete: (id: number) => api.delete(`/aides/${id}`),
};
```

### Component Architecture
- **Atomic Design Principles**: Components organized by complexity
- **Error Boundaries**: Graceful error handling throughout the app
- **Lazy Loading**: Code splitting for better performance
- **TypeScript**: Comprehensive type safety across all components

### Key Frontend Features

#### **Drag-and-Drop Assignment**
- Drag unassigned tasks to time slots
- Drag assignments between time slots
- Real-time conflict detection
- Visual feedback during drag operations

#### **Responsive Design**
- Mobile-first approach
- Collapsible sidebar for mobile devices
- Touch-friendly drag-and-drop
- Adaptive layout for different screen sizes

#### **Real-time Updates**
- Optimistic UI updates
- Automatic data synchronization
- Cross-store subscriptions
- Toast notifications for user feedback

#### **Performance Optimizations**
- Lazy loading of routes and components
- Memoization of expensive calculations
- Debounced API calls
- Efficient re-rendering with React.memo

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
- PUT /api/assignments/{id} - Update an assignment (validates date/time formats,
  prevents overlaps, returns 409 with conflicting assignment details on conflict)
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

**Using Bash (Git Bash):**
```bash
rm instance/timetable.db
python seed.py
```

**Using PowerShell:**
```powershell
Remove-Item instance\timetable.db
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
- The frontend will run at http://localhost:3000

### 6. Open the app

Visit [http://localhost:3000/](http://localhost:3000/) in your browser.

---

## Troubleshooting

- **Blank page or 500 errors?**
  - Make sure the Flask backend is running and the database is seeded.
  - If you see errors about existing indexes, delete `instance/timetable.db` and re-run `python seed.py`.
- **API connection refused?**
  - The frontend expects the backend at http://localhost:5000. Make sure it's running.
- **Port in use?**
  - If 3000 is in use, Vite will use the next available port. Check the terminal output for the correct URL.
- **Scheduler not working?**
  - Check the scheduler status: `GET /api/scheduler/status`
  - Manually trigger horizon extension: `POST /api/scheduler/extend-horizon`
- **TypeScript errors?**
  - Run `npx tsc --noEmit` to check for type errors
  - Ensure all dependencies are properly installed
- **Frontend build issues?**
  - Clear node_modules and reinstall:
    - **Bash (Git Bash):** `rm -rf node_modules && npm install`
    - **PowerShell:** `Remove-Item -Recurse -Force node_modules && npm install`
  - Check for conflicting dependencies
- **Test failures?**
  - Run `npm test` to check frontend test status
  - Ensure all test dependencies are installed
  - Check that the test utilities are properly configured
- **Windows-specific issues:**
  - **Virtual environment activation fails?** Make sure you're using the correct activation script for your shell:
    - Bash (Git Bash): `source venv/Scripts/activate`
    - PowerShell: `venv\Scripts\Activate.ps1`
    - Command Prompt: `venv\Scripts\activate.bat`
  - **Permission errors?** Run PowerShell as Administrator if you encounter permission issues
  - **Path issues?** Ensure Python and Node.js are in your system PATH
  - **Database file locked?** Close any applications that might be accessing the database file

---

## Project Structure

```
timetable/
├── api/                    # Flask API code
│   ├── models/            # SQLAlchemy models
│   ├── routes/            # API route handlers
│   ├── recurrence.py      # Recurrence engine with RRULE parsing
│   └── scheduler.py       # Background scheduler for horizon extension
├── src/                   # React frontend code
│   ├── components/        # React components
│   │   ├── TaskModals/    # Task creation/editing modals
│   │   └── TimetableGrid/ # Timetable grid components
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API service layer
│   ├── store/             # Zustand state management
│   │   └── stores/        # Individual store definitions
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── test-utils.tsx     # Custom test utilities with Router context
├── instance/              # SQLite database file (timetable.db)
├── seed.py               # Script to populate the database with test data
├── docs/                 # API documentation
├── cypress/              # End-to-end tests
└── tests/                # Backend tests
```

---

## Development Tips

### Frontend Development
- **State Management**: Use Zustand stores for global state, local state for component-specific data
- **API Calls**: Always use the centralized API services for consistency and type safety
- **Error Handling**: Implement error boundaries and use toast notifications for user feedback
- **Performance**: Use React.memo for expensive components and implement proper dependency arrays
- **TypeScript**: Maintain strict type safety and avoid `any` types
- **Testing**: Use the custom test utilities (`src/test-utils.tsx`) for proper Router context and component isolation

### Backend Development
- **Database**: Use migrations for schema changes and always test with fresh data
- **API Design**: Follow RESTful principles and maintain consistent response formats
- **Testing**: Write comprehensive tests for all API endpoints
- **Error Handling**: Use standardized error responses and proper HTTP status codes

### Testing Best Practices
- **Component Testing**: Use the custom test utilities for proper Router context
- **API Mocking**: Mock API services and hooks to isolate component testing
- **Error States**: Test loading states, error conditions, and edge cases
- **Accessibility**: Test ARIA attributes and keyboard navigation
- **Cleanup**: Ensure proper test isolation and cleanup between tests

### General Tips
- Keep backend and frontend running in separate terminals during development
- Use the weekly matrix endpoint (`/api/assignments/weekly-matrix`) for frontend timetable data
- Implement collision detection before creating assignments to prevent conflicts
- The absence management API supports weekly filtering for timetable overlay integration
- The recurrence engine automatically handles task modifications and horizon extension
- All backend API endpoints are complete and ready for frontend integration
- The frontend now provides a modern, responsive interface with drag-and-drop functionality
- The testing infrastructure is robust and supports complex component testing with proper isolation 