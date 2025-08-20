"""Tests for the recurrence engine functionality."""

import pytest
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from dateutil.rrule import rrulestr

from api.models import Task, Assignment
from api.recurrence import (
    parse_rrule,
    generate_assignments,
    extend_assignment_horizon,
    update_future_assignments,
    DEFAULT_HORIZON_WEEKS,
    MAX_HORIZON_WEEKS
)
from api.constants import Status

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

@pytest.fixture
def task_payload():
    """Common task payload for testing."""
    return {
        "title": "Test Task",
        "category": "CLASS_SUPPORT",
        "start_time": "09:00",
        "end_time": "10:00",
        "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    }

class TestRRuleParsing:
    """Tests for RRULE parsing functionality."""
    
    def test_parse_valid_rrule(self):
        """Test parsing valid RRULE strings."""
        start_date = date(2024, 1, 1)
        
        # Weekly on Monday, Wednesday, Friday
        rule = parse_rrule("FREQ=WEEKLY;BYDAY=MO,WE,FR", start_date)
        assert rule is not None
        dates = [d.date() for d in rule.between(
            datetime.combine(start_date, datetime.min.time()),
            datetime.combine(start_date + timedelta(days=7), datetime.max.time()),
            inc=True
        )]
        assert len(dates) == 4  # Jan 1, 3, 5, 8
        assert all(d.weekday() in [0, 2, 4] for d in dates)  # Monday=0, Wednesday=2, Friday=4
        
        # Daily for 5 days
        rule = parse_rrule("FREQ=DAILY;COUNT=5", start_date)
        assert rule is not None
        dates = [d.date() for d in rule.between(
            datetime.combine(start_date, datetime.min.time()),
            datetime.combine(start_date + timedelta(days=10), datetime.max.time()),
            inc=True
        )]
        assert len(dates) == 5
        assert all((d - start_date).days == i for i, d in enumerate(dates))
    
    def test_parse_invalid_rrule(self):
        """Test parsing invalid RRULE strings."""
        start_date = date(2024, 1, 1)
        
        # Test various invalid formats
        invalid_rules = [
            "INVALID_RRULE",
            "FREQ=INVALID",
            "FREQ=WEEKLY;BYDAY=INVALID",
            "FREQ=WEEKLY;BYDAY=MO,INVALID",
            "FREQ=WEEKLY;BYDAY=",
            "FREQ=WEEKLY;",
        ]
        
        for rule in invalid_rules:
            result = parse_rrule(rule, start_date)
            assert result is None, f"Expected None for invalid rule: {rule}"

class TestAssignmentGeneration:
    """Tests for assignment generation functionality."""
    
    def test_generate_assignments(self, db_session: Session, recurring_task: Task):
        """Test generating assignments for a recurring task."""
        # Generate assignments for next week
        start_date = date.today()
        end_date = start_date + timedelta(days=9)
        
        assignments = generate_assignments(recurring_task, start_date, end_date, db_session)
        
        # Should generate assignments for Monday, Wednesday, Friday in the date range
        assert len(assignments) > 0
        
        # Verify all assignments are for the correct task
        for assignment in assignments:
            assert assignment.task_id == recurring_task.id
            assert assignment.start_time == recurring_task.start_time
            assert assignment.end_time == recurring_task.end_time
            assert assignment.status == Status.UNASSIGNED
    
    def test_generate_assignments_no_recurrence(self, db_session: Session):
        """Test generating assignments for a non-recurring task."""
        task = Task(
            title="Non-recurring Task",
            category="CLASS_SUPPORT",
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("10:00", "%H:%M").time(),
            status=Status.UNASSIGNED
        )
        db_session.add(task)
        db_session.commit()
        
        start_date = date.today()
        end_date = start_date + timedelta(days=7)
        
        assignments = generate_assignments(task, start_date, end_date, db_session)
        assert len(assignments) == 0
    
    def test_generate_assignments_with_expiration(self, db_session: Session):
        """Test generating assignments for a task with expiration date."""
        task = Task(
            title="Expiring Task",
            category="CLASS_SUPPORT",
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("10:00", "%H:%M").time(),
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            expires_on=date.today() + timedelta(days=5),
            status=Status.UNASSIGNED
        )
        db_session.add(task)
        db_session.commit()
        
        start_date = date.today()
        end_date = start_date + timedelta(days=14)
        
        assignments = generate_assignments(task, start_date, end_date, db_session)
        
        # Should only generate assignments up to expiration date
        for assignment in assignments:
            assert assignment.date <= task.expires_on

class TestHorizonExtension:
    """Tests for horizon extension functionality."""
    
    def test_extend_horizon(self, db_session: Session, recurring_task: Task):
        """Test extending the assignment horizon."""
        tasks_processed, assignments_created = extend_assignment_horizon(db_session)
        
        assert tasks_processed == 1
        assert assignments_created > 0
        
        # Verify assignments were created
        assignments = db_session.query(Assignment).filter_by(task_id=recurring_task.id).all()
        assert len(assignments) > 0
    
    def test_extend_horizon_custom_weeks(self, db_session: Session, recurring_task: Task):
        """Test extending horizon with custom number of weeks."""
        tasks_processed, assignments_created = extend_assignment_horizon(db_session, horizon_weeks=2)
        
        assert tasks_processed == 1
        assert assignments_created > 0
    
    def test_extend_horizon_invalid_weeks(self, db_session: Session):
        """Test extending horizon with invalid weeks."""
        with pytest.raises(ValueError):
            extend_assignment_horizon(db_session, horizon_weeks=0)
        with pytest.raises(ValueError):
            extend_assignment_horizon(db_session, horizon_weeks=MAX_HORIZON_WEEKS + 1)
    
    def test_extend_horizon_multiple_tasks(self, db_session: Session):
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
        
        tasks_processed, assignments_created = extend_assignment_horizon(db_session)
        
        assert tasks_processed == 3
        assert assignments_created > 0
        
        # Verify assignments were created for each task
        for task in tasks:
            assignments = db_session.query(Assignment).filter_by(task_id=task.id).all()
            assert len(assignments) > 0

class TestFutureAssignmentUpdates:
    """Tests for updating future assignments."""
    
    def test_update_future_assignments(self, db_session: Session, recurring_task: Task):
        """Test updating future assignments when task changes."""
        # Generate some assignments
        start_date = date.today()
        end_date = start_date + timedelta(weeks=2)
        generate_assignments(recurring_task, start_date, end_date, db_session)
        
        # Modify the task
        recurring_task.start_time = datetime.strptime("10:00", "%H:%M").time()
        recurring_task.end_time = datetime.strptime("11:00", "%H:%M").time()
        
        # Update future assignments
        updated_count = update_future_assignments(recurring_task, db_session)
        assert updated_count > 0
        
        # Verify assignments were updated
        future_assignments = db_session.query(Assignment).filter(
            Assignment.task_id == recurring_task.id,
            Assignment.date >= date.today(),
            Assignment.status == Status.UNASSIGNED
        ).all()
        
        assert all(a.start_time == recurring_task.start_time for a in future_assignments)
        assert all(a.end_time == recurring_task.end_time for a in future_assignments)
    
    def test_update_future_assignments_no_changes(self, db_session: Session, recurring_task: Task):
        """Test updating future assignments when no changes are made."""
        # Generate some assignments
        start_date = date.today()
        end_date = start_date + timedelta(weeks=2)
        generate_assignments(recurring_task, start_date, end_date, db_session)
        
        # Update without changes (pass old values)
        updated_count = update_future_assignments(
            recurring_task, db_session, horizon_weeks=2,
            old_recurrence=recurring_task.recurrence_rule,
            old_start_time=recurring_task.start_time,
            old_end_time=recurring_task.end_time
        )
        assert updated_count == 0
    
    def test_update_future_assignments_recurrence_change(self, db_session: Session, recurring_task: Task):
        """Test updating future assignments when recurrence rule changes."""
        # Generate some assignments
        start_date = date.today()
        end_date = start_date + timedelta(weeks=2)
        generate_assignments(recurring_task, start_date, end_date, db_session)
        
        # Change recurrence rule
        recurring_task.recurrence_rule = "FREQ=WEEKLY;BYDAY=TU,TH"
        
        # Update future assignments (should delete and regenerate)
        updated_count = update_future_assignments(recurring_task, db_session, horizon_weeks=2)
        assert updated_count > 0
        
        # Verify assignments were updated and only on Tuesday and Thursday
        future_assignments = db_session.query(Assignment).filter(
            Assignment.task_id == recurring_task.id,
            Assignment.date >= date.today(),
            Assignment.status == Status.UNASSIGNED
        ).all()
        assert len(future_assignments) > 0
        assert all(a.date.weekday() in [1, 3] for a in future_assignments)  # Tuesday=1, Thursday=3

class TestTaskUpdateIntegration:
    """Tests for task update integration with recurrence."""
    
    def test_task_update_triggers_assignment_update(self, client, recurring_task):
        """Test that updating a task triggers future assignment updates."""
        # First, generate some assignments
        start_date = date.today()
        end_date = start_date + timedelta(weeks=2)
        generate_assignments(recurring_task, start_date, end_date, client.application.extensions['sqlalchemy'].db.session)
        
        # Update the task with new times
        update_data = {
            "start_time": "10:00",
            "end_time": "11:00"
        }
        
        response = client.put(f"/api/tasks/{recurring_task.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert "assignments_updated" in data
        assert data["assignments_updated"] > 0
        
        # Verify the task was updated
        assert data["start_time"] == "10:00"
        assert data["end_time"] == "11:00"
    
    def test_task_update_no_recurrence_no_update(self, client):
        """Test that updating a non-recurring task doesn't trigger assignment updates."""
        # Create a non-recurring task
        task_data = {
            "title": "Non-recurring Task",
            "category": "CLASS_SUPPORT",
            "start_time": "09:00",
            "end_time": "10:00"
        }
        
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        task_id = response.get_json()["id"]
        
        # Update the task
        update_data = {
            "title": "Updated Non-recurring Task"
        }
        
        response = client.put(f"/api/tasks/{task_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert "assignments_updated" not in data  # Should not have this field for non-recurring tasks 