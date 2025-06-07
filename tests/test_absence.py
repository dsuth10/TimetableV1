import pytest
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.models import Base, TeacherAide, Task, Assignment, Absence
from api.constants import Status
from app import create_app
import logging

logger = logging.getLogger(__name__)

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
        "start_date": date.today().isoformat(),
        "end_date": date.today().isoformat(),
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
    logger.debug(f"Create aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]

    # Create absence
    absence_data = {
        "aide_id": aide_id,
        "start_date": absence_payload["start_date"],
        "end_date": absence_payload["end_date"],
        "reason": absence_payload["reason"]
    }
    resp = client.post("/api/absences", json=absence_data)
    logger.debug(f"Create absence response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["aide_id"] == aide_id
    assert data["reason"] == absence_payload["reason"]
    absence_id = data["id"]

    # List absences
    resp = client.get("/api/absences")
    logger.debug(f"List absences response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "absences" in data
    absences = data["absences"]
    assert len(absences) == 1
    assert absences[0]["id"] == absence_id
    assert absences[0]["aide_id"] == aide_id
    assert absences[0]["reason"] == absence_payload["reason"]

def test_absence_validation(client, aide_payload):
    # Create aide first
    resp = client.post("/api/teacher-aides", json=aide_payload)
    logger.debug(f"Create aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Missing required fields
    resp = client.post(f"/api/teacher-aides/{aide_id}/absences", json={"reason": "Test"})
    logger.debug(f"Missing date response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 422
    
    # Invalid date format
    resp = client.post(f"/api/teacher-aides/{aide_id}/absences", json={
        "start_date": "invalid-date",
        "end_date": date.today().isoformat(),
        "reason": "Test"
    })
    logger.debug(f"Invalid date response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 422
    
    # Nonexistent aide
    resp = client.post("/api/teacher-aides/999/absences", json={
        "start_date": date.today().isoformat(),
        "end_date": date.today().isoformat(),
        "reason": "Test"
    })
    logger.debug(f"Nonexistent aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 404

def test_duplicate_absence(client, aide_payload, absence_payload):
    # Create aide first
    resp = client.post("/api/teacher-aides", json=aide_payload)
    logger.debug(f"Create aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Create first absence
    resp = client.post(f"/api/teacher-aides/{aide_id}/absences", json=absence_payload)
    logger.debug(f"First absence response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    
    # Try to create duplicate
    resp = client.post(f"/api/teacher-aides/{aide_id}/absences", json=absence_payload)
    logger.debug(f"Duplicate absence response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 409

def test_absence_with_assignments(client, aide_payload, task_payload, absence_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    logger.debug(f"Create aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]

    # Create task
    resp = client.post("/api/tasks", json=task_payload)
    logger.debug(f"Create task response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    task_id = resp.get_json()["task"]["id"]

    # Use a fixed date for both assignment and absence
    fixed_date = date.today().isoformat()

    # Create assignment
    assignment_payload = {
        "task_id": task_id,
        "aide_id": aide_id,
        "date": fixed_date,
        "start_time": "09:00",
        "end_time": "10:00",
        "status": "ASSIGNED"
    }
    resp = client.post("/api/assignments", json=assignment_payload)
    logger.debug(f"Create assignment response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    assignment_id = resp.get_json()["id"]

    # Debug: Print assignment details
    resp = client.get(f"/api/assignments/{assignment_id}")
    logger.debug(f"Assignment details before absence: {resp.get_json()}")

    # Create absence using the same fixed date
    absence_data = {
        "aide_id": aide_id,
        "start_date": fixed_date,
        "end_date": fixed_date,
        "reason": absence_payload["reason"]
    }
    resp = client.post("/api/absences", json=absence_data)
    logger.debug(f"Create absence response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    data = resp.get_json()
    assert "affected_assignments" in data
    assert len(data["affected_assignments"]) == 1
    assert data["affected_assignments"][0]["id"] == assignment_id
    assert data["affected_assignments"][0]["status"] == "UNASSIGNED"

def test_delete_absence(client, aide_payload, absence_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    logger.debug(f"Create aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Create absence
    resp = client.post(f"/api/teacher-aides/{aide_id}/absences", json=absence_payload)
    logger.debug(f"Create absence response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    absence_id = resp.get_json()["id"]
    
    # Delete absence
    resp = client.delete(f"/api/teacher-aides/{aide_id}/absences/{absence_id}")
    logger.debug(f"Delete absence response: {resp.status_code}")
    assert resp.status_code == 204
    
    # Verify absence is gone
    resp = client.get(f"/api/teacher-aides/{aide_id}/absences")
    logger.debug(f"List absences response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 0

def test_delete_nonexistent_absence(client, aide_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    logger.debug(f"Create aide response: {resp.status_code} - {resp.get_json()}")
    assert resp.status_code == 201
    aide_id = resp.get_json()["id"]
    
    # Try to delete nonexistent absence
    resp = client.delete(f"/api/teacher-aides/{aide_id}/absences/999")
    logger.debug(f"Delete nonexistent absence response: {resp.status_code} - {resp.get_json()}")
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
    absence_data = {
        "aide_id": aide_id,
        "start_date": today.isoformat(),
        "end_date": today.isoformat(),
        "reason": absence_payload["reason"]
    }
    resp = client.post("/api/absences", json=absence_data)
    assert resp.status_code == 201

    # Next week
    next_week = today + timedelta(days=7)
    absence_data["start_date"] = next_week.isoformat()
    absence_data["end_date"] = next_week.isoformat()
    resp = client.post("/api/absences", json=absence_data)
    assert resp.status_code == 201

    # List absences for this week
    resp = client.get(f"/api/absences?week={week_str}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "absences" in data
    absences = data["absences"]
    assert len(absences) == 1
    assert absences[0]["aide_id"] == aide_id
    assert absences[0]["start_date"] == today.isoformat()
    assert absences[0]["end_date"] == today.isoformat()

    # List absences for next week
    next_week_iso = next_week.isocalendar()
    next_week_str = f"{next_week_iso[0]}-{next_week_iso[1]:02d}"
    resp = client.get(f"/api/absences?week={next_week_str}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "absences" in data
    absences = data["absences"]
    assert len(absences) == 1
    assert absences[0]["aide_id"] == aide_id
    assert absences[0]["start_date"] == next_week.isoformat()
    assert absences[0]["end_date"] == next_week.isoformat()

def test_invalid_week_format(client):
    resp = client.get("/api/absences?week=invalid")
    assert resp.status_code == 422 