# Scheduling Logic

## Overview

The scheduling system uses a combination of algorithms to handle task assignments, conflict resolution, and availability management. The core functionality is implemented in Python using SQLAlchemy for database operations.

## Core Algorithms

### 1. Availability Checking

```python
def check_availability(aide: TeacherAide, date: date, start_time: time, end_time: time) -> bool:
    """
    Check if a teacher aide is available for a given time slot.
    
    Args:
        aide: TeacherAide instance
        date: Date to check
        start_time: Start time of the slot
        end_time: End time of the slot
    
    Returns:
        bool: True if the aide is available, False otherwise
    """
    # Check for absences
    if any(absence.date == date for absence in aide.absences):
        return False
    
    # Check regular availability
    weekday = date.strftime('%A').upper()
    return any(
        availability.weekday == weekday and
        availability.start_time <= start_time and
        availability.end_time >= end_time
        for availability in aide.availabilities
    )
```

### 2. Conflict Detection

```python
def detect_conflicts(assignment: Assignment) -> List[Assignment]:
    """
    Detect scheduling conflicts for a given assignment.
    
    Args:
        assignment: Assignment instance to check
    
    Returns:
        List[Assignment]: List of conflicting assignments
    """
    if not assignment.aide_id:
        return []
        
    return Assignment.query.filter(
        Assignment.aide_id == assignment.aide_id,
        Assignment.date == assignment.date,
        Assignment.id != assignment.id,
        (
            (Assignment.start_time <= assignment.start_time < Assignment.end_time) |
            (Assignment.start_time < assignment.end_time <= Assignment.end_time) |
            (assignment.start_time <= Assignment.start_time < assignment.end_time)
        )
    ).all()
```

### 3. Recurring Task Generation

```python
def generate_recurring_assignments(task: Task, start_date: date, end_date: date) -> List[Assignment]:
    """
    Generate assignments for a recurring task within a date range.
    
    Args:
        task: Task instance with recurrence rule
        start_date: Start date for generation
        end_date: End date for generation
    
    Returns:
        List[Assignment]: List of generated assignments
    """
    if not task.recurrence_rule:
        return []
        
    from dateutil.rrule import rrulestr
    rule = rrulestr(task.recurrence_rule, dtstart=start_date)
    dates = list(rule.between(start_date, end_date))
    
    return [
        Assignment(
            task_id=task.id,
            date=d,
            start_time=task.start_time,
            end_time=task.end_time,
            status='UNASSIGNED'
        )
        for d in dates
    ]
```

### 4. Auto-Assignment Algorithm

```python
def auto_assign_task(task: Task, date: date) -> Optional[TeacherAide]:
    """
    Automatically assign a task to an available teacher aide.
    
    Args:
        task: Task to assign
        date: Date for assignment
    
    Returns:
        Optional[TeacherAide]: Assigned teacher aide or None if no suitable aide found
    """
    available_aides = TeacherAide.query.filter(
        ~TeacherAide.absences.any(Absence.date == date),
        TeacherAide.availabilities.any(
            and_(
                Availability.weekday == date.strftime('%A').upper(),
                Availability.start_time <= task.start_time,
                Availability.end_time >= task.end_time
            )
        )
    ).all()
    
    # Score each aide based on qualifications and current workload
    scored_aides = []
    for aide in available_aides:
        score = 0
        # Add points for matching qualifications
        if task.category in aide.qualifications:
            score += 2
        # Subtract points for current assignments
        current_assignments = len(aide.assignments.filter_by(date=date).all())
        score -= current_assignments
        
        scored_aides.append((aide, score))
    
    # Return the aide with the highest score
    if scored_aides:
        return max(scored_aides, key=lambda x: x[1])[0]
    return None
```

## Business Rules

1. **Time Constraints**
   - All activities must occur during school hours (08:00-16:00)
   - No overlapping assignments for the same aide
   - Minimum 15-minute break between assignments

2. **Qualification Requirements**
   - Playground duty requires "PLAYGROUND" qualification
   - Individual support requires "INDIVIDUAL_SUPPORT" qualification
   - Group support requires "GROUP_SUPPORT" qualification

3. **Workload Distribution**
   - Maximum 6 hours of active duty per day
   - Maximum 30 hours per week
   - Equal distribution of playground duties

4. **Absence Handling**
   - Automatic reassignment of tasks when an aide is marked absent
   - Notification to affected teachers
   - Priority given to critical tasks

## Conflict Resolution

### 1. Manual Resolution
When a conflict is detected during manual assignment:

1. Show conflict details to the user
2. Present resolution options:
   - Keep existing assignment
   - Replace with new assignment
   - Find alternative time slot
   - Find alternative aide

### 2. Automatic Resolution
For automatic assignments:

1. Check all available time slots
2. Consider aide qualifications
3. Balance workload distribution
4. Maintain minimum break times
5. Prioritize based on task importance

## Performance Considerations

1. **Database Indexing**
   - Index on `assignment(aide_id, date)`
   - Index on `absence(aide_id, date)`
   - Index on `availability(aide_id, weekday)`

2. **Caching Strategy**
   - Cache weekly schedules
   - Cache aide availability
   - Cache task templates

3. **Query Optimization**
   - Use eager loading for related data
   - Implement pagination for large result sets
   - Use database views for common queries

## Error Handling

1. **Validation Errors**
   - Invalid time slots
   - Missing qualifications
   - Exceeded workload limits

2. **Conflict Errors**
   - Double booking
   - Insufficient break time
   - Qualification mismatch

3. **System Errors**
   - Database connection issues
   - Cache failures
   - External service unavailability

## Testing

### Unit Tests
```python
def test_availability_checking():
    aide = TeacherAide(name="Test Aide")
    date = date(2024, 3, 20)
    assert check_availability(aide, date, time(9, 0), time(10, 0)) == True

def test_conflict_detection():
    assignment = Assignment(
        aide_id=1,
        date=date(2024, 3, 20),
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    conflicts = detect_conflicts(assignment)
    assert len(conflicts) == 0
```

### Integration Tests
```python
def test_auto_assignment_workflow():
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(9, 0),
        end_time=time(10, 0)
    )
    date = date(2024, 3, 20)
    assigned_aide = auto_assign_task(task, date)
    assert assigned_aide is not None
    assert check_availability(assigned_aide, date, task.start_time, task.end_time)
``` 