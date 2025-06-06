import pytest
from datetime import datetime
from api.models import Classroom
from api.db import get_db

@pytest.fixture
def classroom_payload():
    return {
        "name": "Room 101",
        "capacity": 30,
        "notes": "Science Lab"
    }

def test_list_classrooms(client):
    """Test listing all classrooms."""
    # Create one
    payload = {"name": "Room 202", "capacity": 30, "notes": "B"}
    client.post("/api/classrooms", json=payload)
    
    # List
    resp = client.get("/api/classrooms")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "classrooms" in data
    assert isinstance(data["classrooms"], list)
    assert any(c["name"] == "Room 202" for c in data["classrooms"])

def test_create_and_get_classroom(client):
    """Test creating and retrieving a classroom."""
    payload = {"name": "Room 201", "capacity": 30, "notes": "A"}
    resp = client.post("/api/classrooms", json=payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == payload["name"]
    classroom_id = data["id"]
    
    # Get
    resp = client.get(f"/api/classrooms/{classroom_id}")
    assert resp.status_code == 200
    assert resp.get_json()["id"] == classroom_id

def test_update_and_delete_classroom(client):
    """Test updating and deleting a classroom."""
    payload = {"name": "Room 203", "capacity": 30, "notes": "C"}
    resp = client.post("/api/classrooms", json=payload)
    data = resp.get_json()
    classroom_id = data["id"]
    
    # Update
    update = {"name": "Room 203 Updated", "capacity": 35, "notes": "Updated"}
    resp = client.put(f"/api/classrooms/{classroom_id}", json=update)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["name"] == "Room 203 Updated"
    assert data["capacity"] == 35
    
    # Delete
    resp = client.delete(f"/api/classrooms/{classroom_id}")
    assert resp.status_code == 200
    
    # Confirm gone
    resp = client.get(f"/api/classrooms/{classroom_id}")
    assert resp.status_code == 404

def test_classroom_validation(client):
    """Test classroom validation rules."""
    # Missing name
    resp = client.post("/api/classrooms", json={"capacity": 30})
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"] == "VALIDATION_ERROR"
    assert "Name is required" in data["message"]
    
    # Empty data
    resp = client.post("/api/classrooms", json={})
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"] == "VALIDATION_ERROR"
    assert "No data provided" in data["message"]
    
    # Invalid capacity type
    resp = client.post("/api/classrooms", json={"name": "Room 204", "capacity": "invalid"})
    assert resp.status_code == 422

def test_classroom_not_found(client):
    """Test handling of non-existent classrooms."""
    # Get non-existent
    resp = client.get("/api/classrooms/9999")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["error"] == "NOT_FOUND"
    
    # Update non-existent
    resp = client.put("/api/classrooms/9999", json={"name": "New Name"})
    assert resp.status_code == 404
    
    # Delete non-existent
    resp = client.delete("/api/classrooms/9999")
    assert resp.status_code == 404

def test_classroom_conflict(client):
    """Test handling of classroom name conflicts."""
    payload = {"name": "Room 205", "capacity": 30, "notes": "D"}
    resp = client.post("/api/classrooms", json=payload)
    assert resp.status_code == 201
    
    # Try to create another with same name
    resp = client.post("/api/classrooms", json=payload)
    assert resp.status_code == 409
    data = resp.get_json()
    assert data["error"] == "CONFLICT"
    assert "already exists" in data["message"] 