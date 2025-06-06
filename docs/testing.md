# Testing Strategy

## Overview

The testing strategy covers unit tests, integration tests, end-to-end tests, and performance tests. We use pytest for backend testing and Jest for frontend testing.

## Backend Testing

### Unit Tests

#### 1. Model Tests

```python
# tests/models/test_teacher_aide.py
import pytest
from datetime import date, time
from app.models import TeacherAide, Availability, Absence

def test_teacher_aide_availability():
    aide = TeacherAide(name="Test Aide")
    availability = Availability(
        weekday="MO",
        start_time=time(8, 0),
        end_time=time(16, 0)
    )
    aide.availabilities.append(availability)
    
    # Test available time slot
    assert aide.is_available(
        date(2024, 3, 18),  # Monday
        time(9, 0),
        time(10, 0)
    ) is True
    
    # Test unavailable time slot
    assert aide.is_available(
        date(2024, 3, 19),  # Tuesday
        time(9, 0),
        time(10, 0)
    ) is False

def test_teacher_aide_absence():
    aide = TeacherAide(name="Test Aide")
    absence = Absence(
        date=date(2024, 3, 18),
        reason="Sick leave"
    )
    aide.absences.append(absence)
    
    assert aide.is_available(
        date(2024, 3, 18),
        time(9, 0),
        time(10, 0)
    ) is False
```

#### 2. Service Tests

```python
# tests/services/test_scheduling.py
import pytest
from app.services import SchedulingService
from app.models import Task, Assignment

def test_auto_assignment():
    service = SchedulingService()
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    
    assignment = service.auto_assign_task(task, date(2024, 3, 18))
    assert assignment is not None
    assert assignment.aide_id is not None
    assert assignment.status == "ASSIGNED"

def test_conflict_detection():
    service = SchedulingService()
    assignment = Assignment(
        aide_id=1,
        date=date(2024, 3, 18),
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    
    conflicts = service.detect_conflicts(assignment)
    assert isinstance(conflicts, list)
```

### Integration Tests

```python
# tests/integration/test_api.py
import pytest
from app import create_app
from app.models import db, TeacherAide, Task

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_create_task(client):
    response = client.post('/api/tasks', json={
        'title': 'Test Task',
        'category': 'CLASS_SUPPORT',
        'start_time': '09:00',
        'end_time': '10:00'
    })
    assert response.status_code == 201
    assert response.json['title'] == 'Test Task'

def test_get_assignments(client):
    response = client.get('/api/assignments')
    assert response.status_code == 200
    assert isinstance(response.json['assignments'], list)
```

## Frontend Testing

### Component Tests

```typescript
// src/components/__tests__/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../TaskCard';

describe('TaskCard', () => {
    const mockTask = {
        id: 1,
        title: 'Test Task',
        start_time: '09:00',
        end_time: '10:00',
        category: 'CLASS_SUPPORT'
    };

    it('renders task information', () => {
        render(<TaskCard task={mockTask} />);
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    });

    it('handles drag and drop', () => {
        const onDragStart = jest.fn();
        render(<TaskCard task={mockTask} onDragStart={onDragStart} />);
        fireEvent.dragStart(screen.getByText('Test Task'));
        expect(onDragStart).toHaveBeenCalledWith(mockTask);
    });
});
```

### Store Tests

```typescript
// src/store/__tests__/scheduleStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useScheduleStore } from '../scheduleStore';

describe('ScheduleStore', () => {
    it('fetches assignments', async () => {
        const { result } = renderHook(() => useScheduleStore());
        
        await act(async () => {
            await result.current.fetchAssignments(new Date());
        });
        
        expect(result.current.assignments).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    });

    it('updates assignment', async () => {
        const { result } = renderHook(() => useScheduleStore());
        const assignment = {
            id: 1,
            status: 'IN_PROGRESS'
        };
        
        await act(async () => {
            await result.current.updateAssignment(assignment);
        });
        
        expect(result.current.assignments.find(a => a.id === 1)?.status)
            .toBe('IN_PROGRESS');
    });
});
```

## End-to-End Tests

```typescript
// cypress/integration/scheduling.spec.ts
describe('Scheduling', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/schedule');
    });

    it('creates and assigns a task', () => {
        // Create task
        cy.get('[data-testid="create-task"]').click();
        cy.get('[data-testid="task-title"]').type('New Task');
        cy.get('[data-testid="task-category"]').select('CLASS_SUPPORT');
        cy.get('[data-testid="save-task"]').click();

        // Assign task
        cy.get('[data-testid="task-card"]').drag('[data-testid="time-slot"]');
        cy.get('[data-testid="confirm-assignment"]').click();

        // Verify assignment
        cy.get('[data-testid="assignment-card"]')
            .should('contain', 'New Task');
    });

    it('handles conflicts', () => {
        // Create conflicting assignment
        cy.get('[data-testid="task-card"]').drag('[data-testid="time-slot"]');
        
        // Verify conflict modal
        cy.get('[data-testid="conflict-modal"]').should('be.visible');
        cy.get('[data-testid="resolve-conflict"]').click();
    });
});
```

## Performance Testing

### Load Testing

```python
# tests/performance/test_load.py
import locust
from locust import HttpUser, task, between

class SchedulerUser(HttpUser):
    wait_time = between(1, 5)
    
    @task
    def view_schedule(self):
        self.client.get('/api/assignments')
    
    @task
    def create_task(self):
        self.client.post('/api/tasks', json={
            'title': 'Load Test Task',
            'category': 'CLASS_SUPPORT',
            'start_time': '09:00',
            'end_time': '10:00'
        })
```

### Database Performance

```python
# tests/performance/test_db.py
import pytest
from app.models import db, Assignment
from datetime import date, timedelta

def test_assignment_query_performance():
    start_date = date(2024, 3, 1)
    end_date = start_date + timedelta(days=30)
    
    # Test query performance
    with db.session.begin():
        assignments = Assignment.query.filter(
            Assignment.date.between(start_date, end_date)
        ).all()
    
    assert len(assignments) > 0
```

## Test Coverage

### Backend Coverage

```bash
# Run tests with coverage
pytest --cov=app tests/
```

### Frontend Coverage

```bash
# Run tests with coverage
npm test -- --coverage
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.8'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        pytest --cov=app tests/
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14'
    
    - name: Install frontend dependencies
      run: |
        cd frontend
        npm install
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm test -- --coverage
```

## Test Data

### Fixtures

```python
# tests/fixtures.py
import pytest
from app.models import TeacherAide, Task, Assignment

@pytest.fixture
def sample_aide():
    return TeacherAide(
        name="Test Aide",
        qualifications=["CLASS_SUPPORT", "PLAYGROUND"]
    )

@pytest.fixture
def sample_task():
    return Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0)
    )

@pytest.fixture
def sample_assignment(sample_aide, sample_task):
    return Assignment(
        task=sample_task,
        aide=sample_aide,
        date=date(2024, 3, 18),
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
```

## Mocking

### API Mocks

```typescript
// src/api/__mocks__/api.ts
export const mockApi = {
    getAssignments: jest.fn().mockResolvedValue({
        data: [
            {
                id: 1,
                title: 'Mock Task',
                start_time: '09:00',
                end_time: '10:00'
            }
        ]
    }),
    updateAssignment: jest.fn().mockResolvedValue({
        data: {
            id: 1,
            status: 'ASSIGNED'
        }
    })
};
```

## Test Environment Setup

### Backend Environment

```python
# tests/conftest.py
import pytest
from app import create_app
from app.models import db

@pytest.fixture(scope='session')
def app():
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False
    })
    return app

@pytest.fixture(scope='function')
def client(app):
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()
```

### Frontend Environment

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({
    testIdAttribute: 'data-testid'
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});
``` 