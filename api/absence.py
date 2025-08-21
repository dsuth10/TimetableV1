from datetime import datetime, date
from typing import Dict, Any, List, Tuple
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from .db import get_db
from .models import Absence, Assignment, TeacherAide
from .constants import Status

absence_bp = Blueprint('absence', __name__)
api = Api(absence_bp)

def error_response(code: str, message: str, status: int) -> Tuple[Dict[str, str], int]:
    """Return a standardized error response."""
    return {'error': code, 'message': message}, status

class AbsenceListResource(Resource):
    def get(self):
        """List absences, optionally filtered by week.
        
        Query Parameters:
            week: Optional week in YYYY-WW format
            
        Returns:
            Tuple containing response dict and status code.
        """
        week = request.args.get('week')
        db: Session = next(get_db())
        
        query = db.query(Absence)
        
        if week:
            try:
                year, week_num = map(int, week.split('-'))
                # Use ISO week: Monday=1, Sunday=7
                week_start = date.fromisocalendar(year, week_num, 1)
                week_end = date.fromisocalendar(year, week_num, 7)
                query = query.filter(
                    or_(
                        and_(Absence.start_date <= week_end, Absence.end_date >= week_start)
                    )
                )
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid week format. Use YYYY-WW', 422)
        
        absences = query.all()
        
        return {
            'absences': [{
                'id': a.id,
                'aide_id': a.aide_id,
                'start_date': a.start_date.isoformat(),
                'end_date': a.end_date.isoformat(),
                'reason': a.reason
            } for a in absences]
        }, 200

    def post(self):
        """Create a new absence record and release associated assignments.
        
        Returns:
            Tuple containing response dict and status code.
        """
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ('aide_id', 'start_date', 'end_date')):
            return error_response('VALIDATION_ERROR', 'Missing required fields: aide_id, start_date, end_date', 422)
        
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
        
        if start_date > end_date:
            return error_response('VALIDATION_ERROR', 'start_date must be before end_date', 422)
        
        db: Session = next(get_db())
        
        # Check if aide exists
        aide = db.get(TeacherAide, data['aide_id'])
        if not aide:
            return error_response('NOT_FOUND', 'Teacher aide not found', 404)
        
        # Check for overlapping absences
        overlapping = db.query(Absence).filter(
            Absence.aide_id == data['aide_id'],
            or_(
                and_(Absence.start_date <= end_date, Absence.end_date >= start_date)
            )
        ).first()
        if overlapping:
            return error_response('CONFLICT', 'Absence overlaps with existing absence', 409)
        
        # Create absence
        absence = Absence(
            aide_id=data['aide_id'],
            start_date=start_date,
            end_date=end_date,
            reason=data.get('reason')
        )
        db.add(absence)
        db.flush()  # Get ID without committing
        
        # Release assignments
        released_assignments = absence.release_assignments(db)
        
        db.commit()
        
        return {
            'id': absence.id,
            'aide_id': absence.aide_id,
            'start_date': absence.start_date.isoformat(),
            'end_date': absence.end_date.isoformat(),
            'reason': absence.reason,
            'affected_assignments': [{
                'id': a.id,
                'task_id': a.task_id,
                'date': a.date.isoformat(),
                'start_time': a.start_time.isoformat(),
                'end_time': a.end_time.isoformat(),
                'status': a.status
            } for a in released_assignments]
        }, 201

class AbsenceResource(Resource):
    def delete(self, absence_id: int):
        """Delete an absence record and attempt to restore assignments.
        
        Args:
            absence_id: ID of the absence to delete
            
        Returns:
            Tuple containing response dict and status code.
        """
        db: Session = next(get_db())
        try:
            absence = db.query(Absence).options(
                joinedload(Absence.assignments)
            ).get(absence_id)
            if not absence:
                return error_response('NOT_FOUND', 'Absence not found', 404)
            
            # Store info before deletion
            aide_id = absence.aide_id
            affected_assignments = list(absence.assignments)  # Create a copy since we're deleting the absence
            
            # Delete absence
            db.delete(absence)
            
            # Attempt to reassign only if aide is actually available during those times
            from .models import Availability
            reassigned_ids = []
            for assignment in affected_assignments:
                # Check if the aide has availability for this assignment
                # Get the weekday (0=Monday, 6=Sunday)
                assignment_weekday = assignment.date.weekday()
                
                # Check if aide has availability on this weekday and time
                aide_availability = db.query(Availability).filter(
                    Availability.aide_id == aide_id,
                    Availability.weekday == assignment_weekday,
                    Availability.start_time <= assignment.start_time,
                    Availability.end_time >= assignment.end_time
                ).first()
                
                # Only reassign if aide has proper availability
                if aide_availability:
                    assignment.aide_id = aide_id
                    assignment.status = Status.ASSIGNED
                    reassigned_ids.append(assignment.id)
                # Otherwise, leave assignment unassigned for manual reassignment
            
            db.commit()
            
            return {
                'message': 'Absence deleted successfully',
                'reassigned_assignments': reassigned_ids,
                'total_affected_assignments': len(affected_assignments)
            }, 200
            
        except Exception as e:
            db.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# Register resources
api.add_resource(AbsenceListResource, '/absences')
api.add_resource(AbsenceResource, '/absences/<int:absence_id>') 