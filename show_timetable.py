#!/usr/bin/env python3

import os
import sys
from datetime import datetime, date, timedelta

# Add current directory to path
sys.path.insert(0, os.getcwd())

from api.db import get_session
from api.models import TeacherAide, Assignment, Task

def show_teacher_aide_timetable():
    """Show a teacher aide's timetable for the current week."""
    try:
        session = get_session()
        
        # Get all teacher aides
        aides = session.query(TeacherAide).all()
        
        if not aides:
            with open('timetable_output.txt', 'w') as f:
                f.write("No teacher aides found in database.\n")
            return
        
        # Get the first aide as an example
        aide = aides[0]
        
        with open('timetable_output.txt', 'w') as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"TIMETABLE FOR: {aide.name}\n")
            f.write(f"Qualifications: {aide.qualifications}\n")
            f.write(f"Color: {aide.colour_hex}\n")
            f.write(f"{'='*60}\n")
            
            # Calculate current week dates
            today = date.today()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=4)  # Friday
            
            f.write(f"Week: {start_of_week} to {end_of_week}\n")
            f.write(f"{'='*60}\n")
            
            # Get assignments for this aide in the current week
            assignments = session.query(Assignment).filter(
                Assignment.aide_id == aide.id,
                Assignment.date >= start_of_week,
                Assignment.date <= end_of_week
            ).order_by(Assignment.date, Assignment.start_time).all()
            
            if not assignments:
                f.write("No assignments found for this week.\n")
            else:
                f.write("ASSIGNMENTS:\n")
                f.write("-" * 60 + "\n")
                
                current_date = None
                for assignment in assignments:
                    if assignment.date != current_date:
                        current_date = assignment.date
                        f.write(f"\n{current_date.strftime('%A, %B %d, %Y')}:\n")
                        f.write("-" * 40 + "\n")
                    
                    task = session.query(Task).filter(Task.id == assignment.task_id).first()
                    f.write(f"  {assignment.start_time.strftime('%H:%M')} - {assignment.end_time.strftime('%H:%M')}\n")
                    f.write(f"    Task: {task.title if task else 'Unknown'}\n")
                    f.write(f"    Category: {task.category if task else 'Unknown'}\n")
                    f.write(f"    Status: {assignment.status}\n")
                    if task and task.notes:
                        f.write(f"    Notes: {task.notes}\n")
                    f.write("\n")
            
            # Also show unassigned tasks for this week
            unassigned = session.query(Assignment).filter(
                Assignment.aide_id.is_(None),
                Assignment.date >= start_of_week,
                Assignment.date <= end_of_week
            ).order_by(Assignment.date, Assignment.start_time).all()
            
            if unassigned:
                f.write("\nUNASSIGNED TASKS (available for assignment):\n")
                f.write("-" * 60 + "\n")
                
                current_date = None
                for assignment in unassigned:
                    if assignment.date != current_date:
                        current_date = assignment.date
                        f.write(f"\n{current_date.strftime('%A, %B %d, %Y')}:\n")
                        f.write("-" * 40 + "\n")
                    
                    task = session.query(Task).filter(Task.id == assignment.task_id).first()
                    f.write(f"  {assignment.start_time.strftime('%H:%M')} - {assignment.end_time.strftime('%H:%M')}\n")
                    f.write(f"    Task: {task.title if task else 'Unknown'}\n")
                    f.write(f"    Category: {task.category if task else 'Unknown'}\n")
                    f.write("\n")
        
        session.close()
        print("Timetable data written to timetable_output.txt")
        
    except Exception as e:
        with open('timetable_output.txt', 'w') as f:
            f.write(f"Error: {e}\n")
        print(f"Error: {e}")

if __name__ == "__main__":
    show_teacher_aide_timetable()
