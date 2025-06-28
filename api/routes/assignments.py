from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from api.models.assignment import Assignment
from api.db import get_session, managed_session
from api.utils import error_response

assignments_bp = Blueprint('assignments', __name__)

@assignments_bp.route('/assignments', methods=['POST'])
def create_assignment():
    """Create a new task assignment."""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['task_id', 'aide_id', 'day', 'start_time', 'duration']
    for field in required_fields:
        if field not in data:
            return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
    
    try:
        with managed_session() as session:
            # Check for conflicts
            existing_assignments = session.query(Assignment).filter(
                Assignment.aide_id == data['aide_id'],
                Assignment.day == data['day']
            ).all()
            
            new_start = datetime.strptime(data['start_time'], '%H:%M')
            new_end = datetime.strptime(data['start_time'], '%H:%M').replace(
                minute=new_start.minute + data['duration']
            )
            
            for assignment in existing_assignments:
                existing_start = datetime.strptime(assignment.start_time, '%H:%M')
                existing_end = datetime.strptime(assignment.start_time, '%H:%M').replace(
                    minute=existing_start.minute + assignment.duration
                )
                
                if (new_start < existing_end and new_end > existing_start):
                    return error_response(
                        'CONFLICT_ERROR',
                        'Assignment conflicts with existing schedule',
                        409
                    )
            
            # Create new assignment
            assignment = Assignment(
                task_id=data['task_id'],
                aide_id=data['aide_id'],
                day=data['day'],
                start_time=data['start_time'],
                duration=data['duration']
            )
            
            session.add(assignment)
            session.commit()
            
            return jsonify(assignment.to_dict()), 201
            
    except IntegrityError:
        return error_response(
            'DATABASE_ERROR',
            'Failed to create assignment',
            500
        )

@assignments_bp.route('/assignments/<int:assignment_id>', methods=['PUT'])
def update_assignment(assignment_id: int):
    """Update an existing assignment."""
    data = request.get_json()
    
    try:
        with managed_session() as session:
            assignment = session.query(Assignment).get(assignment_id)
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            
            for key, value in data.items():
                if hasattr(assignment, key):
                    setattr(assignment, key, value)
            
            session.commit()
            return jsonify(assignment.to_dict()), 200
            
    except IntegrityError:
        return error_response(
            'DATABASE_ERROR',
            'Failed to update assignment',
            500
        )

@assignments_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id: int):
    """Delete an assignment."""
    try:
        with managed_session() as session:
            assignment = session.query(Assignment).get(assignment_id)
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            
            session.delete(assignment)
            session.commit()
            return '', 204
            
    except IntegrityError:
        return error_response(
            'DATABASE_ERROR',
            'Failed to delete assignment',
            500
        )

@assignments_bp.route('/assignments/check', methods=['POST'])
def check_conflicts():
    """Check for scheduling conflicts."""
    data = request.get_json()
    
    required_fields = ['aide_id', 'day', 'start_time', 'duration']
    for field in required_fields:
        if field not in data:
            return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
    
    try:
        with managed_session() as session:
            existing_assignments = session.query(Assignment).filter(
                Assignment.aide_id == data['aide_id'],
                Assignment.day == data['day']
            ).all()
            
            new_start = datetime.strptime(data['start_time'], '%H:%M')
            new_end = datetime.strptime(data['start_time'], '%H:%M').replace(
                minute=new_start.minute + data['duration']
            )
            
            conflicts = []
            for assignment in existing_assignments:
                existing_start = datetime.strptime(assignment.start_time, '%H:%M')
                existing_end = datetime.strptime(assignment.start_time, '%H:%M').replace(
                    minute=existing_start.minute + assignment.duration
                )
                
                if (new_start < existing_end and new_end > existing_start):
                    conflicts.append(assignment.to_dict())
            
            return jsonify({
                'has_conflicts': len(conflicts) > 0,
                'conflicts': conflicts
            }), 200
            
    except Exception as e:
        return error_response(
            'VALIDATION_ERROR',
            str(e),
            422
        ) 