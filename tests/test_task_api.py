import pytest
from datetime import time, date, timedelta
from sqlalchemy.orm import Session
from api.models import Assignment, Classroom
from api.db import get_db, managed_session
import uuid

@pytest.fixture
def classroom_payload():
    return {
        "name": "Task Test Room",
        "capacity": 30
    }

@pytest.fixture
def classroom_id(client, classroom_payload):
    resp = client.post("/api/classrooms", json=classroom_payload)
    if resp.status_code == 201:
        return resp.get_json()["id"]
    # fallback for test environments where classroom endpoint is not implemented
    return 1

@pytest.fixture
def task_payload(classroom_id):
    return {
        "title": "Morning Playground Duty",
        "category": "PLAYGROUND",
        "start_time": "08:30",
        "end_time": "09:00",
        "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        "classroom_id": classroom_id,
        "notes": "Supervise morning recess"
    }

@pytest.fixture
def db_session():
    """Provide a database session for testing."""
    with managed_session() as session:
        yield session
        session.rollback()  # Rollback changes after each test

def test_create_and_get_task(client, task_payload):
    # Create
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["task"]["title"] == task_payload["title"]
    task_id = data["task"]["id"]
    
    # Get
    resp = client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.get_json()["task"]["id"] == task_id

def test_list_tasks_with_filters(client, task_payload):
    # Create a task
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    
    # Test list with no filters
    resp = client.get("/api/tasks")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "tasks" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data
    assert len(data["tasks"]) > 0
    
    # Test list with status filter
    resp = client.get("/api/tasks?status=UNASSIGNED")
    assert resp.status_code == 200
    data = resp.get_json()
    assert all(task["status"] == "UNASSIGNED" for task in data["tasks"])
    
    # Test list with category filter
    resp = client.get("/api/tasks?category=PLAYGROUND")
    assert resp.status_code == 200
    data = resp.get_json()
    assert all(task["category"] == "PLAYGROUND" for task in data["tasks"])
    
    # Test list with date filters
    today = date.today().isoformat()
    next_week = (date.today() + timedelta(days=7)).isoformat()
    resp = client.get(f"/api/tasks?start_date={today}&end_date={next_week}")
    assert resp.status_code == 200

def test_update_and_delete_task(client, task_payload):
    # Create
    resp = client.post("/api/tasks", json=task_payload)
    task_id = resp.get_json()["task"]["id"]
    
    # Update
    update = {
        "title": "Updated Title",
        "start_time": "09:00",
        "end_time": "09:30"
    }
    resp = client.put(f"/api/tasks/{task_id}", json=update)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["task"]["title"] == "Updated Title"
    assert data["task"]["start_time"] == "09:00"
    
    # Delete
    resp = client.delete(f"/api/tasks/{task_id}")
    assert resp.status_code == 204
    
    # Confirm gone
    resp = client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 404

def test_task_validation(client):
    # Missing required fields
    resp = client.post("/api/tasks", json={})
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    
    # Invalid category
    bad = {
        "title": "Test",
        "category": "INVALID",
        "start_time": "08:30",
        "end_time": "09:00"
    }
    resp = client.post("/api/tasks", json=bad)
    assert resp.status_code == 422
    
    # Invalid time format
    bad = {
        "title": "Test",
        "category": "PLAYGROUND",
        "start_time": "bad",
        "end_time": "09:00"
    }
    resp = client.post("/api/tasks", json=bad)
    assert resp.status_code == 422
    
    # End before start
    bad = {
        "title": "Test",
        "category": "PLAYGROUND",
        "start_time": "09:00",
        "end_time": "08:30"
    }
    resp = client.post("/api/tasks", json=bad)
    assert resp.status_code == 422
    
    # Invalid recurrence rule
    bad = {
        "title": "Test",
        "category": "PLAYGROUND",
        "start_time": "08:30",
        "end_time": "09:00",
        "recurrence_rule": "INVALID"
    }
    resp = client.post("/api/tasks", json=bad)
    assert resp.status_code == 422

def test_task_not_found(client):
    # Get nonexistent task
    resp = client.get("/api/tasks/9999")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["error"]["code"] == "NOT_FOUND"
    
    # Update nonexistent task
    resp = client.put("/api/tasks/9999", json={"title": "New Title"})
    assert resp.status_code == 404
    
    # Delete nonexistent task
    resp = client.delete("/api/tasks/9999")
    assert resp.status_code == 404

def test_task_pagination(client, task_payload):
    # Create multiple tasks
    for i in range(25):
        task_payload["title"] = f"Task {i}"
        client.post("/api/tasks", json=task_payload)
    
    # Test first page
    resp = client.get("/api/tasks?page=1&per_page=10")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["tasks"]) == 10
    assert data["page"] == 1
    assert data["per_page"] == 10
    assert data["total"] >= 25
    
    # Test second page
    resp = client.get("/api/tasks?page=2&per_page=10")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["tasks"]) == 10
    assert data["page"] == 2

def test_recurring_task_assignments(client, task_payload, db_session):
    # Clean up existing assignments
    db_session.query(Assignment).delete()
    db_session.commit()

    # Create a classroom via the API
    classroom_payload = {"name": f"Task Test Room {uuid.uuid4()}", "capacity": 30}
    resp = client.post("/api/classrooms", json=classroom_payload)
    assert resp.status_code == 201
    classroom_id = resp.get_json()["id"]
    task_payload["classroom_id"] = classroom_id

    # Add expires_on to the task payload
    task_payload["expires_on"] = (date.today() + timedelta(weeks=4)).isoformat()

    # Create recurring task
    resp = client.post("/api/tasks", json=task_payload)
    print("Task creation response:", resp.status_code, resp.get_json())
    assert resp.status_code == 201
    task_data = resp.get_json()
    assert "task" in task_data
    assert "assignments" in task_data
    task_id = task_data["task"]["id"]
    print("Created task:", task_data["task"])
    print("Generated assignments:", task_data["assignments"])
    assert len(task_data["assignments"]) > 0

    # Verify assignments were created
    resp = client.get("/api/assignments")
    print("Assignments response:", resp.status_code, resp.get_json())
    assert resp.status_code == 200
    data = resp.get_json()
    print("All assignments:", data["assignments"])
    assignments_for_task = [a for a in data["assignments"] if a["task_id"] == task_id]
    print("Assignments for task:", assignments_for_task)
    assert len(assignments_for_task) > 0

def test_update_task(client, task_payload):
    # Create a task
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    task_id = resp.get_json()["task"]["id"]
    
    # Update task details
    update_payload = {
        "title": "Updated Task Title",
        "notes": "Updated notes for the task"
    }
    resp = client.put(f"/api/tasks/{task_id}", json=update_payload)
    assert resp.status_code == 200
    updated_task = resp.get_json()
    assert updated_task["task"]["title"] == update_payload["title"]
    assert updated_task["task"]["notes"] == update_payload["notes"]

def test_update_task_recurrence(client, task_payload):
    # Create a classroom via the API
    classroom_payload = {"name": f"Task Test Room {uuid.uuid4()}", "capacity": 30}
    resp = client.post("/api/classrooms", json=classroom_payload)
    assert resp.status_code == 201
    classroom_id = resp.get_json()["id"]
    task_payload["classroom_id"] = classroom_id

    # Create a recurring task
    resp = client.post("/api/tasks", json=task_payload)
    print("Task creation response:", resp.status_code, resp.get_json())
    assert resp.status_code == 201
    task_data = resp.get_json()
    assert "task" in task_data
    assert "assignments" in task_data
    task_id = task_data["task"]["id"]
    print("Created task:", task_data["task"])
    print("Generated assignments:", task_data["assignments"])
    assert len(task_data["assignments"]) > 0

    # Update recurrence rule and set expires_on
    update_payload = {
        "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        "expires_on": (date.today() + timedelta(weeks=4)).isoformat()
    }
    resp = client.put(f"/api/tasks/{task_id}", json=update_payload)
    print("Task update response:", resp.status_code, resp.get_json())
    assert resp.status_code == 200
    updated_task = resp.get_json()
    assert "task" in updated_task
    assert "assignments" in updated_task
    print("Updated task:", updated_task["task"])
    print("Regenerated assignments:", updated_task["assignments"])
    assert len(updated_task["assignments"]) > 0 