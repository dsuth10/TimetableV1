# Project Brief: Teacher Aide Scheduler

## 1. Overview

The Teacher Aide Scheduler is a web application designed to help school administrators efficiently manage and schedule teacher aides. The application provides a visual, drag-and-drop interface for assigning tasks to aides, handling absences, and managing both one-off and recurring duties.

## 2. Core Features

*   **Task Management:** Create, edit, and delete one-off and recurring tasks.
*   **Drag-and-Drop Scheduling:** Visually assign tasks to teacher aides on a weekly timetable.
*   **Conflict Resolution:** Detect and resolve scheduling conflicts.
*   **Absence Management:** Mark aides as absent and automatically handle their assignments.
*   **Status Tracking:** Allow aides to update the status of their tasks.
*   **Teacher Requests:** Enable teachers to request aide support.

## 3. Technical Stack

*   **Backend:** Flask (Python)
*   **Frontend:** React with TypeScript
*   **Database:** SQLite (development), PostgreSQL (production)
*   **State Management:** Redux Toolkit
*   **UI Components:** Material-UI
*   **Drag & Drop:** react-dnd
*   **Date Handling:** date-fns and dayjs

## 4. User Roles

*   **Administrator:** Full control over the application.
*   **Teacher Aide:** View personal timetable and update task status.
*   **Teacher:** Submit requests for aide support.
