from flask import jsonify
from sqlalchemy.orm.exc import DetachedInstanceError
from datetime import datetime
from api.models import SchoolClass # Import SchoolClass

def error_response(code: str, message: str, status: int) -> tuple[dict, int]:
    """Return a standardized error response."""
    return {'error': {'code': code, 'message': message}}, status

def serialize_school_class(school_class):
    """Serializes a SchoolClass object to a dictionary."""
    if not school_class:
        return None
    return {
        'id': school_class.id,
        'class_code': school_class.class_code,
        'grade': school_class.grade,
        'teacher': school_class.teacher,
        'notes': school_class.notes,
        'created_at': school_class.created_at.isoformat() if school_class.created_at else None,
        'updated_at': school_class.updated_at.isoformat() if school_class.updated_at else None,
    }

def serialize_task(task):
    """Serialize a Task instance to a dictionary."""
    return {
        'id': task.id,
        'title': task.title,
        'category': task.category,
        'start_time': task.start_time.strftime('%H:%M') if task.start_time else None,
        'end_time': task.end_time.strftime('%H:%M') if task.end_time else None,
        'recurrence_rule': task.recurrence_rule,
        'expires_on': task.expires_on.isoformat() if task.expires_on else None,
        'classroom_id': task.classroom_id,
        'school_class_id': task.school_class_id, # Add school_class_id
        'school_class': serialize_school_class(task.school_class) if task.school_class else None, # Add serialized school_class
        'notes': task.notes,
        'status': task.status,
        'is_flexible': task.is_flexible,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None
    }

def serialize_assignment(assignment, task=None):
    """Serialize an Assignment instance to a dictionary."""
    # If task object is provided, use its properties
    task_title = None
    task_category = None
    task_notes = None
    is_flexible = False
    if task:
        task_title = task.title
        task_category = task.category
        task_notes = task.notes
        is_flexible = task.is_flexible
    else:
        # Otherwise, try to load from assignment.task relationship
        try:
            if assignment.task:
                task_title = assignment.task.title
                task_category = assignment.task.category
                task_notes = assignment.task.notes
                is_flexible = assignment.task.is_flexible
        except (DetachedInstanceError, AttributeError):
            pass # Task not loaded or detached

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
        'task_title': task_title,
        'task_category': task_category,
        'is_flexible': is_flexible,
        'notes': task_notes,
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
        'start_date': absence.start_date.isoformat(),
        'end_date': absence.end_date.isoformat(),
        'reason': absence.reason,
        'created_at': absence.created_at.isoformat() if absence.created_at else None
    }

def serialize_classroom(classroom):
    """Serialize a Classroom instance to a dictionary."""
    return {
        'id': classroom.id,
        'name': classroom.name,
        'capacity': classroom.capacity,
        'notes': classroom.notes,
        'created_at': classroom.created_at.isoformat() if classroom.created_at else None,
        'updated_at': classroom.updated_at.isoformat() if classroom.updated_at else None
    }
