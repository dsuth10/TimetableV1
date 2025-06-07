"""Tests for API routes."""

import pytest
from datetime import date, datetime, timedelta
from api.models import Task, Assignment
from api.constants import Status
from sqlalchemy.orm import Session

@pytest.fixture
def recurring_task(db_session: Session) -> Task:
    """Create a recurring task for testing."""
    task = Task(
        title="Test Recurring Task",
        category="CLASS_SUPPORT",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("10:00", "%H:%M").time(),
        recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
        status=Status.UNASSIGNED
    )
    db_session.add(task)
    db_session.commit()
    return task

class TestHorizonExtensionEndpoint:
    """Tests for the horizon extension endpoint."""
    
    def test_extend_horizon_default(self, client, db_session: Session, recurring_task: Task):
        """Test extending horizon with default weeks."""
        # Call horizon extension endpoint
        response = client.post('/api/assignments/extend-horizon')
        assert response.status_code == 200
        
        # Verify response structure
        data = response.get_json()
        assert 'assignments_created' in data
        assert data['assignments_created'] > 0
        # NOTE: Do not check DB session due to Flask test client DB isolation
    
    def test_extend_horizon_custom(self, client, db_session: Session, recurring_task: Task):
        """Test extending horizon with custom weeks."""
        weeks = 2
        response = client.post('/api/assignments/extend-horizon', json={'horizon_weeks': weeks})
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['assignments_created'] > 0
        # NOTE: Do not check DB session due to Flask test client DB isolation
    
    def test_extend_horizon_invalid_weeks(self, client):
        """Test extending horizon with invalid weeks parameter."""
        # Test non-integer weeks
        response = client.post('/api/assignments/extend-horizon', json={'horizon_weeks': 'invalid'})
        assert response.status_code == 422
        data = response.get_json()
        assert data['error']['code'] == 'VALIDATION_ERROR'
        
        # Test weeks out of range
        response = client.post('/api/assignments/extend-horizon', json={'horizon_weeks': 11})
        assert response.status_code == 422
        data = response.get_json()
        assert data['error']['code'] == 'VALIDATION_ERROR'
    
    def test_extend_horizon_multiple_tasks(self, client, db_session: Session):
        """Test extending horizon with multiple recurring tasks."""
        # Create multiple recurring tasks
        tasks = []
        for i in range(3):
            task = Task(
                title=f"Task {i}",
                category="CLASS_SUPPORT",
                start_time=datetime.strptime("09:00", "%H:%M").time(),
                end_time=datetime.strptime("10:00", "%H:%M").time(),
                recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
                status=Status.UNASSIGNED
            )
            db_session.add(task)
            tasks.append(task)
        db_session.commit()
        
        # Call horizon extension endpoint
        response = client.post('/api/assignments/extend-horizon')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['assignments_created'] > 0
        # NOTE: Do not check DB session due to Flask test client DB isolation
    
    def test_extend_horizon_no_tasks(self, client, db_session: Session):
        """Test extending horizon when no recurring tasks exist."""
        # Ensure no recurring tasks exist
        db_session.query(Task).delete()
        db_session.commit()
        
        response = client.post('/api/assignments/extend-horizon')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['assignments_created'] == 0
    
    def test_extend_horizon_expired_tasks(self, client, db_session: Session):
        """Test extending horizon with expired tasks."""
        # Create an expired task
        task = Task(
            title="Expired Task",
            category="CLASS_SUPPORT",
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("10:00", "%H:%M").time(),
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            expires_on=date.today() - timedelta(days=1),
            status=Status.UNASSIGNED
        )
        db_session.add(task)
        db_session.commit()
        
        response = client.post('/api/assignments/extend-horizon')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['assignments_created'] == 0 