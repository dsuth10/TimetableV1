from datetime import datetime, date, time, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import argparse
import os
from api.models import Base, TeacherAide, Availability, Classroom, Task, Assignment, Absence
from api.db import init_db, get_session
from app import create_app
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_teacher_aides(session):
    """Create teacher aides with different qualifications and colors."""
    aides = [
        TeacherAide(
            name="Sarah Johnson",
            qualifications="Bachelor in Education, Special Education Certification",
            colour_hex="#FF5733"
        ),
        TeacherAide(
            name="Michael Chen",
            qualifications="Master in Education, ESL Certification",
            colour_hex="#33FF57"
        ),
        TeacherAide(
            name="Emma Rodriguez",
            qualifications="Bachelor in Psychology, Child Development Certification",
            colour_hex="#3357FF"
        ),
        TeacherAide(
            name="David Kim",
            qualifications="Master in Special Education, Behavior Analysis Certification",
            colour_hex="#F333FF"
        ),
        TeacherAide(
            name="Lisa Patel",
            qualifications="Bachelor in Education, Early Childhood Certification",
            colour_hex="#FF33F3"
        )
    ]
    
    for aide in aides:
        session.add(aide)
    session.commit()
    return aides

def create_availabilities(session, aides):
    """Create standard availability patterns for each aide."""
    weekdays = ['MO', 'TU', 'WE', 'TH', 'FR']
    start_time = time(8, 0)  # 8:00 AM
    end_time = time(15, 59)   # 3:59 PM
    
    for aide in aides:
        for weekday in weekdays:
            availability = Availability(
                aide_id=aide.id,
                weekday=weekday,
                start_time=start_time,
                end_time=end_time
            )
            session.add(availability)
    session.commit()

def create_classrooms(session):
    """Create classrooms with different capacities."""
    classrooms = [
        Classroom(name="Room 101", capacity=30, notes="Main classroom"),
        Classroom(name="Room 102", capacity=25, notes="Science lab"),
        Classroom(name="Room 103", capacity=20, notes="Small group room")
    ]
    
    for classroom in classrooms:
        session.add(classroom)
    session.commit()
    return classrooms

def create_tasks(session, classrooms):
    """Create demo tasks of different categories."""
    today = date.today()
    tasks = [
        Task(
            title="Morning Playground Supervision",
            category="PLAYGROUND",
            start_time=time(8, 30),
            end_time=time(9, 0),
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="Supervise students during morning recess"
        ),
        Task(
            title="Math Class Support",
            category="CLASS_SUPPORT",
            start_time=time(10, 0),
            end_time=time(11, 0),
            classroom_id=classrooms[0].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            notes="Assist with math class activities"
        ),
        Task(
            title="Reading Group Support",
            category="GROUP_SUPPORT",
            start_time=time(11, 30),
            end_time=time(12, 30),
            classroom_id=classrooms[1].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=TU,TH",
            notes="Support small reading groups"
        ),
        Task(
            title="Individual Student Support",
            category="INDIVIDUAL_SUPPORT",
            start_time=time(13, 0),
            end_time=time(14, 0),
            classroom_id=classrooms[2].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="One-on-one support for special needs student"
        ),
        Task(
            title="Afternoon Playground",
            category="PLAYGROUND",
            start_time=time(14, 30),
            end_time=time(15, 0),
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="Supervise students during afternoon recess"
        )
    ]
    
    for task in tasks:
        session.add(task)
    session.commit()
    return tasks

def create_assignments(session, tasks, aides):
    """Create sample assignments for the current week."""
    today = date.today()
    start_date = today - timedelta(days=today.weekday())  # Start of current week
    end_date = start_date + timedelta(days=4)  # End of week (Friday)
    
    # Create assignments for each task
    for task in tasks:
        assignments = task.generate_assignments(start_date, end_date, session)
        for assignment in assignments:
            # Assign to a random aide if available
            for aide in aides:
                if aide.is_available(assignment.date, assignment.start_time, assignment.end_time):
                    assignment.aide_id = aide.id
                    assignment.status = 'ASSIGNED'
                    break
            session.add(assignment)
    
    session.commit()

def create_absence(session, aides):
    """Create a sample absence."""
    today = date.today()
    absence = Absence(
        aide_id=aides[0].id,  # First aide
        start_date=today + timedelta(days=1),  # Tomorrow
        end_date=today + timedelta(days=1),    # Same day for single-day absence
        reason="Medical appointment"
    )
    session.add(absence)
    session.commit()

def clear_database(session):
    """Clear all existing data from the database."""
    try:
        session.query(Absence).delete()
        session.query(Assignment).delete()
        session.query(Task).delete()
        session.query(Availability).delete()
        session.query(TeacherAide).delete()
        session.query(Classroom).delete()
        session.commit()
        logger.info("Database cleared successfully!")
    except Exception as e:
        session.rollback()
        logger.error(f"Error clearing database: {e}")
        raise

def seed_database():
    """Seed the database with sample data."""
    session = get_session()
    
    try:
        # Clear existing data first
        clear_database(session)

        # Create teacher aides
        aides = create_teacher_aides(session)

        # Create availabilities for aides
        create_availabilities(session, aides)

        # Create classrooms
        classrooms = create_classrooms(session)

        # Create tasks
        tasks = create_tasks(session, classrooms)

        # Create assignments
        create_assignments(session, tasks, aides)

        # Create a sample absence
        create_absence(session, aides)

        logger.info("Database seeded successfully!")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_database() 