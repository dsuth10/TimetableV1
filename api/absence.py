from datetime import datetime, date
from typing import Dict, Any, List, Tuple
from flask import Blueprint, request, jsonify
from sqlalchemy import and_
from sqlalchemy.orm import Session

from .db import get_db
from .models import Absence, Assignment, TeacherAide
from .constants import Status

absence_bp = Blueprint('absence', __name__)

def error_response(code: str, message: str, status: int) -> Tuple[Dict[str, str], int]:
    """Return a standardized error response."""
    return {'error': code, 'message': message}, status

@absence_bp.route('/absences', methods=['POST'])
def create_absence() -> Tuple[Dict[str, Any], int]:
    """Create a new absence record and release associated assignments.
    
    Returns:
        Tuple containing response dict and status code.
    """
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ('aide_id', 'date')):
        return error_response('VALIDATION_ERROR', 'Missing required fields: aide_id, date', 422)
    
    try:
        absence_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
    
    db: Session = next(get_db())
    
    # Check if aide exists
    aide = db.query(TeacherAide).get(data['aide_id'])
    if not aide:
        return error_response('NOT_FOUND', 'Teacher aide not found', 404)
    
    # Check for duplicate absence
    existing = db.query(Absence).filter_by(
        aide_id=data['aide_id'],
        date=absence_date
    ).first()
    if existing:
        return error_response('CONFLICT', 'Absence already recorded for this date', 409)
    
    # Create absence
    absence = Absence(
        aide_id=data['aide_id'],
        date=absence_date,
        reason=data.get('reason')
    )
    db.add(absence)
    
    # Release assignments
    released_assignments = absence.release_assignments(db)
    released_ids = [a.id for a in released_assignments]
    
    db.commit()
    
    return {
        'id': absence.id,
        'aide_id': absence.aide_id,
        'date': absence.date.isoformat(),
        'reason': absence.reason,
        'released_assignments': released_ids
    }, 201

@absence_bp.route('/absences/<int:absence_id>', methods=['DELETE'])
def delete_absence(absence_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete an absence record and attempt to restore assignments.
    
    Args:
        absence_id: ID of the absence to delete
        
    Returns:
        Tuple containing response dict and status code.
    """
    db: Session = next(get_db())
    absence = db.query(Absence).get(absence_id)
    
    if not absence:
        return error_response('NOT_FOUND', 'Absence not found', 404)
    
    # Store info before deletion
    aide_id = absence.aide_id
    absence_date = absence.date
    
    # Delete absence
    db.delete(absence)
    
    # Find unassigned tasks that were previously assigned to this aide
    assignments = db.query(Assignment).filter(
        Assignment.aide_id.is_(None),
        Assignment.date == absence_date,
        Assignment.status == Status.UNASSIGNED
    ).all()
    
    # Attempt to reassign
    reassigned_ids = []
    for assignment in assignments:
        # Check if original aide is available
        if assignment.task.classroom and assignment.task.classroom.capacity:
            assignment.aide_id = aide_id
            assignment.status = Status.ASSIGNED
            reassigned_ids.append(assignment.id)
    
    db.commit()
    
    return {
        'message': 'Absence deleted successfully',
        'reassigned_assignments': reassigned_ids
    }, 200

@absence_bp.route('/absences', methods=['GET'])
def list_absences() -> Tuple[Dict[str, Any], int]:
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
            start_date = date.fromisocalendar(year, week_num, 1)
            end_date = date.fromisocalendar(year, week_num, 7)
            query = query.filter(
                and_(
                    Absence.date >= start_date,
                    Absence.date <= end_date
                )
            )
        except ValueError:
            return error_response('VALIDATION_ERROR', 'Invalid week format. Use YYYY-WW', 422)
    
    absences = query.all()
    
    return {
        'absences': [{
            'id': a.id,
            'aide_id': a.aide_id,
            'date': a.date.isoformat(),
            'reason': a.reason
        } for a in absences]
    }, 200 