import pytest
from datetime import date, time, datetime, timedelta
from api.models import TeacherAide, Task, Assignment, Classroom
from dateutil.rrule import rrulestr
from api.db import init_db
import uuid

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

def create_test_data(db_session):
    # Create test classroom with unique name
    classroom = Classroom(name=f"Assignment Test Room {uuid.uuid4()}", capacity=20)
    db_session.add(classroom)
    db_session.commit()

    # Create test task
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0),
        classroom_id=classroom.id,
        status="UNASSIGNED"
    )
    db_session.add(task)
    db_session.commit()

    # Create test aide
    aide = TeacherAide(
        name="Test Aide",
        qualifications="Test Qualifications",
        colour_hex="#FF0000"
    )
    db_session.add(aide)
    db_session.commit()

    return classroom, task, aide

def test_get_assignments_weekly(client, db_session):
    # Clear the assignments table before running the test
    db_session.query(Assignment).delete()
    db_session.commit()
    classroom, task, aide = create_test_data(db_session)
    
    # Create some test assignments
    today = date.today()
    # Ensure assignments are created in the current week
    start_of_week = today - timedelta(days=today.weekday())
    assignments = [
        Assignment(
            task_id=task.id,
            aide_id=aide.id,
            date=start_of_week + timedelta(days=i),
            start_time=time(9, 0),
            end_time=time(10, 0),
            status="ASSIGNED"
        ) for i in range(7)
    ]
    db_session.add_all(assignments)
    db_session.commit()
    print("Created assignments:", [a.date for a in assignments])

    # Get current week number
    year, week, _ = today.isocalendar()
    week_param = f"{year}-W{week:02d}"
    print("Week parameter:", week_param)

    # Test weekly view
    response = client.get(f"/api/assignments?week={week_param}")
    assert response.status_code == 200
    data = response.get_json()
    print("Returned assignments:", data["assignments"])
    assert "assignments" in data
    assert len(data["assignments"]) == 7
    assert data["total"] == 7

def test_create_assignment(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Test creating a valid assignment
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "09:00",
        "end_time": "10:00"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["task_id"] == task.id
    assert data["aide_id"] == aide.id
    assert data["status"] == "ASSIGNED"

    # Test creating assignment without aide
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "date": date.today().isoformat(),
        "start_time": "09:00",
        "end_time": "10:00"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["task_id"] == task.id
    assert data["aide_id"] is None
    assert data["status"] == "UNASSIGNED"

    # Test creating assignment with invalid time
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "10:00",
        "end_time": "09:00"  # Invalid: end time before start time
    })
    assert response.status_code == 422

def test_create_batch_assignments(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Test creating batch assignments
    start_date = date.today()
    dates = [
        start_date.isoformat(),
        (start_date + timedelta(days=1)).isoformat(),
        (start_date + timedelta(days=2)).isoformat()
    ]
    
    response = client.post("/api/assignments/batch", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "dates": dates,
        "start_time": "09:00",
        "end_time": "10:00"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "assignments" in data
    assert len(data["assignments"]) == 3
    for assignment in data["assignments"]:
        assert assignment["task_id"] == task.id
        assert assignment["aide_id"] == aide.id
        assert assignment["status"] == "ASSIGNED"

    # Test with invalid date
    response = client.post("/api/assignments/batch", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "dates": ["invalid-date"],
        "start_time": "09:00",
        "end_time": "10:00"
    })
    assert response.status_code == 422

def test_check_conflicts(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Ensure aide is committed and visible
    db_session.commit()
    db_session.refresh(aide)
    
    # Extract task_title before session is closed
    task_title = task.title
    
    # Create an existing assignment
    existing = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
        status="ASSIGNED"
    )
    db_session.add(existing)
    db_session.commit()
    db_session.refresh(existing)
    
    # Test checking for conflicts
    response = client.post("/api/assignments/check", json={
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "09:30",
        "end_time": "10:30"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["has_conflict"] is True
    assert "conflicting_assignment" in data
    assert data["conflicting_assignment"]["id"] == existing.id
    assert data["conflicting_assignment"]["task_title"] == task_title
    
    # Test checking with no conflicts
    response = client.post("/api/assignments/check", json={
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "10:30",
        "end_time": "11:30"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["has_conflict"] is False
    assert "conflicting_assignment" not in data

def test_update_assignment(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Create an assignment
    assignment = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
        status="UNASSIGNED"
    )
    db_session.add(assignment)
    db_session.commit()

    # Test updating assignment status
    response = client.patch(f"/api/assignments/{assignment.id}", json={
        "status": "IN_PROGRESS"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "IN_PROGRESS"

    # Test updating with invalid status
    response = client.patch(f"/api/assignments/{assignment.id}", json={
        "status": "INVALID_STATUS"
    })
    assert response.status_code == 422

def test_delete_assignment(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Create an assignment
    assignment = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
        status="UNASSIGNED"
    )
    db_session.add(assignment)
    db_session.commit()

    # Test deleting assignment
    response = client.delete(f"/api/assignments/{assignment.id}")
    assert response.status_code == 204

    # Test deleting non-existent assignment
    response = client.delete("/api/assignments/999")
    assert response.status_code == 404

def test_assignment_validation(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Test missing required fields
    response = client.post("/api/assignments", json={
        "task_id": task.id
        # Missing date, start_time, end_time
    })
    assert response.status_code == 422
    data = response.get_json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    
    # Test invalid date format
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "date": "invalid-date",
        "start_time": "09:00",
        "end_time": "10:00"
    })
    assert response.status_code == 422
    data = response.get_json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    
    # Test invalid time format
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "date": date.today().isoformat(),
        "start_time": "invalid-time",
        "end_time": "10:00"
    })
    assert response.status_code == 422
    data = response.get_json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]

def test_batch_assignment_validation(client, db_session):
    classroom, task, aide = create_test_data(db_session)
    
    # Test missing required fields
    response = client.post("/api/assignments/batch", json={
        "task_id": task.id
        # Missing start_date, end_date, recurrence_rule
    })
    assert response.status_code == 422

    # Test invalid date range
    response = client.post("/api/assignments/batch", json={
        "task_id": task.id,
        "start_date": date.today().isoformat(),
        "end_date": (date.today() - timedelta(days=1)).isoformat(),  # End date before start date
        "recurrence_rule": "FREQ=DAILY"
    })
    assert response.status_code == 422

def test_weekly_view_validation(client, db_session):
    # Test invalid week format
    response = client.get("/api/assignments?week=invalid-week")
    assert response.status_code == 422

    # Test non-existent week
    response = client.get("/api/assignments?week=2024-99")
    assert response.status_code == 422

def test_check_conflicts_detached_instance(client, db_session):
    """Test that AssignmentCheckResource properly handles relationship loading without DetachedInstanceError."""
    classroom, task, aide = create_test_data(db_session)
    
    # Create an existing assignment
    existing = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
        status="ASSIGNED"
    )
    db_session.add(existing)
    db_session.commit()
    db_session.refresh(existing)
    
    # Ensure task and aide are loaded in the session
    db_session.refresh(task)
    db_session.refresh(aide)
    
    # Test checking for conflicts with overlapping time
    response = client.post("/api/assignments/check", json={
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "09:30",
        "end_time": "10:30"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["has_conflict"] is True
    assert "conflicting_assignment" in data
    conflict = data["conflicting_assignment"]
    
    # Verify all expected fields are present and accessible
    assert "id" in conflict
    assert "task_id" in conflict
    assert "task_title" in conflict
    assert "aide_id" in conflict
    assert "date" in conflict
    assert "start_time" in conflict
    assert "end_time" in conflict
    assert "status" in conflict
    
    # Verify the values match the existing assignment
    assert conflict["id"] == existing.id
    assert conflict["task_id"] == task.id
    assert conflict["task_title"] == task.title
    assert conflict["aide_id"] == aide.id
    assert conflict["status"] == "ASSIGNED"
    
    # Test with no conflicts
    response = client.post("/api/assignments/check", json={
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "10:30",
        "end_time": "11:30"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["has_conflict"] is False
    assert "conflicting_assignment" not in data 

def test_weekly_matrix_endpoint(client, db_session):
    """Test the weekly matrix endpoint returns correct structure for UI."""
    classroom, task, aide = create_test_data(db_session)
    
    # Create a second aide for testing
    aide2 = TeacherAide(
        name="Test Aide 2",
        qualifications="Test Qualifications 2",
        colour_hex="#00FF00"
    )
    db_session.add(aide2)
    db_session.commit()
    
    # Create assignments for the current week
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    
    # Create assignments for Monday and Wednesday
    assignments = [
        Assignment(
            task_id=task.id,
            aide_id=aide.id,
            date=start_of_week,  # Monday
            start_time=time(9, 0),
            end_time=time(10, 0),
            status="ASSIGNED"
        ),
        Assignment(
            task_id=task.id,
            aide_id=aide2.id,
            date=start_of_week + timedelta(days=2),  # Wednesday
            start_time=time(14, 0),
            end_time=time(15, 0),
            status="ASSIGNED"
        )
    ]
    db_session.add_all(assignments)
    db_session.commit()
    
    # Get current week number
    year, week, _ = today.isocalendar()
    week_param = f"{year}-W{week:02d}"
    
    # Test weekly matrix endpoint
    response = client.get(f"/api/assignments/weekly-matrix?week={week_param}")
    assert response.status_code == 200
    
    data = response.get_json()
    
    # Verify structure
    assert "week" in data
    assert "start_date" in data
    assert "end_date" in data
    assert "time_slots" in data
    assert "days" in data
    assert "aides" in data
    assert "assignments" in data
    assert "absences" in data
    
    # Verify week parameter
    assert data["week"] == week_param
    
    # Verify time slots (30-minute intervals from 08:00 to 16:00)
    assert len(data["time_slots"]) == 16  # 8 hours * 2 slots per hour
    assert data["time_slots"][0] == "08:00"
    assert data["time_slots"][-1] == "15:30"
    
    # Verify days
    expected_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    assert data["days"] == expected_days
    
    # Verify aides
    assert len(data["aides"]) == 2
    aide_names = [aide["name"] for aide in data["aides"]]
    assert "Test Aide" in aide_names
    assert "Test Aide 2" in aide_names
    
    # Verify assignments are present
    assert len(data["assignments"]) > 0
    
    # Check for Monday assignment (aide 1)
    monday_key = f"{aide.id}_Monday_09:00"
    assert monday_key in data["assignments"]
    monday_assignment = data["assignments"][monday_key]
    assert monday_assignment["task_title"] == "Test Task"
    assert monday_assignment["start_time"] == "09:00"
    assert monday_assignment["end_time"] == "10:00"
    assert monday_assignment["status"] == "ASSIGNED"
    
    # Check for Wednesday assignment (aide 2)
    wednesday_key = f"{aide2.id}_Wednesday_14:00"
    assert wednesday_key in data["assignments"]
    wednesday_assignment = data["assignments"][wednesday_key]
    assert wednesday_assignment["task_title"] == "Test Task"
    assert wednesday_assignment["start_time"] == "14:00"
    assert wednesday_assignment["end_time"] == "15:00"

def test_weekly_matrix_validation(client, db_session):
    """Test weekly matrix endpoint validation."""
    # Test missing week parameter
    response = client.get("/api/assignments/weekly-matrix")
    assert response.status_code == 422
    
    # Test invalid week format
    response = client.get("/api/assignments/weekly-matrix?week=invalid")
    assert response.status_code == 422
    
    # Test non-existent week
    response = client.get("/api/assignments/weekly-matrix?week=2024-99")
    assert response.status_code == 422 