from flask import Blueprint, jsonify
from api.db import get_db
from api.models import TeacherAide, Assignment, Absence
from sqlalchemy import and_
from contextlib import contextmanager
from datetime import datetime, date

timetable_bp = Blueprint('timetable', __name__)

@timetable_bp.route('/timetable', methods=['GET'])
def get_timetable():
    """Get the complete timetable data including aides, assignments, and absences."""
    db = next(get_db())  # Get the session from the generator
    
    try:
        # Get all teacher aides
        aides = db.query(TeacherAide).all()
        aides_data = [
            {
                'id': aide.id,
                'name': aide.name,
                'color': aide.colour_hex or '#4CAF50'  # Default color if none set
            }
            for aide in aides
        ]
        
        # Get all assignments
        assignments = db.query(Assignment).all()
        assignments_data = [
            {
                'id': assignment.id,
                'aideId': assignment.aide_id,
                'day': assignment.date.strftime('%A').upper(),
                'startTime': assignment.start_time.strftime('%H:%M'),
                'endTime': assignment.end_time.strftime('%H:%M'),
                'task': assignment.task.title,
                'categoryColor': '#FFC107'  # Default color for now
            }
            for assignment in assignments
        ]
        
        # Get all absences
        absences = db.query(Absence).all()
        absences_data = [
            {
                'id': absence.id,
                'aideId': absence.aide_id,
                'day': absence.start_date.strftime('%A').upper(),
                'reason': absence.reason
            }
            for absence in absences
        ]
        
        return jsonify({
            'aides': aides_data,
            'assignments': assignments_data,
            'absences': absences_data
        })
    finally:
        db.close()  # Ensure the session is closed 