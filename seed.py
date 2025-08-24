from datetime import datetime, date, time, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import argparse
import os
from api.models import Base, TeacherAide, Availability, Classroom, Task, Assignment, Absence, SchoolClass
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
        ),
        TeacherAide(
            name="James Wilson",
            qualifications="Master in Education, Mathematics Specialist",
            colour_hex="#33FFF3"
        ),
        TeacherAide(
            name="Maria Garcia",
            qualifications="Bachelor in Education, Literacy Specialist",
            colour_hex="#F3FF33"
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
        Classroom(name="Room 101", capacity=30, notes="Main classroom - Grade 1"),
        Classroom(name="Room 102", capacity=25, notes="Science lab - Grade 2"),
        Classroom(name="Room 103", capacity=20, notes="Small group room - Special Ed"),
        Classroom(name="Room 104", capacity=28, notes="Main classroom - Grade 3"),
        Classroom(name="Room 105", capacity=32, notes="Main classroom - Grade 4"),
        Classroom(name="Room 106", capacity=30, notes="Main classroom - Grade 5"),
        Classroom(name="Room 107", capacity=25, notes="Computer lab"),
        Classroom(name="Art Studio", capacity=24, notes="Art room with supplies"),
        Classroom(name="Music Room", capacity=20, notes="Music room with instruments"),
        Classroom(name="Library", capacity=40, notes="School library"),
        Classroom(name="Gymnasium", capacity=100, notes="Main gym"),
        Classroom(name="Auditorium", capacity=200, notes="School auditorium"),
    ]
    
    for classroom in classrooms:
        session.add(classroom)
    session.commit()
    return classrooms

def create_school_classes(session):
    """Create school classes with different grades and teachers."""
    school_classes = [
        SchoolClass(class_code="1A", grade="Grade 1", teacher="Mrs. Anderson", notes="Mainstream class"),
        SchoolClass(class_code="1B", grade="Grade 1", teacher="Mr. Brown", notes="Mainstream class"),
        SchoolClass(class_code="2A", grade="Grade 2", teacher="Ms. Carter", notes="Mainstream class"),
        SchoolClass(class_code="2B", grade="Grade 2", teacher="Mrs. Davis", notes="Mainstream class"),
        SchoolClass(class_code="3A", grade="Grade 3", teacher="Mr. Evans", notes="Mainstream class"),
        SchoolClass(class_code="4A", grade="Grade 4", teacher="Ms. Foster", notes="Mainstream class"),
        SchoolClass(class_code="5A", grade="Grade 5", teacher="Mrs. Green", notes="Mainstream class"),
        SchoolClass(class_code="SPED1", grade="Special Education", teacher="Ms. Harris", notes="Special needs support"),
        SchoolClass(class_code="ESL1", grade="ESL Support", teacher="Mr. Ivanov", notes="English as Second Language"),
    ]
    
    for school_class in school_classes:
        session.add(school_class)
    session.commit()
    return school_classes

def create_tasks(session, classrooms, school_classes):
    """Create demo tasks of different categories with all required fields."""
    today = date.today()
    tasks = [
        # Playground duties
        Task(
            title="Morning Playground Supervision",
            category="PLAYGROUND",
            start_time=time(8, 30),
            end_time=time(9, 0),
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="Supervise students during morning recess",
            is_flexible=True
        ),
        Task(
            title="Afternoon Playground",
            category="PLAYGROUND",
            start_time=time(14, 30),
            end_time=time(15, 0),
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="Supervise students during afternoon recess",
            is_flexible=True
        ),
        
        # Class support tasks
        Task(
            title="Grade 1 Math Support",
            category="CLASS_SUPPORT",
            start_time=time(9, 0),
            end_time=time(10, 0),
            classroom_id=classrooms[0].id,
            school_class_id=school_classes[0].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            notes="Assist with math class activities in Grade 1A",
            is_flexible=False
        ),
        Task(
            title="Grade 2 Reading Support",
            category="CLASS_SUPPORT",
            start_time=time(10, 30),
            end_time=time(11, 30),
            classroom_id=classrooms[1].id,
            school_class_id=school_classes[2].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=TU,TH",
            notes="Assist with reading activities in Grade 2A",
            is_flexible=False
        ),
        Task(
            title="Grade 3 Science Support",
            category="CLASS_SUPPORT",
            start_time=time(13, 0),
            end_time=time(14, 0),
            classroom_id=classrooms[3].id,
            school_class_id=school_classes[4].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE",
            notes="Assist with science experiments in Grade 3A",
            is_flexible=False
        ),
        
        # Group support tasks
        Task(
            title="Reading Group Support",
            category="GROUP_SUPPORT",
            start_time=time(11, 0),
            end_time=time(12, 0),
            classroom_id=classrooms[1].id,
            school_class_id=school_classes[2].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=TU,TH",
            notes="Support small reading groups in Grade 2A",
            is_flexible=False
        ),
        Task(
            title="Math Group Support",
            category="GROUP_SUPPORT",
            start_time=time(14, 0),
            end_time=time(15, 0),
            classroom_id=classrooms[0].id,
            school_class_id=school_classes[0].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            notes="Support small math groups in Grade 1A",
            is_flexible=False
        ),
        
        # Individual support tasks
        Task(
            title="Individual Student Support - Alex",
            category="INDIVIDUAL_SUPPORT",
            start_time=time(9, 30),
            end_time=time(10, 30),
            classroom_id=classrooms[2].id,
            school_class_id=school_classes[7].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="One-on-one support for Alex in Special Education",
            is_flexible=False
        ),
        Task(
            title="Individual Student Support - Maria",
            category="INDIVIDUAL_SUPPORT",
            start_time=time(11, 0),
            end_time=time(12, 0),
            classroom_id=classrooms[2].id,
            school_class_id=school_classes[8].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            notes="One-on-one ESL support for Maria",
            is_flexible=False
        ),
        
        # Library and special activities
        Task(
            title="Library Support",
            category="CLASS_SUPPORT",
            start_time=time(9, 0),
            end_time=time(10, 0),
            classroom_id=classrooms[9].id,
            school_class_id=school_classes[3].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            notes="Assist in library during Grade 2B class time",
            is_flexible=False
        ),
        Task(
            title="Art Class Support",
            category="CLASS_SUPPORT",
            start_time=time(13, 30),
            end_time=time(14, 30),
            classroom_id=classrooms[7].id,
            school_class_id=school_classes[5].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=TU,TH",
            notes="Assist with art activities in Grade 4A",
            is_flexible=False
        ),
        
        # Unassigned tasks for testing drag and drop
        Task(
            title="Computer Lab Support",
            category="CLASS_SUPPORT",
            start_time=time(10, 0),
            end_time=time(11, 0),
            classroom_id=classrooms[6].id,
            school_class_id=school_classes[6].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
            notes="Assist in computer lab during Grade 5A class",
            is_flexible=False
        ),
        Task(
            title="Music Class Support",
            category="CLASS_SUPPORT",
            start_time=time(14, 0),
            end_time=time(15, 0),
            classroom_id=classrooms[8].id,
            school_class_id=school_classes[1].id,
            recurrence_rule="FREQ=WEEKLY;BYDAY=TU,TH",
            notes="Assist with music activities in Grade 1B",
            is_flexible=False
        ),
        
        # One-off tasks for testing
        Task(
            title="Special Assembly Support",
            category="CLASS_SUPPORT",
            start_time=time(11, 0),
            end_time=time(12, 0),
            classroom_id=classrooms[11].id,
            notes="Support during special assembly (one-time)",
            is_flexible=False
        ),
        Task(
            title="Field Trip Support",
            category="CLASS_SUPPORT",
            start_time=time(9, 0),
            end_time=time(15, 0),
            notes="Support during field trip to museum",
            is_flexible=True
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
            # Leave some tasks unassigned for testing drag and drop
            if task.title in ["Computer Lab Support", "Music Class Support", "Special Assembly Support", "Field Trip Support"]:
                assignment.status = 'UNASSIGNED'
                continue
                
            # Assign to a random aide if available
            for aide in aides:
                if aide.is_available(assignment.date, assignment.start_time, assignment.end_time):
                    assignment.aide_id = aide.id
                    assignment.status = 'ASSIGNED'
                    break
            session.add(assignment)
    
    session.commit()

def create_absences(session, aides):
    """Create sample absences for testing."""
    today = date.today()
    
    # Create an absence for tomorrow
    absence1 = Absence(
        aide_id=aides[0].id,  # Sarah Johnson
        start_date=today + timedelta(days=1),  # Tomorrow
        end_date=today + timedelta(days=1),
        reason="Medical appointment"
    )
    session.add(absence1)
    
    # Create an absence for next week
    absence2 = Absence(
        aide_id=aides[2].id,  # Emma Rodriguez
        start_date=today + timedelta(days=7),  # Next Monday
        end_date=today + timedelta(days=7),
        reason="Personal leave"
    )
    session.add(absence2)
    
    session.commit()

def clear_database(session):
    """Clear all existing data from the database."""
    try:
        session.query(Absence).delete()
        session.query(Assignment).delete()
        session.query(Task).delete()
        session.query(SchoolClass).delete()
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
    # Ensure tables are created before clearing/seeding
    init_db()
    session = get_session()
    
    try:
        # Clear existing data first
        clear_database(session)

        # Create teacher aides
        logger.info("Creating teacher aides...")
        aides = create_teacher_aides(session)

        # Create availabilities for aides
        logger.info("Creating availabilities...")
        create_availabilities(session, aides)

        # Create classrooms
        logger.info("Creating classrooms...")
        classrooms = create_classrooms(session)

        # Create school classes
        logger.info("Creating school classes...")
        school_classes = create_school_classes(session)

        # Create tasks
        logger.info("Creating tasks...")
        tasks = create_tasks(session, classrooms, school_classes)

        # Create assignments
        logger.info("Creating assignments...")
        create_assignments(session, tasks, aides)

        # Create absences
        logger.info("Creating absences...")
        create_absences(session, aides)

        logger.info("Database seeded successfully!")
        logger.info(f"Created {len(aides)} teacher aides")
        logger.info(f"Created {len(classrooms)} classrooms")
        logger.info(f"Created {len(school_classes)} school classes")
        logger.info(f"Created {len(tasks)} tasks")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_database() 