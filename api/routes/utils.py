from flask import jsonify
from sqlalchemy.orm.exc import DetachedInstanceError
from datetime import datetime

def error_response(code: str, message: str, status: int) -> tuple[dict, int]:
    """Return a standardized error response."""
    return {'error': {'code': code, 'message': message}}, status

def serialize_task(task):
    """Serialize a Task instance to a dictionary."""
    return {
        'id': task.id,
        'title': task.title,
        'category': task.category,
        'start_time': task.start_time.strftime('%H:%M'),
        'end_time': task.end_time.strftime('%H:%M'),
        'recurrence_rule': task.recurrence_rule,
        'expires_on': task.expires_on.isoformat() if task.expires_on else None,
        'classroom_id': task.classroom_id,
        'notes': task.notes,
        'status': task.status,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None
    }

def serialize_assignment(assignment, task_title=None):
    """Serialize an Assignment instance to a dictionary."""
    # Always use provided task_title if given
    if task_title is not None:
        resolved_task_title = task_title
    else:
        # Defensive: check if assignment.task is loaded and not detached
        try:
            resolved_task_title = assignment.task.title if assignment.task else None
        except (DetachedInstanceError, AttributeError):
            resolved_task_title = None
            
    # Safely handle datetime fields
    created_at = None
    updated_at = None
    try:
        created_at = assignment.created_at.isoformat() if assignment.created_at else None
        updated_at = assignment.updated_at.isoformat() if assignment.updated_at else None
    except (DetachedInstanceError, AttributeError):
        pass
        
    return {
        'id': assignment.id,
        'task_id': assignment.task_id,
        'aide_id': assignment.aide_id,
        'date': assignment.date.isoformat(),
        'start_time': assignment.start_time.strftime('%H:%M'),
        'end_time': assignment.end_time.strftime('%H:%M'),
        'status': assignment.status,
        'task_title': resolved_task_title,
        'created_at': created_at,
        'updated_at': updated_at
    }

def serialize_aide(aide):
    """Serialize a TeacherAide instance to a dictionary."""
    return {
        'id': aide.id,
        'name': aide.name,
        'qualifications': aide.qualifications,
        'colour_hex': aide.colour_hex,
        'created_at': aide.created_at.isoformat() if aide.created_at else None,
        'updated_at': aide.updated_at.isoformat() if aide.updated_at else None
    }

def serialize_availability(avail):
    """Serialize an Availability instance to a dictionary."""
    return {
        'id': avail.id,
        'aide_id': avail.aide_id,
        'weekday': avail.weekday,
        'start_time': avail.start_time.strftime('%H:%M'),
        'end_time': avail.end_time.strftime('%H:%M'),
        'created_at': avail.created_at.isoformat() if avail.created_at else None
    }

def serialize_absence(absence):
    """Serialize an Absence instance to a dictionary."""
    return {
        'id': absence.id,
        'aide_id': absence.aide_id,
        'date': absence.date.isoformat(),
        'reason': absence.reason,
        'created_at': absence.created_at.isoformat() if absence.created_at else None
    } 