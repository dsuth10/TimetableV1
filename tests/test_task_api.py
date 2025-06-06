import pytest
from datetime import time, date, timedelta
from sqlalchemy.orm import Session
from api.models import Assignment
from api.db import SessionLocal

@pytest.fixture
def classroom_payload():
    return {
        "name": "Classroom 1",
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

def test_create_and_get_task(client, task_payload):
    # Create
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["title"] == task_payload["title"]
    task_id = data["id"]
    
    # Get
    resp = client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.get_json()["id"] == task_id

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
    task_id = resp.get_json()["id"]
    
    # Update
    update = {
        "title": "Updated Title",
        "start_time": "09:00",
        "end_time": "09:30"
    }
    resp = client.put(f"/api/tasks/{task_id}", json=update)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["title"] == "Updated Title"
    assert data["start_time"] == "09:00"
    
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

def test_recurring_task_assignments(client, task_payload):
    # Clean up existing assignments
    session = SessionLocal()
    session.query(Assignment).delete()
    session.commit()
    session.close()
    
    # Add expires_on to the task payload
    task_payload["expires_on"] = (date.today() + timedelta(weeks=4)).isoformat()
    
    # Create recurring task
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    task_id = resp.get_json()["id"]
    
    # Verify assignments were created
    resp = client.get("/api/assignments")
    assert resp.status_code == 200
    data = resp.get_json()
    assignments_for_task = [a for a in data["assignments"] if a["task_id"] == task_id]
    assert len(assignments_for_task) > 0
    assert all(assignment["task_id"] == task_id for assignment in assignments_for_task)

def test_update_task(client, task_payload):
    # Create a task
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    task_id = resp.get_json()["id"]
    
    # Update task details
    update_payload = {
        "title": "Updated Task Title",
        "notes": "Updated notes for the task"
    }
    resp = client.patch(f"/api/tasks/{task_id}", json=update_payload)
    assert resp.status_code == 200
    updated_task = resp.get_json()
    assert updated_task["title"] == update_payload["title"]
    assert updated_task["notes"] == update_payload["notes"]

def test_update_task_recurrence(client, task_payload):
    # Create a recurring task
    resp = client.post("/api/tasks", json=task_payload)
    assert resp.status_code == 201
    task_id = resp.get_json()["id"]
    
    # Update recurrence rule and set expires_on
    update_payload = {
        "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        "expires_on": (date.today() + timedelta(weeks=4)).isoformat()
    }
    resp = client.patch(f"/api/tasks/{task_id}", json=update_payload)
    assert resp.status_code == 200
    
    # Verify assignments are regenerated
    resp = client.get("/api/assignments?per_page=100")
    assert resp.status_code == 200
    data = resp.get_json()
    assignments_for_task = [a for a in data["assignments"] if a["task_id"] == task_id]
    assert len(assignments_for_task) > 0 