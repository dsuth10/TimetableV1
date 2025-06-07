import pytest
from datetime import datetime, timedelta, time, date
from api.models import TeacherAide, Task, Assignment, Absence

def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json == {"status": "healthy"}


def test_404_on_unknown_endpoint(client):
    """Test that unknown endpoints return 404."""
    response = client.get('/api/unknown')
    assert response.status_code == 404


def test_cors_headers(client):
    """Test that CORS headers are present in responses."""
    response = client.get('/api/health')
    assert 'Access-Control-Allow-Origin' in response.headers
    assert response.headers['Access-Control-Allow-Origin'] == '*'


def test_app_testing_mode(test_app):
    """Test that the app is in testing mode during tests."""
    assert test_app.config['TESTING'] is True


def test_list_tasks(client, db_session):
    """Test task listing and creation."""
    # Clean up existing data
    db_session.query(Task).delete()
    db_session.commit()
    
    # Create test tasks
    task1 = Task(
        title="Task 1",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    task2 = Task(
        title="Task 2",
        category="CLASS_SUPPORT",
        start_time=time(9, 30),
        end_time=time(10, 30)
    )
    db_session.add_all([task1, task2])
    db_session.commit()
    
    # Test GET /api/tasks
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.get_json()
    assert "tasks" in data
    assert len(data["tasks"]) == 2
    assert data["tasks"][0]["title"] == "Task 1"
    assert data["tasks"][1]["title"] == "Task 2"
    assert "total" in data
    assert "page" in data
    assert "per_page" in data


def test_create_task_validation(client):
    """Test task creation validation."""
    # Test missing required fields
    resp = client.post("/api/tasks", json={})
    assert resp.status_code == 422
    data = resp.get_json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    
    # Test invalid category
    resp = client.post("/api/tasks", json={
        "title": "Test Task",
        "category": "INVALID_CATEGORY",
        "start_time": "08:30",
        "end_time": "09:00"
    })
    assert resp.status_code == 422
    data = resp.get_json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_teacher_aide_management(client, db_session):
    """Test teacher aide CRUD operations."""
    # Clean up existing aides
    db_session.query(TeacherAide).delete()
    db_session.commit()

    # Create test aide
    aide = TeacherAide(
        name="John Doe",
        qualifications="Bachelor in Education",
        colour_hex="#FF0000"
    )
    db_session.add(aide)
    db_session.commit()
    aide_id = aide.id  # Store id before session closes

    # Test GET /api/teacher-aides
    resp = client.get("/api/teacher-aides")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data) == 1
    assert data[0]["name"] == "John Doe"

    # Test GET /api/teacher-aides/{id}
    resp = client.get(f"/api/teacher-aides/{aide_id}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["name"] == "John Doe"


def test_assignment_conflicts(client, db_session):
    """Test assignment conflict detection."""
    # Clean up existing data
    db_session.query(Assignment).delete()
    db_session.query(Task).delete()
    db_session.query(TeacherAide).delete()
    db_session.commit()
    
    # Create test aide
    aide = TeacherAide(
        name="Test Aide",
        qualifications="Test Qualifications",
        colour_hex="#FF0000"
    )
    db_session.add(aide)
    db_session.commit()
    
    # Create test task
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    db_session.add(task)
    db_session.commit()
    
    # Create first assignment
    assignment1 = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
        status="ASSIGNED"
    )
    db_session.add(assignment1)
    db_session.commit()
    
    # Test creating conflicting assignment
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "09:30",
        "end_time": "10:30"
    })
    assert response.status_code == 409
    data = response.get_json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]


def test_absence_management(client, db_session):
    """Test absence management with edge cases."""
    # Clean up existing data
    db_session.query(Absence).delete()
    db_session.query(TeacherAide).delete()
    db_session.commit()
    
    # Create test aide
    aide = TeacherAide(
        name="Test Aide",
        qualifications="Test Qualifications",
        colour_hex="#FF0000"
    )
    db_session.add(aide)
    db_session.commit()
    
    # Test creating absence
    response = client.post(f"/api/teacher-aides/{aide.id}/absences", json={
        "start_date": date.today().isoformat(),
        "end_date": date.today().isoformat(),
        "reason": "Sick leave"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["start_date"] == date.today().isoformat()
    assert data["end_date"] == date.today().isoformat()
    assert data["reason"] == "Sick leave"
    
    # Test duplicate absence
    response = client.post(f"/api/teacher-aides/{aide.id}/absences", json={
        "start_date": date.today().isoformat(),
        "end_date": date.today().isoformat(),
        "reason": "Another reason"
    })
    assert response.status_code == 409
    data = response.get_json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"] 