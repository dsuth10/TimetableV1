from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from typing import Dict, Any, Tuple

from api.db import get_db
from api.models import Classroom
from api.constants import Status

classroom_bp = Blueprint('classroom', __name__)

def error_response(code: str, message: str, status: int) -> Tuple[Dict[str, Any], int]:
    """Return a standardized error response."""
    return {'error': code, 'message': message}, status

@classroom_bp.route('/classrooms', methods=['GET'])
def list_classrooms() -> Tuple[Dict[str, Any], int]:
    """List all classrooms.
    
    Returns:
        Tuple containing JSON response and HTTP status code.
    """
    with next(get_db()) as session:
        classrooms = session.query(Classroom).all()
        return {
            'classrooms': [
                {
                    'id': c.id,
                    'name': c.name,
                    'capacity': c.capacity,
                    'notes': c.notes,
                    'created_at': c.created_at.isoformat() if c.created_at else None,
                    'updated_at': c.updated_at.isoformat() if c.updated_at else None
                }
                for c in classrooms
            ]
        }, 200

@classroom_bp.route('/classrooms', methods=['POST'])
def create_classroom() -> Tuple[Dict[str, Any], int]:
    """Create a new classroom.
    
    Returns:
        Tuple containing JSON response and HTTP status code.
    """
    data = request.get_json()
    
    # Validate required fields
    if not data:
        return error_response('VALIDATION_ERROR', 'No data provided', 422)
    if 'name' not in data:
        return error_response('VALIDATION_ERROR', 'Name is required', 422)
    if 'capacity' in data and not isinstance(data['capacity'], int):
        return error_response('VALIDATION_ERROR', 'Capacity must be an integer', 422)
    
    # Create classroom
    classroom = Classroom(
        name=data['name'],
        capacity=data.get('capacity'),
        notes=data.get('notes')
    )
    
    with next(get_db()) as session:
        try:
            session.add(classroom)
            session.commit()
            return {
                'id': classroom.id,
                'name': classroom.name,
                'capacity': classroom.capacity,
                'notes': classroom.notes,
                'created_at': classroom.created_at.isoformat() if classroom.created_at else None,
                'updated_at': classroom.updated_at.isoformat() if classroom.updated_at else None
            }, 201
        except IntegrityError:
            session.rollback()
            return error_response('CONFLICT', 'Classroom with this name already exists', 409)
        except Exception as e:
            session.rollback()
            return error_response('SERVER_ERROR', str(e), 500)

@classroom_bp.route('/classrooms/<int:classroom_id>', methods=['GET'])
def get_classroom(classroom_id: int) -> Tuple[Dict[str, Any], int]:
    """Get details for a specific classroom.
    
    Args:
        classroom_id: The ID of the classroom to retrieve.
        
    Returns:
        Tuple containing JSON response and HTTP status code.
    """
    with next(get_db()) as session:
        classroom = session.get(Classroom, classroom_id)
        if not classroom:
            return error_response('NOT_FOUND', f'Classroom {classroom_id} not found', 404)
        
        return {
            'id': classroom.id,
            'name': classroom.name,
            'capacity': classroom.capacity,
            'notes': classroom.notes,
            'created_at': classroom.created_at.isoformat() if classroom.created_at else None,
            'updated_at': classroom.updated_at.isoformat() if classroom.updated_at else None
        }, 200

@classroom_bp.route('/classrooms/<int:classroom_id>', methods=['PUT'])
def update_classroom(classroom_id: int) -> Tuple[Dict[str, Any], int]:
    """Update a classroom's details.
    
    Args:
        classroom_id: The ID of the classroom to update.
        
    Returns:
        Tuple containing JSON response and HTTP status code.
    """
    data = request.get_json()
    if not data:
        return error_response('VALIDATION_ERROR', 'No data provided', 422)
    
    with next(get_db()) as session:
        classroom = session.get(Classroom, classroom_id)
        if not classroom:
            return error_response('NOT_FOUND', f'Classroom {classroom_id} not found', 404)
        
        # Update fields
        if 'name' in data:
            classroom.name = data['name']
        if 'capacity' in data:
            if not isinstance(data['capacity'], int):
                return error_response('VALIDATION_ERROR', 'Capacity must be an integer', 422)
            classroom.capacity = data['capacity']
        if 'notes' in data:
            classroom.notes = data['notes']
        
        try:
            session.commit()
            return {
                'id': classroom.id,
                'name': classroom.name,
                'capacity': classroom.capacity,
                'notes': classroom.notes,
                'created_at': classroom.created_at.isoformat() if classroom.created_at else None,
                'updated_at': classroom.updated_at.isoformat() if classroom.updated_at else None
            }, 200
        except IntegrityError:
            session.rollback()
            return error_response('CONFLICT', 'Classroom with this name already exists', 409)
        except Exception as e:
            session.rollback()
            return error_response('SERVER_ERROR', str(e), 500)

@classroom_bp.route('/classrooms/<int:classroom_id>', methods=['DELETE'])
def delete_classroom(classroom_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete a classroom.
    
    Args:
        classroom_id: The ID of the classroom to delete.
        
    Returns:
        Tuple containing JSON response and HTTP status code.
    """
    with next(get_db()) as session:
        classroom = session.get(Classroom, classroom_id)
        if not classroom:
            return error_response('NOT_FOUND', f'Classroom {classroom_id} not found', 404)
        
        try:
            session.delete(classroom)
            session.commit()
            return {'message': f'Classroom {classroom_id} deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return error_response('SERVER_ERROR', str(e), 500) 