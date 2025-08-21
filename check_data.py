#!/usr/bin/env python3

from api.db import get_session
from api.models import TeacherAide, Task, Assignment, Classroom, SchoolClass, Absence

def check_database():
    """Check if the database has been populated with data."""
    try:
        session = get_session()
        
        # Count records in each table
        aide_count = session.query(TeacherAide).count()
        task_count = session.query(Task).count()
        assignment_count = session.query(Assignment).count()
        classroom_count = session.query(Classroom).count()
        school_class_count = session.query(SchoolClass).count()
        absence_count = session.query(Absence).count()
        
        print("=== Database Status ===")
        print(f"Teacher Aides: {aide_count}")
        print(f"Tasks: {task_count}")
        print(f"Assignments: {assignment_count}")
        print(f"Classrooms: {classroom_count}")
        print(f"School Classes: {school_class_count}")
        print(f"Absences: {absence_count}")
        
        if aide_count > 0:
            print("\n=== Sample Teacher Aides ===")
            aides = session.query(TeacherAide).limit(3).all()
            for aide in aides:
                print(f"- {aide.name} ({aide.colour_hex})")
        
        if task_count > 0:
            print("\n=== Sample Tasks ===")
            tasks = session.query(Task).limit(3).all()
            for task in tasks:
                print(f"- {task.title} ({task.category})")
        
        if assignment_count > 0:
            print("\n=== Sample Assignments ===")
            assignments = session.query(Assignment).limit(3).all()
            for assignment in assignments:
                print(f"- Task ID: {assignment.task_id}, Status: {assignment.status}, Date: {assignment.date}")
        
        session.close()
        
        if aide_count > 0 and task_count > 0:
            print("\n✅ Database appears to be populated with data!")
            return True
        else:
            print("\n❌ Database appears to be empty.")
            return False
            
    except Exception as e:
        print(f"Error checking database: {e}")
        return False

if __name__ == "__main__":
    check_database()
