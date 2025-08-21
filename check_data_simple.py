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
        
        # Write results to a file
        with open('database_status.txt', 'w') as f:
            f.write("=== Database Status ===\n")
            f.write(f"Teacher Aides: {aide_count}\n")
            f.write(f"Tasks: {task_count}\n")
            f.write(f"Assignments: {assignment_count}\n")
            f.write(f"Classrooms: {classroom_count}\n")
            f.write(f"School Classes: {school_class_count}\n")
            f.write(f"Absences: {absence_count}\n")
            
            if aide_count > 0:
                f.write("\n=== Sample Teacher Aides ===\n")
                aides = session.query(TeacherAide).limit(3).all()
                for aide in aides:
                    f.write(f"- {aide.name} ({aide.colour_hex})\n")
            
            if task_count > 0:
                f.write("\n=== Sample Tasks ===\n")
                tasks = session.query(Task).limit(3).all()
                for task in tasks:
                    f.write(f"- {task.title} ({task.category})\n")
            
            if assignment_count > 0:
                f.write("\n=== Sample Assignments ===\n")
                assignments = session.query(Assignment).limit(3).all()
                for assignment in assignments:
                    f.write(f"- Task ID: {assignment.task_id}, Status: {assignment.status}, Date: {assignment.date}\n")
            
            if aide_count > 0 and task_count > 0:
                f.write("\n✅ Database appears to be populated with data!\n")
            else:
                f.write("\n❌ Database appears to be empty.\n")
        
        session.close()
        print(f"Database status written to database_status.txt")
        return aide_count > 0 and task_count > 0
            
    except Exception as e:
        with open('database_status.txt', 'w') as f:
            f.write(f"Error checking database: {e}\n")
        print(f"Error checking database: {e}")
        return False

if __name__ == "__main__":
    check_database()
