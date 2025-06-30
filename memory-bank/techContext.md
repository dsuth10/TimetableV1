# Technical Context: Teacher Aide Scheduler

## 1. Frontend

*   **Framework:** React 18+ with TypeScript
*   **Build Tool:** Vite
*   **State Management:** Redux Toolkit
*   **UI Components:** Material-UI v5
*   **Styling:** Emotion (via Material-UI)
*   **Drag & Drop:** react-dnd
*   **Date Handling:** date-fns and dayjs
*   **HTTP Client:** Axios
*   **Routing:** React Router
*   **Testing:** Vitest and React Testing Library

## 2. Backend

*   **Framework:** Flask
*   **Language:** Python 3.9+
*   **Database ORM:** SQLAlchemy
*   **Database Migrations:** Alembic
*   **API:** Flask-RESTful
*   **Recurrence Engine:** `dateutil.rrule`
*   **Testing:** Pytest

## 3. Database

*   **Development:** SQLite
*   **Production:** PostgreSQL
*   **Schema:** See `project specs.txt` for the full schema.

## 4. Development Environment

*   **Package Manager:** npm
*   **Version Control:** Git
*   **Code Editor:** Visual Studio Code

### Setup Instructions:

**Backend:**

```bash
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
flask db upgrade
flask run
```

**Frontend:**

```bash
npm install
npm run dev
```

## 5. Deployment

*   **Hosting:** The application is designed to be hosted on a platform that supports both Python and Node.js, such as Heroku or a similar PaaS.
*   **Database:** A managed PostgreSQL database is recommended for production.
*   **Continuous Integration/Continuous Deployment (CI/CD):** A CI/CD pipeline should be set up to automate testing and deployment.
