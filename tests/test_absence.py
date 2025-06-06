import pytest
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.models import Base, TeacherAide, Task, Assignment, Absence
from api.constants import Status
from app import create_app

@pytest.fixture
def app():
    """Create a Flask app with an in-memory SQLite database."""
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    app = create_app(engine)
    return app

@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()

@pytest.fixture
def db_session(app):
    """Create a database session."""
    from api.db import get_db
    session = next(get_db())
    yield session
    session.rollback()

@pytest.fixture
def sample_aide(db_session):
    """Create a sample teacher aide."""
    aide = TeacherAide(
        name="Test Aide",
        qualifications="Test Qualifications",
        colour_hex="#FF0000"
    )
    db_session.add(aide)
    db_session.commit()
    return aide

@pytest.fixture
def sample_task(db_session):
    """Create a sample task."""
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("10:00", "%H:%M").time(),
        status=Status.UNASSIGNED
    )
    db_session.add(task)
    db_session.commit()
    return task

@pytest.fixture
def sample_assignment(db_session, sample_aide, sample_task):
    """Create a sample assignment."""
    assignment = Assignment(
        task_id=sample_task.id,
        aide_id=sample_aide.id,
        date=date.today(),
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("10:00", "%H:%M").time(),
        status=Status.ASSIGNED
    )
    db_session.add(assignment)
    db_session.commit()
    return assignment

@pytest.fixture
def absence_payload():
    return {
        "aide_id": 1,  # Will be updated in tests
        "date": date.today().isoformat(),
        "reason": "Test absence"
    }

@pytest.fixture
def aide_payload():
    return {
        "name": "Test Aide",
        "qualifications": "Test Qualification",
        "colour_hex": "#123ABC"
    }

@pytest.fixture
def task_payload():
    return {
        "title": "Test Task",
        "category": "CLASS_SUPPORT",
        "start_time": "09:00",
        "end_time": "10:00",
        "status": "UNASSIGNED"
    }

def test_create_and_get_absence(client, aide_payload, absence_payload):
    # Create aide first
    resp = client.post("/api/teacher-aides", json=aide_payload)
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Update absence payload with correct aide_id
    absence_payload["aide_id"] = aide_id
    
    # Create absence
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["aide_id"] == aide_id
    assert data["reason"] == absence_payload["reason"]
    absence_id = data["id"]
    
    # List absences
    resp = client.get("/api/absences")
    assert resp.status_code == 200
    absences = resp.get_json()["absences"]
    assert len(absences) == 1
    assert absences[0]["id"] == absence_id

def test_absence_validation(client, aide_payload):
    # Create aide first
    resp = client.post("/api/teacher-aides", json=aide_payload)
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Missing required fields
    resp = client.post("/api/absences", json={"reason": "Test"})
    assert resp.status_code == 422
    
    # Invalid date format
    resp = client.post("/api/absences", json={
        "aide_id": aide_id,
        "date": "invalid-date",
        "reason": "Test"
    })
    assert resp.status_code == 422
    
    # Nonexistent aide
    resp = client.post("/api/absences", json={
        "aide_id": 999,
        "date": date.today().isoformat(),
        "reason": "Test"
    })
    assert resp.status_code == 404

def test_duplicate_absence(client, aide_payload, absence_payload):
    # Create aide first
    resp = client.post("/api/teacher-aides", json=aide_payload)
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Update absence payload with correct aide_id
    absence_payload["aide_id"] = aide_id
    
    # Create first absence
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 201
    
    # Try to create duplicate
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 409

def test_absence_with_assignments(client, aide_payload, task_payload, absence_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Create task
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    task_id = resp.get_json()["id"]
    
    # Create assignment
    assignment_payload = {
        "task_id": task_id,
        "aide_id": aide_id,
        "date": date.today().isoformat(),
        "start_time": "09:00",
        "end_time": "10:00",
        "status": "ASSIGNED"
    }
    resp = client.post("/api/assignments", json=assignment_payload)
    assert resp.status_code == 201
    assignment_id = resp.get_json()["id"]
    
    # Create absence
    absence_payload["aide_id"] = aide_id
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert assignment_id in data["released_assignments"]
    
    # Verify assignment is unassigned
    resp = client.get(f"/api/assignments/{assignment_id}")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "UNASSIGNED"
    assert resp.get_json()["aide_id"] is None

def test_delete_absence(client, aide_payload, absence_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Create absence
    absence_payload["aide_id"] = aide_id
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 201
    absence_id = resp.get_json()["id"]
    
    # Delete absence
    resp = client.delete(f"/api/absences/{absence_id}")
    assert resp.status_code == 200
    
    # Verify absence is gone
    resp = client.get("/api/absences")
    assert resp.status_code == 200
    assert len(resp.get_json()["absences"]) == 0

def test_delete_nonexistent_absence(client):
    resp = client.delete("/api/absences/999")
    assert resp.status_code == 404

def test_list_absences_by_week(client, aide_payload, absence_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Create absences for different weeks
    today = date.today()
    week = today.isocalendar()
    week_str = f"{week[0]}-{week[1]:02d}"
    
    # This week
    absence_payload["aide_id"] = aide_id
    absence_payload["date"] = today.isoformat()
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 201
    
    # Next week
    next_week = today + timedelta(days=7)
    absence_payload["date"] = next_week.isoformat()
    resp = client.post("/api/absences", json=absence_payload)
    assert resp.status_code == 201
    
    # List this week's absences
    resp = client.get(f"/api/absences?week={week_str}")
    assert resp.status_code == 200
    absences = resp.get_json()["absences"]
    assert len(absences) == 1
    assert absences[0]["date"] == today.isoformat()

def test_invalid_week_format(client):
    resp = client.get("/api/absences?week=invalid")
    assert resp.status_code == 422 