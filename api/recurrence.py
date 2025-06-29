"""Recurrence engine for handling recurring tasks and assignments."""

from datetime import date, datetime, time, timedelta
from typing import List, Optional, Tuple, TYPE_CHECKING
from dateutil.rrule import rrulestr
from sqlalchemy.orm import Session

from api.models import Task, Assignment
from api.constants import Status

# Default horizon is 4 weeks, but can be configured up to 10 weeks
DEFAULT_HORIZON_WEEKS = 4
MAX_HORIZON_WEEKS = 10

def parse_rrule(rrule_str: str, start_date: date) -> Optional[rrulestr]:
    """Parse an iCal RRULE string into a dateutil rrule object.
    
    Args:
        rrule_str: The RRULE string in iCal format
        start_date: The start date for the recurrence rule
        
    Returns:
        An rrule object if parsing succeeds, None otherwise
    """
    try:
        dt_start = datetime.combine(start_date, datetime.min.time())
        return rrulestr(rrule_str, dtstart=dt_start)
    except ValueError:
        return None

def extend_assignment_horizon(
    session: Session,
    horizon_weeks: int = DEFAULT_HORIZON_WEEKS
) -> Tuple[int, int]:
    """Extend the assignment horizon for all recurring tasks.
    
    Args:
        session: The database session
        horizon_weeks: Number of weeks to extend the horizon (default: 4)
        
    Returns:
        A tuple of (tasks_processed, assignments_created)
    """
    # Import here to avoid circular import
    from api.models import Task
    if not 1 <= horizon_weeks <= MAX_HORIZON_WEEKS:
        raise ValueError(f"Horizon must be between 1 and {MAX_HORIZON_WEEKS} weeks")
        
    today = date.today()
    end_date = today + timedelta(weeks=horizon_weeks)
    
    # Get all recurring tasks
    recurring_tasks = session.query(Task).filter(
        Task.recurrence_rule.isnot(None),
        Task.expires_on.is_(None) | (Task.expires_on >= today)
    ).all()
    
    total_assignments = 0
    for task in recurring_tasks:
        assignments = generate_assignments(task, today, end_date, session)
        total_assignments += len(assignments)
    
    return len(recurring_tasks), total_assignments

def update_future_assignments(task: Task, session, old_recurrence: Optional[str] = None,
                            old_start_time: Optional[time] = None,
                            old_end_time: Optional[time] = None,
                            horizon_weeks: int = DEFAULT_HORIZON_WEEKS) -> int:
    """Update future assignments for a task when its recurrence or times change.
    
    Args:
        task: The task whose assignments need updating
        session: Database session
        old_recurrence: Previous recurrence rule (if changed)
        old_start_time: Previous start time (if changed)
        old_end_time: Previous end time (if changed)
        horizon_weeks: Number of weeks to look ahead for assignments
        
    Returns:
        Number of assignments updated
    """
    # Check if any changes were made
    if (old_recurrence == task.recurrence_rule and
        old_start_time == task.start_time and
        old_end_time == task.end_time):
        return 0

    # Get current date and calculate end date
    start_date = date.today()
    end_date = start_date + timedelta(weeks=horizon_weeks)
    
    # Get existing assignments in the date range
    existing_assignments = session.query(Assignment).filter(
        Assignment.task_id == task.id,
        Assignment.date >= start_date,
        Assignment.date <= end_date
    ).all()
    
    # Delete existing assignments
    for assignment in existing_assignments:
        session.delete(assignment)
    
    # Generate new assignments
    new_assignments = task.generate_assignments(start_date, end_date, session)
    
    # Commit changes
    session.commit()
    
    return len(new_assignments)
