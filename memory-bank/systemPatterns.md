# System Patterns: Teacher Aide Scheduler

## 1. Frontend Architecture

The frontend is a single-page application (SPA) built with React and TypeScript. It follows a component-based architecture, with a clear separation of concerns between UI components, state management, and services.

### Key Patterns:

*   **Component-Based UI:** The UI is composed of reusable React components, organized by feature.
*   **Centralized State Management:** Redux Toolkit is used for managing global application state, such as tasks, assignments, and aides.
*   **Services Layer:** API interactions are abstracted into a services layer, which is responsible for making HTTP requests to the backend.
*   **Custom Hooks:** Custom hooks are used to encapsulate and reuse stateful logic, such as fetching data or handling user input.
*   **Type Safety:** TypeScript is used throughout the frontend to ensure type safety and improve developer experience.

## 2. Backend Architecture

The backend is a monolithic Flask application that provides a RESTful API for the frontend. It follows a standard three-tier architecture, with a clear separation between the presentation layer (API endpoints), business logic layer, and data access layer.

### Key Patterns:

*   **RESTful API:** The backend exposes a set of RESTful API endpoints for creating, reading, updating, and deleting resources.
*   **Model-View-Controller (MVC):** The application is structured according to the MVC pattern, with models representing the data, views representing the API responses, and controllers handling the business logic.
*   **Database ORM:** SQLAlchemy is used as the Object-Relational Mapper (ORM) for interacting with the database.
*   **Database Migrations:** Alembic is used for managing database schema migrations.
*   **Dependency Injection:** Dependencies, such as the database session, are injected into the controllers to facilitate testing.

## 3. Drag-and-Drop Implementation

The drag-and-drop functionality is implemented using the `react-dnd` library.

### Key Patterns:

*   **Drag Source:** The `TaskCard` component is the drag source, representing a task that can be assigned.
*   **Drop Target:** The `TimetableSlot` component is the drop target, representing a time slot on an aide's timetable.
*   **Conflict Detection:** Before a task is dropped, a request is made to the backend to check for scheduling conflicts.
*   **Conflict Resolution:** If a conflict is detected, a modal is displayed to the user, allowing them to either replace the existing assignment or cancel the new one.
*   **Optimistic Updates:** To improve the user experience, the UI is updated optimistically when a task is dropped, and then reverted if the backend reports an error.
