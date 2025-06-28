import pytest
from datetime import datetime
from api.models.assignment import Assignment
from api.models.task import Task
from api.models.teacher_aide import TeacherAide

def test_create_assignment(client, db_session):
    """Test creating a new assignment."""
    # Create test data
    task = Task(
        title='Test Task',
        category='Test Category',
        duration=60,
        is_time_constrained=False
    )
    aide = TeacherAide(name='Test Aide')
    db_session.add_all([task, aide])
    db_session.commit()

    # Test data
    data = {
        'task_id': task.id,
        'aide_id': aide.id,
        'day': 'Monday',
        'start_time': '09:00',
        'duration': 60
    }

    # Make request
    response = client.post('/api/assignments', json=data)
    assert response.status_code == 201
    
    # Verify response
    result = response.json
    assert result['task_id'] == task.id
    assert result['aide_id'] == aide.id
    assert result['day'] == 'Monday'
    assert result['start_time'] == '09:00'
    assert result['duration'] == 60

def test_create_conflicting_assignment(client, db_session):
    """Test creating an assignment that conflicts with existing one."""
    # Create test data
    task1 = Task(
        title='Task 1',
        category='Test Category',
        duration=60,
        is_time_constrained=False
    )
    task2 = Task(
        title='Task 2',
        category='Test Category',
        duration=60,
        is_time_constrained=False
    )
    aide = TeacherAide(name='Test Aide')
    db_session.add_all([task1, task2, aide])
    db_session.commit()

    # Create first assignment
    assignment1 = Assignment(
        task_id=task1.id,
        aide_id=aide.id,
        day='Monday',
        start_time='09:00',
        duration=60
    )
    db_session.add(assignment1)
    db_session.commit()

    # Try to create conflicting assignment
    data = {
        'task_id': task2.id,
        'aide_id': aide.id,
        'day': 'Monday',
        'start_time': '09:30',  # Overlaps with first assignment
        'duration': 60
    }

    response = client.post('/api/assignments', json=data)
    assert response.status_code == 409
    assert 'conflicts with existing schedule' in response.json['message']

def test_update_assignment(client, db_session):
    """Test updating an existing assignment."""
    # Create test data
    task = Task(
        title='Test Task',
        category='Test Category',
        duration=60,
        is_time_constrained=False
    )
    aide = TeacherAide(name='Test Aide')
    db_session.add_all([task, aide])
    db_session.commit()

    # Create assignment
    assignment = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        day='Monday',
        start_time='09:00',
        duration=60
    )
    db_session.add(assignment)
    db_session.commit()

    # Update data
    data = {
        'start_time': '10:00',
        'duration': 90
    }

    response = client.put(f'/api/assignments/{assignment.id}', json=data)
    assert response.status_code == 200
    
    # Verify response
    result = response.json
    assert result['start_time'] == '10:00'
    assert result['duration'] == 90

def test_delete_assignment(client, db_session):
    """Test deleting an assignment."""
    # Create test data
    task = Task(
        title='Test Task',
        category='Test Category',
        duration=60,
        is_time_constrained=False
    )
    aide = TeacherAide(name='Test Aide')
    db_session.add_all([task, aide])
    db_session.commit()

    # Create assignment
    assignment = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        day='Monday',
        start_time='09:00',
        duration=60
    )
    db_session.add(assignment)
    db_session.commit()

    # Delete assignment
    response = client.delete(f'/api/assignments/{assignment.id}')
    assert response.status_code == 204

    # Verify deletion
    deleted = db_session.query(Assignment).get(assignment.id)
    assert deleted is None

def test_check_conflicts(client, db_session):
    """Test checking for scheduling conflicts."""
    # Create test data
    task = Task(
        title='Test Task',
        category='Test Category',
        duration=60,
        is_time_constrained=False
    )
    aide = TeacherAide(name='Test Aide')
    db_session.add_all([task, aide])
    db_session.commit()

    # Create existing assignment
    assignment = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        day='Monday',
        start_time='09:00',
        duration=60
    )
    db_session.add(assignment)
    db_session.commit()

    # Check for conflicts
    data = {
        'aide_id': aide.id,
        'day': 'Monday',
        'start_time': '09:30',  # Overlaps with existing assignment
        'duration': 60
    }

    response = client.post('/api/assignments/check', json=data)
    assert response.status_code == 200
    
    # Verify response
    result = response.json
    assert result['has_conflicts'] is True
    assert len(result['conflicts']) == 1
    assert result['conflicts'][0]['id'] == assignment.id 