# Schedule Selection & Drag-Drop Fixes – Implementation Report

## Scope covered in this session

- Added teacher aide schedule selection on the Schedule page with URL deep-linking (`?aideId=`)
- Enabled navigation from Aide Management → specific aide’s schedule (“View Schedule”)
- Unified “Unassigned” panel to show both:
  - Unassigned Assignments (status = UNASSIGNED)
  - Unassigned Tasks (flexible tasks with no assignment row yet)
- Implemented drag-to-create: dragging a flexible Task into a timetable slot creates an Assignment at that slot
- Seed data updated to reflect two task types (fixed-time vs flexible)
- Hardened backend POST `/api/assignments` to require and set start/end times (resolve NOT NULL errors)
- Restarted backend and refreshed seed data
- Updated README to reflect new behavior

---

## Frontend changes

### Aide selection & deep-linking
- Schedule component now reads/updates `?aideId=` via React Router search params.
- Selection persisted in Zustand (`selectedAideId`) and synced to URL on change.
- Aide Management page adds a “View Schedule” button per aide to navigate with preselection.

### Unified Unassigned panel
- Panel now accepts a normalized list of items: `{ kind: 'task' | 'assignment', id, title, category, ... }`.
- Renders both flexible Tasks and unassigned Assignments.
- Draggable IDs are prefixed: `task-<id>` or `assign-<id>` to differentiate behaviors.

### Drag-to-create
- When a `task-<id>` item is dropped on a slot, the client calls POST `/api/assignments` with `{ task_id, aide_id, date, start_time, end_time }` and inserts the returned Assignment into state.
- When an `assign-<id>` item is dropped/moved, it updates the existing assignment with new day/time.

---

## Backend changes

### Assignment creation (POST `/api/assignments`)
- Active API (package route at `api/routes/assignment_routes.py`) now requires and parses:
  - `task_id`, `aide_id`, `date`, `start_time`, `end_time`
  - Validates time formats (HH:MM) and enforces `start_time < end_time`.
  - Inserts row with times set to satisfy DB NOT NULL constraints.
- Added logging around the single-file route (`api/routes.py`) earlier to aid diagnostics, but the registered, active endpoints come from `api/routes/__init__.py` (the package routes). The fix was applied to the active module (`assignment_routes.py`).

### Seed data
- Flexible tasks: created with placeholder times (DB requires non-null) but no pre-generated assignments.
- Fixed-time tasks: generated weekly assignments, try to auto-assign to an available aide; otherwise persist as UNASSIGNED for visibility.

---

## How to verify

1) Start backend and frontend
   - Backend: `python app.py` (runs on `http://localhost:5000`)
   - Frontend: `npm run dev` (proxy to `/api`)

2) Aide selection
   - Visit Schedule (`/`).
   - Use the “Select Teacher Aide” dropdown; URL should reflect `?aideId=<id>`.
   - From Aide Management, click “View Schedule” to deep-link.

3) Unified Unassigned panel
   - Right panel shows both unassigned Assignments and flexible Tasks.
   - Filtering and search work on normalized fields (`title`, `category`).

4) Drag-to-create
   - Drag a `task-*` item to a slot; an Assignment should be created and appear in the grid.
   - Drag an `assign-*` item between slots; it should update times/aide.

5) Backend logs (if issues)
   - For POST `/api/assignments`, watch terminal logs for validation messages.

---

## Known/possible follow-ups

- Confirm all endpoints used by the frontend map to the package routes in `api/routes/__init__.py` (source of truth). The app’s startup route list includes weekly-matrix/extend-horizon, which indicates the package routes are active (good).
- If 500 errors persist on POST `/api/assignments`:
  - Re-check server logs for the POST payload and validation messages.
  - Ensure the request carries `task_id`, `aide_id`, `date`, `start_time`, `end_time` (snake_case) and times in `HH:MM`.
  - Verify no scheduler/background process is modifying the same DB file during dev (we keep it disabled to avoid locks).
- Consider conflict checks before creation to provide early UX feedback (client-side preflight to `/api/assignments/check`).
- Add small UI labels/badges in the unassigned panel to distinguish Tasks vs Assignments at a glance.
- Extend tests to cover:
  - URL deep-link aide selection.
  - Drag-to-create flexible Task → Assignment.
  - Unassigned panel normalization/filters.

---

## Summary of root cause fixed

- The NOT NULL failure on `assignments.start_time` came from an assignment creation path that inserted rows without times.
- The active backend route was updated to require and set `start_time`/`end_time` at creation, aligning with the frontend’s drag-to-create behavior for flexible tasks.




