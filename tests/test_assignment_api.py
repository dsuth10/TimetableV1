import pytest
from datetime import date, time, datetime, timedelta
from api.models import TeacherAide, Task, Assignment, Classroom
from dateutil.rrule import rrulestr
from api.db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

def create_test_data(db_session):
    # Create test classroom
    classroom = Classroom(name="Test Classroom", capacity=20)
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
    week_param = f"{year}-{week:02d}"
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
    end_date = start_date + timedelta(days=4)
    
    response = client.post("/api/assignments/batch", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "recurrence_rule": "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "assignments" in data
    assert len(data["assignments"]) > 0
    assert data["total"] > 0

    # Test invalid recurrence rule
    response = client.post("/api/assignments/batch", json={
        "task_id": task.id,
        "aide_id": aide.id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "recurrence_rule": "INVALID_RULE"
    })
    assert response.status_code == 422

def test_check_conflicts(client, db_session):
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

    # Ensure the teacher aide is committed to the database
    db_session.commit()

    # Test checking for conflicts
    response = client.post("/api/assignments/check", json={
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "09:30",  # Overlaps with existing assignment
        "end_time": "10:30"
    })
    assert response.status_code == 409
    data = response.get_json()
    assert data["has_conflicts"] == True
    assert len(data["conflicts"]) > 0

    # Test checking for no conflicts
    response = client.post("/api/assignments/check", json={
        "aide_id": aide.id,
        "date": date.today().isoformat(),
        "start_time": "10:00",  # No overlap
        "end_time": "11:00"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["has_conflicts"] == False
    assert len(data["conflicts"]) == 0

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

    # Test invalid date format
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "date": "invalid-date",
        "start_time": "09:00",
        "end_time": "10:00"
    })
    assert response.status_code == 422

    # Test invalid time format
    response = client.post("/api/assignments", json={
        "task_id": task.id,
        "date": date.today().isoformat(),
        "start_time": "invalid-time",
        "end_time": "10:00"
    })
    assert response.status_code == 422

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