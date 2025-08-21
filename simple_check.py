#!/usr/bin/env python3

import os
import sys

# Add current directory to path
sys.path.insert(0, os.getcwd())

try:
    from api.db import get_session
    from api.models import TeacherAide, Task, Assignment, Classroom, SchoolClass, Absence
    
    # Check database
    session = get_session()
    
    aide_count = session.query(TeacherAide).count()
    task_count = session.query(Task).count()
    assignment_count = session.query(Assignment).count()
    classroom_count = session.query(Classroom).count()
    school_class_count = session.query(SchoolClass).count()
    absence_count = session.query(Absence).count()
    
    session.close()
    
    # Write results to file
    with open('db_check_result.txt', 'w') as f:
        f.write("=== Database Status ===\n")
        f.write(f"Teacher Aides: {aide_count}\n")
        f.write(f"Tasks: {task_count}\n")
        f.write(f"Assignments: {assignment_count}\n")
        f.write(f"Classrooms: {classroom_count}\n")
        f.write(f"School Classes: {school_class_count}\n")
        f.write(f"Absences: {absence_count}\n")
        
        if aide_count > 0 and task_count > 0:
            f.write("\n✅ Database is populated with data!\n")
        else:
            f.write("\n❌ Database appears to be empty.\n")
    
    print("Database check completed. Results written to db_check_result.txt")
    
except Exception as e:
    with open('db_check_result.txt', 'w') as f:
        f.write(f"Error checking database: {e}\n")
    print(f"Error: {e}")
