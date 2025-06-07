import pytest
from datetime import time
import logging

logger = logging.getLogger(__name__)

@pytest.fixture
def aide_payload():
    return {
        "name": "Test Aide",
        "qualifications": "Test Qualification",
        "colour_hex": "#123ABC"
    }

@pytest.fixture
def availability_payload():
    return {
        "weekday": "MO",
        "start_time": "08:00",
        "end_time": "12:00"
    }

def test_create_and_get_teacher_aide(client, aide_payload):
    # Create
    resp = client.post("/api/teacher-aides", json=aide_payload)
    logger.debug(f"Create response status: {resp.status_code}")
    logger.debug(f"Create response data: {resp.get_json()}")
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == aide_payload["name"]
    aide_id = data["id"]
    # Get
    resp = client.get(f"/api/teacher-aides/{aide_id}")
    logger.debug(f"Get response status: {resp.status_code}")
    logger.debug(f"Get response data: {resp.get_json()}")
    assert resp.status_code == 200
    assert resp.get_json()["id"] == aide_id

def test_list_teacher_aides(client, aide_payload):
    # Create one
    client.post("/api/teacher-aides", json=aide_payload)
    # List
    resp = client.get("/api/teacher-aides")
    logger.debug(f"List response status: {resp.status_code}")
    logger.debug(f"List response data: {resp.get_json()}")
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)

def test_update_and_delete_teacher_aide(client, aide_payload):
    # Create
    resp = client.post("/api/teacher-aides", json=aide_payload)
    aide_id = resp.get_json()["id"]
    # Update
    update = {"name": "Updated Name", "colour_hex": "#ABC123"}
    resp = client.put(f"/api/teacher-aides/{aide_id}", json=update)
    logger.debug(f"Update response status: {resp.status_code}")
    logger.debug(f"Update response data: {resp.get_json()}")
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "Updated Name"
    # Delete
    resp = client.delete(f"/api/teacher-aides/{aide_id}")
    logger.debug(f"Delete response status: {resp.status_code}")
    assert resp.status_code == 204
    # Confirm gone
    resp = client.get(f"/api/teacher-aides/{aide_id}")
    logger.debug(f"Get after delete response status: {resp.status_code}")
    logger.debug(f"Get after delete response data: {resp.get_json()}")
    assert resp.status_code == 404

def test_teacher_aide_validation(client):
    # Missing name
    resp = client.post("/api/teacher-aides", json={"colour_hex": "#123456"})
    logger.debug(f"Missing name response status: {resp.status_code}")
    logger.debug(f"Missing name response data: {resp.get_json()}")
    assert resp.status_code == 422
    # Invalid colour_hex
    resp = client.post("/api/teacher-aides", json={"name": "A", "colour_hex": "123456"})
    logger.debug(f"Invalid colour_hex response status: {resp.status_code}")
    logger.debug(f"Invalid colour_hex response data: {resp.get_json()}")
    assert resp.status_code == 422
    # Invalid colour_hex length
    resp = client.post("/api/teacher-aides", json={"name": "A", "colour_hex": "#12345"})
    logger.debug(f"Invalid colour_hex length response status: {resp.status_code}")
    logger.debug(f"Invalid colour_hex length response data: {resp.get_json()}")
    assert resp.status_code == 422

def test_availability_crud(client, aide_payload, availability_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    aide_id = resp.get_json()["id"]
    # Add availability
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=availability_payload)
    logger.debug(f"Add availability response status: {resp.status_code}")
    logger.debug(f"Add availability response data: {resp.get_json()}")
    assert resp.status_code == 201
    avail_id = resp.get_json()["id"]
    # List availability
    resp = client.get(f"/api/teacher-aides/{aide_id}/availability")
    logger.debug(f"List availability response status: {resp.status_code}")
    logger.debug(f"List availability response data: {resp.get_json()}")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1
    # Update availability
    update = {"start_time": "09:00", "end_time": "12:00"}
    resp = client.put(f"/api/teacher-aides/{aide_id}/availability/{avail_id}", json=update)
    logger.debug(f"Update availability response status: {resp.status_code}")
    logger.debug(f"Update availability response data: {resp.get_json()}")
    assert resp.status_code == 200
    assert resp.get_json()["start_time"] == "09:00"
    # Delete availability
    resp = client.delete(f"/api/teacher-aides/{aide_id}/availability/{avail_id}")
    logger.debug(f"Delete availability response status: {resp.status_code}")
    assert resp.status_code == 204
    # Confirm gone
    resp = client.get(f"/api/teacher-aides/{aide_id}/availability")
    logger.debug(f"List after delete response status: {resp.status_code}")
    logger.debug(f"List after delete response data: {resp.get_json()}")
    assert resp.status_code == 200
    assert resp.get_json() == []

def test_availability_validation(client, aide_payload):
    # Create aide
    resp = client.post("/api/teacher-aides", json=aide_payload)
    aide_id = resp.get_json()["id"]
    # Invalid weekday
    bad = {"weekday": "XX", "start_time": "08:00", "end_time": "12:00"}
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=bad)
    logger.debug(f"Invalid weekday response status: {resp.status_code}")
    logger.debug(f"Invalid weekday response data: {resp.get_json()}")
    assert resp.status_code == 422
    # Invalid time format
    bad = {"weekday": "MO", "start_time": "bad", "end_time": "12:00"}
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=bad)
    logger.debug(f"Invalid time format response status: {resp.status_code}")
    logger.debug(f"Invalid time format response data: {resp.get_json()}")
    assert resp.status_code == 422
    # End before start
    bad = {"weekday": "MO", "start_time": "12:00", "end_time": "08:00"}
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=bad)
    logger.debug(f"End before start response status: {resp.status_code}")
    logger.debug(f"End before start response data: {resp.get_json()}")
    assert resp.status_code == 422
    # Out of allowed time range
    bad = {"weekday": "MO", "start_time": "07:00", "end_time": "08:30"}
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=bad)
    logger.debug(f"Out of range response status: {resp.status_code}")
    logger.debug(f"Out of range response data: {resp.get_json()}")
    assert resp.status_code == 422
    # Duplicate weekday
    good = {"weekday": "MO", "start_time": "08:00", "end_time": "09:00"}
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=good)
    logger.debug(f"First weekday response status: {resp.status_code}")
    logger.debug(f"First weekday response data: {resp.get_json()}")
    assert resp.status_code == 201
    resp = client.post(f"/api/teacher-aides/{aide_id}/availability", json=good)
    logger.debug(f"Duplicate weekday response status: {resp.status_code}")
    logger.debug(f"Duplicate weekday response data: {resp.get_json()}")
    assert resp.status_code == 409

def test_availability_not_found(client):
    # Nonexistent aide
    resp = client.get("/api/teacher-aides/9999/availability")
    logger.debug(f"Nonexistent aide response status: {resp.status_code}")
    logger.debug(f"Nonexistent aide response data: {resp.get_json()}")
    assert resp.status_code == 404
    # Nonexistent availability
    resp = client.put("/api/teacher-aides/1/availability/9999", json={"start_time": "09:00", "end_time": "10:00"})
    logger.debug(f"Nonexistent availability update response status: {resp.status_code}")
    logger.debug(f"Nonexistent availability update response data: {resp.get_json()}")
    assert resp.status_code == 404
    resp = client.delete("/api/teacher-aides/1/availability/9999")
    logger.debug(f"Nonexistent availability delete response status: {resp.status_code}")
    assert resp.status_code == 404 