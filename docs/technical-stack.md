# Technical Stack

## Backend

- **Framework**: Flask (Python)
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **ORM**: SQLAlchemy
- **Authentication**: JWT
- **API Documentation**: Swagger/OpenAPI
- **Task Queue**: Celery (for background jobs)
- **Caching**: Redis

## Frontend

- **Framework**: React with TypeScript
- **State Management**: Zustand
- **UI Components**: Material-UI
- **Drag and Drop**: react-dnd
- **Date Handling**: dateutil
- **Form Handling**: React Hook Form
- **API Client**: Axios

## Development Tools

- **Package Manager**: pip (Python) / npm (Node.js)
- **Build Tool**: Webpack
- **Testing**: pytest (Backend) / Jest (Frontend)
- **Linting**: flake8 (Python) / ESLint (JavaScript)
- **Code Formatting**: black (Python) / Prettier (JavaScript)
- **Version Control**: Git
- **CI/CD**: GitHub Actions

## Infrastructure

- **Containerization**: Docker
- **Orchestration**: Docker Compose (Development)
- **Web Server**: Nginx
- **Process Manager**: Gunicorn
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

## Dependencies

### Backend Dependencies
```
Flask==2.0.1
SQLAlchemy==1.4.23
Flask-SQLAlchemy==2.5.1
Flask-Migrate==3.1.0
Flask-JWT-Extended==4.3.1
celery==5.1.2
redis==3.5.3
python-dateutil==2.8.2
pytest==6.2.5
```

### Frontend Dependencies
```
react==17.0.2
react-dom==17.0.2
@mui/material==5.0.0
@mui/icons-material==5.0.0
zustand==3.5.11
react-dnd==14.0.4
react-dnd-html5-backend==14.0.4
date-fns==2.23.0
axios==0.21.4
typescript==4.4.3
```

## Development Setup

1. Install Python 3.8+ and Node.js 14+
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   .\venv\Scripts\activate   # Windows
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
5. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
6. Initialize the database:
   ```bash
   flask db upgrade
   ```
7. Start the development servers:
   ```bash
   # Terminal 1 (Backend)
   flask run
   
   # Terminal 2 (Frontend)
   cd frontend
   npm start
   ```

## Production Setup

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Set up production environment variables
3. Run database migrations
4. Start the production server:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
   ```

## Security Considerations

- All API endpoints require authentication
- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- CORS is configured for specific origins
- Rate limiting is implemented
- SQL injection protection via SQLAlchemy
- XSS protection via React's built-in escaping 