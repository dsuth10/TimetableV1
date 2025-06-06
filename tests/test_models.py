import pytest
from datetime import datetime, date, time, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.models import Base, TeacherAide, Availability, Classroom, Task, Assignment, Absence

# Test TeacherAide model
def test_create_teacher_aide(db_session):
    aide = TeacherAide(
        name="John Doe",
        qualifications="Bachelor in Education",
        colour_hex="#FF0000"
    )
    db_session.add(aide)
    db_session.commit()
    
    assert aide.id is not None
    assert aide.name == "John Doe"
    assert aide.created_at is not None
    assert aide.updated_at is None

def test_teacher_aide_availability(db_session):
    aide = TeacherAide(
        name="Jane Smith",
        colour_hex="#00FF00"
    )
    availability = Availability(
        weekday="MO",
        start_time=time(9, 0),
        end_time=time(15, 0)
    )
    aide.availabilities.append(availability)
    db_session.add(aide)
    db_session.commit()
    
    assert len(aide.availabilities) == 1
    assert aide.availabilities[0].weekday == "MO"
    assert aide.is_available(date(2024, 3, 4), time(10, 0), time(11, 0))  # Monday
    assert not aide.is_available(date(2024, 3, 5), time(10, 0), time(11, 0))  # Tuesday

# Test Availability model
def test_availability_constraints(db_session):
    aide = TeacherAide(name="Test Aide", colour_hex="#0000FF")
    db_session.add(aide)
    db_session.commit()
    
    # Test valid availability
    valid_availability = Availability(
        aide_id=aide.id,
        weekday="MO",
        start_time=time(9, 0),
        end_time=time(15, 0)
    )
    db_session.add(valid_availability)
    db_session.commit()
    
    # Test invalid weekday
    with pytest.raises(Exception):
        invalid_weekday = Availability(
            aide_id=aide.id,
            weekday="XX",
            start_time=time(9, 0),
            end_time=time(15, 0)
        )
        db_session.add(invalid_weekday)
        db_session.commit()
    
    # Test invalid time range
    with pytest.raises(Exception):
        invalid_time = Availability(
            aide_id=aide.id,
            weekday="MO",
            start_time=time(15, 0),
            end_time=time(9, 0)
        )
        db_session.add(invalid_time)
        db_session.commit()

# Test Task model
def test_task_creation(db_session):
    classroom = Classroom(name="Room 101", capacity=30)
    db_session.add(classroom)
    db_session.commit()
    
    task = Task(
        title="Math Support",
        category="CLASS_SUPPORT",
        start_time=time(10, 0),
        end_time=time(11, 0),
        classroom_id=classroom.id,
        recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR"
    )
    db_session.add(task)
    db_session.commit()
    
    assert task.id is not None
    assert task.status == "UNASSIGNED"
    assert task.classroom == classroom
    assert len(task.generate_assignments(
        date(2024, 3, 4),
        date(2024, 3, 8)
    )) == 3  # Monday, Wednesday, Friday

# Test Assignment model
def test_assignment_conflicts(db_session):
    aide = TeacherAide(name="Test Aide", colour_hex="#FF00FF")
    db_session.add(aide)
    db_session.commit()
    # Create a task for assignments
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(10, 0),
        end_time=time(11, 0),
        status="ASSIGNED"
    )
    db_session.add(task)
    db_session.commit()
    # Create overlapping assignments
    assignment1 = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date(2024, 3, 4),
        start_time=time(10, 0),
        end_time=time(11, 0),
        status="ASSIGNED"
    )
    assignment2 = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date(2024, 3, 4),
        start_time=time(10, 30),
        end_time=time(11, 30),
        status="ASSIGNED"
    )
    
    db_session.add(assignment1)
    db_session.commit()
    
    conflicts = assignment2.check_conflicts(db_session)
    assert len(conflicts) == 1
    assert conflicts[0].id == assignment1.id

# Test Absence model
def test_absence_release_assignments(db_session):
    aide = TeacherAide(name="Test Aide", colour_hex="#FFFF00")
    db_session.add(aide)
    db_session.commit()
    # Create a task for the assignment
    task = Task(
        title="Test Task",
        category="CLASS_SUPPORT",
        start_time=time(10, 0),
        end_time=time(11, 0),
        status="ASSIGNED"
    )
    db_session.add(task)
    db_session.commit()
    # Create an assignment
    assignment = Assignment(
        task_id=task.id,
        aide_id=aide.id,
        date=date(2024, 3, 4),
        start_time=time(10, 0),
        end_time=time(11, 0),
        status="ASSIGNED"
    )
    db_session.add(assignment)
    db_session.commit()
    # Create an absence
    absence = Absence(
        aide_id=aide.id,
        date=date(2024, 3, 4),
        reason="Sick"
    )
    db_session.add(absence)
    db_session.commit()
    # Release assignments
    released = absence.release_assignments(db_session)
    assert len(released) == 1
    assert released[0].status == "UNASSIGNED"
    assert released[0].aide_id is None

# Test Classroom model
def test_classroom_relationships(db_session):
    classroom = Classroom(
        name="Science Lab",
        capacity=25,
        notes="Has lab equipment"
    )
    db_session.add(classroom)
    db_session.commit()
    
    task = Task(
        title="Science Support",
        category="CLASS_SUPPORT",
        start_time=time(13, 0),
        end_time=time(14, 0),
        classroom_id=classroom.id
    )
    db_session.add(task)
    db_session.commit()
    
    assert len(classroom.tasks) == 1
    assert classroom.tasks[0].title == "Science Support"
    assert classroom.created_at is not None

# Test cascade deletes
def test_cascade_deletes(db_session):
    # Create teacher aide with relationships
    aide = TeacherAide(name="Test Aide", colour_hex="#FF0000")
    availability = Availability(
        weekday="MO",
        start_time=time(9, 0),
        end_time=time(15, 0)
    )
    absence = Absence(
        date=date(2024, 3, 4),
        reason="Test"
    )
    aide.availabilities.append(availability)
    aide.absences.append(absence)
    db_session.add(aide)
    db_session.commit()
    
    # Delete teacher aide
    db_session.delete(aide)
    db_session.commit()
    
    # Check if related records are deleted
    assert db_session.query(Availability).count() == 0
    assert db_session.query(Absence).count() == 0 