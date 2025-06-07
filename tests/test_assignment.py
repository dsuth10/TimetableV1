from api.models import TeacherAide, Task, Assignment
from api.constants import Status
from datetime import time, date, timedelta

def test_get_assignments_weekly(db_session, client):
    """Test getting assignments for a specific week."""
    # Create test data
    teacher = TeacherAide(
        name="Test Teacher",
        colour_hex="#123456"
    )
    db_session.add(teacher)
    db_session.commit()

    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    db_session.add(task)
    db_session.commit()

    # Create assignments for different weeks
    date1 = date.fromisocalendar(2024, 1, 1)  # Monday of 2024-W01
    date2 = date.fromisocalendar(2024, 2, 2)  # Tuesday of 2024-W02

    assignment1 = Assignment(
        aide_id=teacher.id,
        task_id=task.id,
        date=date1,
        start_time=time(9, 0),
        end_time=time(10, 0),
        status=Status.ASSIGNED
    )
    assignment2 = Assignment(
        aide_id=teacher.id,
        task_id=task.id,
        date=date2,
        start_time=time(9, 0),
        end_time=time(10, 0),
        status=Status.ASSIGNED
    )
    db_session.add_all([assignment1, assignment2])
    db_session.commit()

    # Test getting assignments for week1
    response = client.get('/api/assignments?week=2024-W01')
    assert response.status_code == 200
    data = response.get_json()['assignments']
    assert len(data) == 1
    assert data[0]['date'] == date1.isoformat()

    # Test getting assignments for week2
    response = client.get('/api/assignments?week=2024-W02')
    assert response.status_code == 200
    data = response.get_json()['assignments']
    assert len(data) == 1
    assert data[0]['date'] == date2.isoformat() 