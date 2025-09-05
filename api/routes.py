from flask import Blueprint, jsonify, request, abort
from flask_restful import Api, Resource
from sqlalchemy.orm import scoped_session, joinedload
from api.models import TeacherAide, Availability, Task, Assignment, Classroom, Absence
from api.db import get_db
from datetime import time, date, datetime, timedelta
from dateutil.rrule import rrulestr
from typing import Optional
from sqlalchemy import func, or_, and_
import logging
from api.recurrence import extend_assignment_horizon, DEFAULT_HORIZON_WEEKS
from sqlalchemy.orm.exc import DetachedInstanceError
from api.constants import Status

api_bp = Blueprint('api', __name__)
api = Api(api_bp)

logger = logging.getLogger(__name__)

def error_response(code: str, message: str, status: int) -> tuple[dict, int]:
    """Return a standardized error response.
    
    Args:
        code: Error code (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
        message: Human-readable error message
        status: HTTP status code
        
    Returns:
        Tuple of (error response dict, status code)
    """
    return {'error': {'code': code, 'message': message}}, status

# Utility: serialize models

def serialize_aide(aide):
    return {
        'id': aide.id,
        'name': aide.name,
        'qualifications': aide.qualifications,
        'colour_hex': aide.colour_hex,
        'created_at': aide.created_at.isoformat() if aide.created_at else None,
        'updated_at': aide.updated_at.isoformat() if aide.updated_at else None
    }

def serialize_availability(avail):
    return {
        'id': avail.id,
        'aide_id': avail.aide_id,
        'weekday': avail.weekday,
        'start_time': avail.start_time.strftime('%H:%M'),
        'end_time': avail.end_time.strftime('%H:%M'),
        'created_at': avail.created_at.isoformat() if avail.created_at else None
    }

def serialize_task(task):
    # Safely access relationships which might not be loaded or might be detached
    classroom_data = None
    if task.classroom:
        try:
            classroom_data = {'id': task.classroom.id, 'name': task.classroom.name}
        except DetachedInstanceError:
            pass # Handle detached instance if necessary, or refetch
            
    school_class_data = None
    if task.school_class:
        try:
            school_class_data = {'id': task.school_class.id, 'class_code': task.school_class.class_code, 'teacher': task.school_class.teacher}
        except DetachedInstanceError:
            pass # Handle detached instance if necessary, or refetch

    return {
        'id': task.id,
        'title': task.title,
        'category': task.category,
        'start_time': task.start_time.strftime('%H:%M'),
        'end_time': task.end_time.strftime('%H:%M'),
        'recurrence_rule': task.recurrence_rule,
        'expires_on': task.expires_on.isoformat() if task.expires_on else None,
        'classroom_id': task.classroom_id,
        'classroom': classroom_data, # Include classroom object
        'school_class_id': task.school_class_id, # Include school_class_id
        'school_class': school_class_data, # Include school_class object
        'notes': task.notes,
        'status': task.status,
        'is_flexible': task.is_flexible, # Include is_flexible
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None
    }

def serialize_assignment(assignment, task_title=None):
    """Serialize an Assignment instance to a dictionary.
    
    Args:
        assignment: The Assignment instance to serialize
        task_title: Optional task title to use instead of loading from relationship
        
    Returns:
        Dictionary containing the serialized assignment data
    """
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

def serialize_absence(absence):
    return {
        'id': absence.id,
        'aide_id': absence.aide_id,
        'start_date': absence.start_date.isoformat(),
        'end_date': absence.end_date.isoformat(),
        'reason': absence.reason,
        'created_at': absence.created_at.isoformat() if absence.created_at else None
    }

# --- Task Endpoints ---

class TaskListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            # Get filter parameters
            status = request.args.get('status')
            category = request.args.get('category')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 20))
            
            # Build query
            query = session.query(Task)
            
            if status:
                query = query.filter(Task.status == status)
            if category:
                query = query.filter(Task.category == category)
            if start_date:
                try:
                    start_date = date.fromisoformat(start_date)
                    query = query.filter(Task.expires_on >= start_date)
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid start_date format. Use YYYY-MM-DD', 422)
            if end_date:
                try:
                    end_date = date.fromisoformat(end_date)
                    query = query.filter(Task.expires_on <= end_date)
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid end_date format. Use YYYY-MM-DD', 422)
            
            # Get total count
            total = query.count()
            
            # Apply pagination
            tasks = query.offset((page - 1) * per_page).limit(per_page).all()
            
            result = {
                "tasks": [serialize_task(task) for task in tasks],
                "total": total,
                "page": page,
                "per_page": per_page
            }
            return result, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self):
        """Create a new task."""
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['title', 'category', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate category
            if data['category'] not in ['PLAYGROUND', 'CLASS_SUPPORT', 'GROUP_SUPPORT', 'INDIVIDUAL_SUPPORT']:
                return error_response('VALIDATION_ERROR', 'Invalid category', 422)
            
            # Validate times
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
            
            if start_time >= end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Validate recurrence rule if provided
            recurrence_rule = data.get('recurrence_rule')
            if recurrence_rule:
                try:
                    start_date = date.today()
                    dt_start = datetime.combine(start_date, start_time)
                    rrulestr(recurrence_rule, dtstart=dt_start)
                except ValueError as e:
                    return error_response('VALIDATION_ERROR', f'Invalid recurrence rule: {str(e)}', 422)
            
            # Validate classroom if provided
            classroom_id = data.get('classroom_id')
            if classroom_id:
                classroom = session.get(Classroom, classroom_id)
                if not classroom:
                    return error_response('NOT_FOUND', 'Classroom not found', 404)
            
            # Create task
            task = Task(
                title=data['title'],
                category=data['category'],
                start_time=start_time,
                end_time=end_time,
                recurrence_rule=data.get('recurrence_rule'),
                expires_on=date.fromisoformat(data['expires_on']) if data.get('expires_on') else None,
                classroom_id=classroom_id,
                notes=data.get('notes'),
                status=data.get('status', 'UNASSIGNED')
            )
            session.add(task)
            session.flush()  # Get the task ID without committing
            
            # Generate assignments if this is a recurring task
            assignments_created = 0
            if task.recurrence_rule:
                try:
                    # Generate assignments for the next 4 weeks
                    start_date = date.today()
                    end_date = start_date + timedelta(weeks=4)
                    assignments = task.generate_assignments(start_date, end_date, session)
                    assignments_created = len(assignments)
                except Exception as e:
                    session.rollback()
                    return error_response('VALIDATION_ERROR', f'Invalid recurrence rule: {str(e)}', 422)
            
            session.commit()
            # Fetch all assignments for this task with task eagerly loaded
            assignments = session.query(Assignment).options(joinedload(Assignment.task)).filter(Assignment.task_id == task.id).all()
            result = {
                "task": serialize_task(task),
                "assignments": [serialize_assignment(a, task) for a in assignments]
            }
            return result, 201
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class TaskResource(Resource):
    def get(self, task_id):
        session = next(get_db())
        try:
            task = session.query(Task).options(
                joinedload(Task.classroom),
                joinedload(Task.school_class)
            ).get(task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            return {"task": serialize_task(task)}, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, task_id):
        """Update a task and handle recurrence changes."""
        session = next(get_db())
        try:
            task = session.query(Task).options(
                joinedload(Task.classroom),
                joinedload(Task.school_class)
            ).get(task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)

            data = request.get_json(force=True)

            # Update basic fields
            if 'title' in data:
                task.title = data['title']
            if 'category' in data:
                if data['category'] not in ['PLAYGROUND', 'CLASS_SUPPORT', 'GROUP_SUPPORT', 'INDIVIDUAL_SUPPORT']:
                    return error_response('VALIDATION_ERROR', 'Invalid category', 422)
                task.category = data['category']
            if 'start_time' in data:
                try:
                    task.start_time = time.fromisoformat(data['start_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid start_time format. Use HH:MM', 422)
            if 'end_time' in data:
                try:
                    task.end_time = time.fromisoformat(data['end_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid end_time format. Use HH:MM', 422)
            if 'notes' in data:
                task.notes = data['notes']
            if 'expires_on' in data:
                try:
                    task.expires_on = date.fromisoformat(data['expires_on'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid expires_on format. Use YYYY-MM-DD', 422)
            if 'classroom_id' in data:
                task.classroom_id = data['classroom_id']
            if 'school_class_id' in data: # Handle school_class_id update
                task.school_class_id = data['school_class_id']
            if 'is_flexible' in data: # Handle is_flexible update
                task.is_flexible = data['is_flexible']

            # Handle recurrence rule changes
            # Store old recurrence rule and times for update_future_assignments
            old_recurrence = task.recurrence_rule
            old_start_time = task.start_time
            old_end_time = task.end_time

            # Handle recurrence rule changes
            if 'recurrence_rule' in data:
                task.recurrence_rule = data['recurrence_rule']

            # Update future assignments if recurrence or times changed
            if (old_recurrence != task.recurrence_rule or
                old_start_time != task.start_time or
                old_end_time != task.end_time):
                
                # Use the dedicated function from api.recurrence
                from api.recurrence import update_future_assignments
                update_future_assignments(
                    task, session,
                    old_recurrence=old_recurrence,
                    old_start_time=old_start_time,
                    old_end_time=old_end_time
                )
            
            session.commit()
            # Fetch all assignments for this task with task eagerly loaded
            assignments = session.query(Assignment).options(joinedload(Assignment.task)).filter(Assignment.task_id == task.id).all()
            return {
                'task': serialize_task(task),
                'assignments': [serialize_assignment(a, task) for a in assignments]
            }, 200

        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, task_id):
        """Delete a task and its future assignments."""
        session = next(get_db())
        try:
            task = session.get(Task, task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            
            # Delete future unstarted assignments
            future_assignments = session.query(Assignment).filter(
                Assignment.task_id == task.id,
                Assignment.date >= date.today(),
                Assignment.status == 'UNASSIGNED'
            ).all()
            for assignment in future_assignments:
                session.delete(assignment)
            
            # Delete the task
            session.delete(task)
            session.commit()
            return '', 204
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# --- Teacher Aide Endpoints ---

class TeacherAideListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            aides = session.query(TeacherAide).all()
            return [serialize_aide(aide) for aide in aides], 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            if 'name' not in data:
                return error_response('VALIDATION_ERROR', 'Missing required field: name', 422)
            
            # Validate colour_hex if provided
            if 'colour_hex' in data:
                if not data['colour_hex'].startswith('#') or len(data['colour_hex']) != 7:
                    return error_response('VALIDATION_ERROR', 'Invalid colour_hex format. Use #RRGGBB', 422)
            
            # Create aide
            aide = TeacherAide(
                name=data['name'],
                qualifications=data.get('qualifications'),
                colour_hex=data.get('colour_hex', '#000000')
            )
            session.add(aide)
            session.commit()
            
            return serialize_aide(aide), 201
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class TeacherAideResource(Resource):
    def get(self, aide_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            return serialize_aide(aide), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, aide_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'name' in data:
                aide.name = data['name']
            if 'qualifications' in data:
                aide.qualifications = data['qualifications']
            if 'colour_hex' in data:
                if not data['colour_hex'].startswith('#') or len(data['colour_hex']) != 7:
                    return error_response('VALIDATION_ERROR', 'Invalid colour_hex format. Use #RRGGBB', 422)
                aide.colour_hex = data['colour_hex']
            
            session.commit()
            return serialize_aide(aide), 200
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, aide_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            # Check for existing assignments
            assignments = session.query(Assignment).filter(Assignment.aide_id == aide_id).first()
            if assignments:
                return error_response('CONFLICT', 'Cannot delete aide with existing assignments', 409)
            
            # Delete availability records
            session.query(Availability).filter(Availability.aide_id == aide_id).delete()
            
            # Delete the aide
            session.delete(aide)
            session.commit()
            return '', 204
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# --- Availability Endpoints ---

class AvailabilityListResource(Resource):
    def get(self, aide_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            availabilities = session.query(Availability).filter(Availability.aide_id == aide_id).all()
            return [serialize_availability(avail) for avail in availabilities], 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self, aide_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['weekday', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate weekday
            if data['weekday'] not in ['MO', 'TU', 'WE', 'TH', 'FR']:
                return error_response('VALIDATION_ERROR', 'Invalid weekday. Use MO, TU, WE, TH, FR', 422)
            
            # Validate times
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
            
            if start_time >= end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Check for time range
            if start_time < time(8, 0) or end_time > time(16, 0):
                return error_response('VALIDATION_ERROR', 'Times must be between 08:00 and 16:00', 422)
            
            # Check for duplicate weekday
            existing = session.query(Availability).filter(
                Availability.aide_id == aide_id,
                Availability.weekday == data['weekday']
            ).first()
            if existing:
                return error_response('CONFLICT', 'Availability already exists for this weekday', 409)
            
            # Create availability
            availability = Availability(
                aide_id=aide_id,
                weekday=data['weekday'],
                start_time=start_time,
                end_time=end_time
            )
            session.add(availability)
            session.commit()
            
            return serialize_availability(availability), 201
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AvailabilityResource(Resource):
    def put(self, aide_id, avail_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            availability = session.get(Availability, avail_id)
            if not availability or availability.aide_id != aide_id:
                return error_response('NOT_FOUND', 'Availability not found', 404)
            
            data = request.get_json(force=True)
            
            # Update times if provided
            if 'start_time' in data:
                try:
                    availability.start_time = time.fromisoformat(data['start_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid start_time format. Use HH:MM', 422)
            
            if 'end_time' in data:
                try:
                    availability.end_time = time.fromisoformat(data['end_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid end_time format. Use HH:MM', 422)
            
            # Validate time range
            if availability.start_time >= availability.end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            if availability.start_time < time(8, 0) or availability.end_time > time(16, 0):
                return error_response('VALIDATION_ERROR', 'Times must be between 08:00 and 16:00', 422)
            
            session.commit()
            return serialize_availability(availability), 200
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, aide_id, avail_id):
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            availability = session.get(Availability, avail_id)
            if not availability or availability.aide_id != aide_id:
                return error_response('NOT_FOUND', 'Availability not found', 404)
            
            session.delete(availability)
            session.commit()
            return '', 204
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# --- Assignment Endpoints ---

class AssignmentListResource(Resource):
    def get(self):
        """Get all assignments with filtering."""
        session = next(get_db())
        try:
            # Build query with eager loading
            query = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            )
            
            # Apply filters
            if 'week' in request.args:
                try:
                    week = request.args['week']
                    year, week_num = map(int, week.split('-W'))
                    start_date = date.fromisocalendar(year, week_num, 1)
                    end_date = date.fromisocalendar(year, week_num, 7)
                    query = query.filter(Assignment.date.between(start_date, end_date))
                except (ValueError, IndexError):
                    return error_response('VALIDATION_ERROR', 'Invalid week format. Use YYYY-WW', 422)
            
            if 'status' in request.args:
                status = request.args['status'].upper()
                if status not in [s.value for s in Status]:
                    return error_response('VALIDATION_ERROR', f'Invalid status: {status}', 422)
                query = query.filter(Assignment.status == status)
            
            if 'start_date' in request.args:
                try:
                    start_date = date.fromisoformat(request.args['start_date'])
                    query = query.filter(Assignment.date >= start_date)
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid start_date format. Use YYYY-MM-DD', 422)
            
            if 'end_date' in request.args:
                try:
                    end_date = date.fromisoformat(request.args['end_date'])
                    query = query.filter(Assignment.date <= end_date)
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid end_date format. Use YYYY-MM-DD', 422)
            
            if 'aide_id' in request.args:
                query = query.filter(Assignment.aide_id == request.args['aide_id'])
            
            if 'task_id' in request.args:
                query = query.filter(Assignment.task_id == request.args['task_id'])
            
            # Apply pagination
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 50))
            assignments = query.order_by(Assignment.date, Assignment.start_time).offset((page - 1) * per_page).limit(per_page).all()
            
            return {
                'assignments': [serialize_assignment(a) for a in assignments],
                'page': page,
                'per_page': per_page,
                'total': query.count()
            }, 200
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)
    
    def post(self):
        """Create a new assignment."""
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            logger.info("POST /assignments payload: %s", data)
            
            # Validate required fields
            required_fields = ['task_id', 'date', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    logger.warning("/assignments missing field: %s in %s", field, data)
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate task exists with eager loading
            task = session.query(Task).options(
                joinedload(Task.assignments)
            ).get(data['task_id'])
            if not task:
                logger.warning("/assignments task not found: %s", data.get('task_id'))
                return error_response('NOT_FOUND', 'Task not found', 404)
            
            # Validate aide if provided
            aide = None
            if 'aide_id' in data:
                aide = session.query(TeacherAide).options(
                    joinedload(TeacherAide.assignments)
                ).get(data['aide_id'])
                if not aide:
                    logger.warning("/assignments aide not found: %s", data.get('aide_id'))
                    return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            # Validate date format
            try:
                assignment_date = date.fromisoformat(data['date'])
            except ValueError:
                logger.warning("/assignments invalid date: %s", data.get('date'))
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            # Validate time format
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                logger.warning("/assignments invalid time(s): start=%s end=%s", data.get('start_time'), data.get('end_time'))
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
            
            if start_time >= end_time:
                logger.warning("/assignments start_time >= end_time: start=%s end=%s", data.get('start_time'), data.get('end_time'))
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Check for conflicts if aide is assigned
            if aide:
                conflicts = session.query(Assignment).options(
                    joinedload(Assignment.task),
                    joinedload(Assignment.aide)
                ).filter(
                    Assignment.aide_id == aide.id,
                    Assignment.date == assignment_date,
                    or_(
                        and_(Assignment.start_time <= start_time, start_time < Assignment.end_time),
                        and_(Assignment.start_time < end_time, end_time <= Assignment.end_time),
                        and_(start_time <= Assignment.start_time, Assignment.start_time < end_time)
                    )
                ).all()
                
                if conflicts:
                    logger.info("/assignments conflict detected for aide_id=%s date=%s", aide.id, assignment_date)
                    # Include conflicting assignments in response to help client resolve
                    serialized_conflicts = []
                    for c in conflicts:
                        try:
                            session.refresh(c)
                            if c.task:
                                session.refresh(c.task)
                        except Exception:
                            pass
                        task_title = c.task.title if getattr(c, 'task', None) else None
                        serialized_conflicts.append(serialize_assignment(c, task_title=task_title))
                    return {
                        'error': {
                            'code': 'CONFLICT',
                            'message': 'Teacher aide has a scheduling conflict'
                        },
                        # prefer singular for backwards-compat and also provide list
                        'conflicting_assignment': serialized_conflicts[0],
                        'conflicts': serialized_conflicts
                    }, 409
            
            # Create assignment
            assignment = Assignment(
                task_id=task.id,
                aide_id=aide.id if aide else None,
                date=assignment_date,
                start_time=start_time,
                end_time=end_time,
                status='ASSIGNED' if aide else 'UNASSIGNED'
            )
            
            session.add(assignment)
            session.flush()  # Get ID without committing
            
            # Ensure relationships are loaded
            session.refresh(assignment)
            
            # Commit the transaction
            session.commit()
            
            return serialize_assignment(assignment), 201
            
        except Exception as e:
            session.rollback()
            logger.exception("/assignments error: %s | payload=%s", str(e), request.get_json(silent=True))
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentResource(Resource):
    def get(self, assignment_id):
        """Get a single assignment by ID."""
        session = next(get_db())
        try:
            assignment = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).get(assignment_id)
            
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            return serialize_assignment(assignment), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def patch(self, assignment_id):
        """Update an assignment."""
        session = next(get_db())
        try:
            # Load assignment with relationships
            assignment = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).get(assignment_id)
            
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'aide_id' in data:
                if data['aide_id']:
                    # Load aide with relationships
                    aide = session.query(TeacherAide).options(
                        joinedload(TeacherAide.assignments)
                    ).get(data['aide_id'])
                    if not aide:
                        return error_response('NOT_FOUND', 'Teacher aide not found', 404)
                assignment.aide_id = data['aide_id']
            
            if 'start_time' in data:
                try:
                    assignment.start_time = time.fromisoformat(data['start_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid start_time format. Use HH:MM', 422)
            
            if 'end_time' in data:
                try:
                    assignment.end_time = time.fromisoformat(data['end_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid end_time format. Use HH:MM', 422)
            
            if 'status' in data:
                if data['status'] not in ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE']:
                    return error_response('VALIDATION_ERROR', 'Invalid status', 422)
                assignment.status = data['status']
            
            # Validate times
            if assignment.start_time >= assignment.end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Check for conflicts if aide or times changed
            if 'aide_id' in data or 'start_time' in data or 'end_time' in data:
                conflicts = session.query(Assignment).options(
                    joinedload(Assignment.task),
                    joinedload(Assignment.aide)
                ).filter(
                    Assignment.id != assignment_id,
                    Assignment.aide_id == assignment.aide_id,
                    Assignment.date == assignment.date,
                    or_(
                        and_(Assignment.start_time <= assignment.start_time, assignment.start_time < Assignment.end_time),
                        and_(Assignment.start_time < assignment.end_time, assignment.end_time <= Assignment.end_time),
                        and_(assignment.start_time <= Assignment.start_time, Assignment.start_time < assignment.end_time)
                    )
                ).all()
                
                if conflicts:
                    serialized_conflicts = []
                    for c in conflicts:
                        try:
                            session.refresh(c)
                            if c.task:
                                session.refresh(c.task)
                        except Exception:
                            pass
                        task_title = c.task.title if getattr(c, 'task', None) else None
                        serialized_conflicts.append(serialize_assignment(c, task_title=task_title))
                    return {
                        'error': {
                            'code': 'CONFLICT',
                            'message': 'Assignment conflicts with existing assignment'
                        },
                        'conflicting_assignment': serialized_conflicts[0],
                        'conflicts': serialized_conflicts
                    }, 409
            
            session.flush()  # Get updated state without committing
            
            # Reload assignment with relationships before committing
            assignment = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).get(assignment_id)
            
            session.commit()
            return serialize_assignment(assignment), 200
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentReplaceResource(Resource):
    def post(self):
        """Atomically unassign a conflicting assignment and create or update the desired assignment.

        Request JSON:
        {
          "conflicting_assignment_id": int,
          "aide_id": int,
          "date": "YYYY-MM-DD",
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "task_id": int,                        # required if creating new assignment
          "existing_assignment_id": int         # optional; if provided, update this assignment instead of creating
        }
        """
        session = next(get_db())
        try:
            data = request.get_json(force=True) or {}

            # Validate payload basics
            required = ["conflicting_assignment_id", "aide_id", "date", "start_time", "end_time"]
            for f in required:
                if f not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {f}', 422)

            # Parse inputs
            conflicting_id = int(data["conflicting_assignment_id"]) if data.get("conflicting_assignment_id") is not None else None
            aide_id = int(data["aide_id"]) if data.get("aide_id") is not None else None
            try:
                target_date = date.fromisoformat(str(data["date"]))
                target_start = time.fromisoformat(str(data["start_time"]))
                target_end = time.fromisoformat(str(data["end_time"]))
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date or time format', 422)

            if target_start >= target_end:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)

            existing_assignment_id = data.get("existing_assignment_id")
            task_id = data.get("task_id")

            # Load entities
            conflicting = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).get(conflicting_id)
            if not conflicting:
                return error_response('NOT_FOUND', 'Conflicting assignment not found', 404)

            aide = session.query(TeacherAide).get(aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)

            # Ensure we either create from task or update an existing assignment
            target_assignment = None
            if existing_assignment_id is not None:
                target_assignment = session.query(Assignment).options(
                    joinedload(Assignment.task),
                    joinedload(Assignment.aide)
                ).get(existing_assignment_id)
                if not target_assignment:
                    return error_response('NOT_FOUND', 'Existing assignment not found', 404)
            else:
                if task_id is None:
                    return error_response('VALIDATION_ERROR', 'task_id is required when creating a new assignment', 422)
                task = session.query(Task).get(task_id)
                if not task:
                    return error_response('NOT_FOUND', 'Task not found', 404)

            # Check for other conflicts at target slot (exclude the known conflicting and the target itself)
            other_conflict = session.query(Assignment).filter(
                Assignment.aide_id == aide_id,
                Assignment.date == target_date,
                Assignment.id != conflicting_id,
                (Assignment.id != existing_assignment_id) if existing_assignment_id is not None else True,
                or_(
                    and_(Assignment.start_time <= target_start, target_start < Assignment.end_time),
                    and_(Assignment.start_time < target_end, target_end <= Assignment.end_time),
                    and_(target_start <= Assignment.start_time, Assignment.start_time < target_end)
                )
            ).first()
            if other_conflict:
                # Provide details to allow UI to continue resolution loop
                task_title = other_conflict.task.title if other_conflict.task else None
                return {
                    'error': {'code': 'CONFLICT', 'message': 'Another assignment conflicts with the target slot'},
                    'conflicting_assignment': serialize_assignment(other_conflict, task_title=task_title)
                }, 409

            # Perform atomic swap: unassign the conflicting one, then create/update target
            conflicting.aide_id = None
            conflicting.status = Status.UNASSIGNED

            if target_assignment is not None:
                # Update existing assignment
                target_assignment.aide_id = aide_id
                target_assignment.date = target_date
                target_assignment.start_time = target_start
                target_assignment.end_time = target_end
                target_assignment.status = Status.ASSIGNED
                session.flush()
                session.refresh(target_assignment)
                result_assignment = target_assignment
            else:
                # Create new assignment from task
                new_assignment = Assignment(
                    task_id=task.id,
                    aide_id=aide_id,
                    date=target_date,
                    start_time=target_start,
                    end_time=target_end,
                    status=Status.ASSIGNED
                )
                session.add(new_assignment)
                session.flush()
                session.refresh(new_assignment)
                result_assignment = new_assignment

            session.commit()

            # Serialize results
            try:
                session.refresh(conflicting)
                if conflicting.task:
                    session.refresh(conflicting.task)
            except Exception:
                pass

            return {
                'assignment': serialize_assignment(result_assignment),
                'unassigned': serialize_assignment(conflicting)
            }, 200

        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, assignment_id):
        """Delete an assignment."""
        session = next(get_db())
        try:
            # Load assignment with relationships to ensure it exists
            assignment = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).get(assignment_id)
            
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            
            session.delete(assignment)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentBatchResource(Resource):
    def post(self):
        """Create multiple assignments in a batch."""
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['task_id', 'dates', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate task exists with eager loading
            task = session.query(Task).options(
                joinedload(Task.assignments)
            ).get(data['task_id'])
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            
            # Validate aide if provided
            aide = None
            if 'aide_id' in data:
                aide = session.query(TeacherAide).options(
                    joinedload(TeacherAide.assignments)
                ).get(data['aide_id'])
                if not aide:
                    return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            # Validate time format
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
            
            if start_time >= end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Validate dates
            try:
                dates = [date.fromisoformat(d) for d in data['dates']]
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            # Check for conflicts if aide is assigned
            if aide:
                conflicts = session.query(Assignment).options(
                    joinedload(Assignment.task),
                    joinedload(Assignment.aide)
                ).filter(
                    Assignment.aide_id == aide.id,
                    Assignment.date.in_(dates),
                    or_(
                        and_(Assignment.start_time <= start_time, start_time < Assignment.end_time),
                        and_(Assignment.start_time < end_time, end_time <= Assignment.end_time),
                        and_(start_time <= Assignment.start_time, Assignment.start_time < end_time)
                    )
                ).all()
                
                if conflicts:
                    return error_response('CONFLICT', 'Teacher aide has scheduling conflicts', 409)
            
            # Create assignments
            assignments = []
            for d in dates:
                assignment = Assignment(
                    task_id=task.id,
                    aide_id=aide.id if aide else None,
                    date=d,
                    start_time=start_time,
                    end_time=end_time,
                    status=Status.ASSIGNED if aide else Status.UNASSIGNED
                )
                session.add(assignment)
                assignments.append(assignment)
            
            session.flush()  # Get IDs without committing
            
            # Ensure relationships are loaded
            for assignment in assignments:
                session.refresh(assignment)
            
            session.commit()
            
            return {
                'assignments': [serialize_assignment(a) for a in assignments]
            }, 201
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentCheckResource(Resource):
    def post(self):
        """Check for assignment conflicts for an aide on a given date and time."""
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            required_fields = ["aide_id", "date", "start_time", "end_time"]
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)

            # Validate aide exists with eager loading
            aide = session.query(TeacherAide).options(
                joinedload(TeacherAide.assignments)
            ).get(data["aide_id"])
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)

            # Validate date and time
            try:
                check_date = date.fromisoformat(data["date"])
                start_time = time.fromisoformat(data["start_time"])
                end_time = time.fromisoformat(data["end_time"])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date or time format', 422)
            if start_time >= end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)

            # Eagerly load all necessary relationships for conflict check
            conflict = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).filter(
                Assignment.aide_id == data["aide_id"],
                Assignment.date == check_date,
                or_(
                    and_(Assignment.start_time <= start_time, Assignment.end_time > start_time),
                    and_(Assignment.start_time < end_time, Assignment.end_time >= end_time),
                    and_(Assignment.start_time >= start_time, Assignment.start_time < end_time)
                )
            ).first()

            if conflict:
                # Ensure all relationships are loaded and attached to session
                session.refresh(conflict)
                if conflict.task:
                    session.refresh(conflict.task)
                if conflict.aide:
                    session.refresh(conflict.aide)
                # Extract task_title as a plain string before session closes
                task_title = conflict.task.title if conflict.task else None
                conflict_data = serialize_assignment(conflict, task_title=task_title)
                return {"has_conflict": True, "conflicting_assignment": conflict_data}, 200
            else:
                return {"has_conflict": False}, 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class HorizonExtensionResource(Resource):
    def post(self):
        """Extend the assignment horizon by generating new assignments."""
        session = next(get_db())
        try:
            data = request.get_json(silent=True) or {}
            horizon_weeks = data.get('horizon_weeks', DEFAULT_HORIZON_WEEKS)
            
            # Validate horizon_weeks
            try:
                horizon_weeks = int(horizon_weeks)
                if not 1 <= horizon_weeks <= 10:
                    return error_response('VALIDATION_ERROR', 'horizon_weeks must be between 1 and 10', 422)
            except (TypeError, ValueError):
                return error_response('VALIDATION_ERROR', 'horizon_weeks must be an integer', 422)
            
            # Get all recurring tasks
            tasks = session.query(Task).filter(Task.recurrence_rule.isnot(None)).all()
            
            # Generate assignments for each task
            total_assignments = 0
            for task in tasks:
                if task.expires_on and task.expires_on < date.today():
                    continue
                    
                start_date = date.today()
                end_date = start_date + timedelta(weeks=horizon_weeks)
                assignments = task.generate_assignments(start_date, end_date, session)
                total_assignments += len(assignments)
            
            session.commit()
            
            return {
                'assignments_created': total_assignments,
                'tasks_processed': len(tasks)
            }, 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# --- Absence Endpoints ---

class AbsenceListResource(Resource):
    def get(self, aide_id):
        """Get all absences for a teacher aide."""
        session = next(get_db())
        try:
            aide = session.get(TeacherAide, aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            absences = session.query(Absence).filter_by(aide_id=aide_id).all()
            return [serialize_absence(absence) for absence in absences], 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self, aide_id):
        """Create a new absence and unassign affected assignments."""
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['start_date', 'end_date', 'reason']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate aide exists
            aide = session.query(TeacherAide).get(aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            # Validate dates
            try:
                start_date = date.fromisoformat(data['start_date'])
                end_date = date.fromisoformat(data['end_date'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            if start_date > end_date:
                return error_response('VALIDATION_ERROR', 'start_date must be before end_date', 422)
            
            # Check for overlapping absences
            overlapping = session.query(Absence).filter(
                Absence.aide_id == aide_id,
                or_(
                    and_(Absence.start_date <= start_date, start_date <= Absence.end_date),
                    and_(Absence.start_date <= end_date, end_date <= Absence.end_date),
                    and_(start_date <= Absence.start_date, Absence.start_date <= end_date)
                )
            ).first()
            
            if overlapping:
                return error_response('CONFLICT', 'Absence overlaps with existing absence', 409)
            
            # Create absence
            absence = Absence(
                aide_id=aide_id,
                start_date=start_date,
                end_date=end_date,
                reason=data['reason']
            )
            session.add(absence)
            session.flush()
            
            # Release affected assignments using the model method
            released_assignments = absence.release_assignments(session)
            
            session.commit()
            
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
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AbsenceResource(Resource):
    def delete(self, aide_id: int, absence_id: int):
        """Delete an absence and reassign affected assignments."""
        session = next(get_db())
        try:
            # Validate aide exists
            aide = session.query(TeacherAide).get(aide_id)
            if not aide:
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            
            # Get absence with eager loading
            absence = session.query(Absence).options(
                joinedload(Absence.assignments)
            ).get(absence_id)
            if not absence:
                return error_response('NOT_FOUND', 'Absence not found', 404)
            
            # Get affected assignments
            affected_assignments = absence.assignments
            
            # Delete absence
            session.delete(absence)
            session.flush()
            
            # Reassign affected assignments
            for assignment in affected_assignments:
                assignment.aide_id = None
                assignment.status = Status.UNASSIGNED
            
            session.commit()
            return '', 204
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# Register routes
api.add_resource(TaskListResource, '/tasks')
api.add_resource(TaskResource, '/tasks/<int:task_id>')
api.add_resource(TeacherAideListResource, '/teacher-aides')
api.add_resource(TeacherAideResource, '/teacher-aides/<int:aide_id>')
api.add_resource(AvailabilityListResource, '/teacher-aides/<int:aide_id>/availability')
api.add_resource(AvailabilityResource, '/teacher-aides/<int:aide_id>/availability/<int:avail_id>')
api.add_resource(AssignmentListResource, '/assignments')
api.add_resource(AssignmentResource, '/assignments/<int:assignment_id>')
api.add_resource(AssignmentReplaceResource, '/assignments/replace')
api.add_resource(AssignmentBatchResource, '/assignments/batch')
api.add_resource(AssignmentCheckResource, '/assignments/check')
api.add_resource(HorizonExtensionResource, '/assignments/extend-horizon')
api.add_resource(AbsenceListResource, '/teacher-aides/<int:aide_id>/absences')
api.add_resource(AbsenceResource, '/teacher-aides/<int:aide_id>/absences/<int:absence_id>')

@api_bp.route('/health')
def health_check():
    return jsonify({"status": "healthy"}), 200
