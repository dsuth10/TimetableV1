from flask import Blueprint, jsonify, request, abort
from flask_restful import Api, Resource
from sqlalchemy.orm import scoped_session
from api.models import TeacherAide, Availability, Task, Assignment, Classroom
from api.db import get_db
from datetime import time, date, datetime, timedelta
from dateutil.rrule import rrulestr
from typing import Optional
from sqlalchemy import func
import logging

api_bp = Blueprint('api', __name__)
api = Api(api_bp)

logger = logging.getLogger(__name__)

def error_response(code: str, message: str, status_code: int = 400):
    return {
        "error": {
            "code": code,
            "message": message
        }
    }, status_code

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

def serialize_assignment(assignment):
    return {
        'id': assignment.id,
        'task_id': assignment.task_id,
        'aide_id': assignment.aide_id,
        'date': assignment.date.isoformat(),
        'start_time': assignment.start_time.strftime('%H:%M'),
        'end_time': assignment.end_time.strftime('%H:%M'),
        'status': assignment.status,
        'created_at': assignment.created_at.isoformat() if assignment.created_at else None,
        'updated_at': assignment.updated_at.isoformat() if assignment.updated_at else None
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
                status='UNASSIGNED'
            )
            
            session.add(task)
            session.commit()
            
            # Generate assignments if recurrence rule is provided
            if task.recurrence_rule:
                try:
                    start_date = date.today()
                    end_date = task.expires_on if task.expires_on else (start_date + timedelta(weeks=4))
                    assignments = task.generate_assignments(start_date, end_date)
                    session.add_all(assignments)
                    session.commit()
                except Exception as e:
                    session.rollback()
                    return error_response('VALIDATION_ERROR', f'Invalid recurrence rule: {str(e)}', 422)
            
            result = serialize_task(task)
            return result, 201
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class TaskResource(Resource):
    def get(self, task_id):
        session = next(get_db())
        try:
            task = session.get(Task, task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            result = serialize_task(task)
            return result, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, task_id):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            task = session.get(Task, task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            # Replace all updatable fields
            task.title = data.get('title', task.title)
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
            if task.start_time >= task.end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            if 'recurrence_rule' in data:
                task.recurrence_rule = data['recurrence_rule']
            if 'expires_on' in data:
                try:
                    task.expires_on = date.fromisoformat(data['expires_on'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid expires_on format. Use YYYY-MM-DD', 422)
            if 'classroom_id' in data:
                if data['classroom_id']:
                    classroom = session.get(Classroom, data['classroom_id'])
                    if not classroom:
                        return error_response('NOT_FOUND', 'Classroom not found', 404)
                task.classroom_id = data['classroom_id']
            if 'notes' in data:
                task.notes = data['notes']
            if 'status' in data:
                if data['status'] not in ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE']:
                    return error_response('VALIDATION_ERROR', 'Invalid status', 422)
                task.status = data['status']
            session.commit()
            result = serialize_task(task)
            return result, 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def patch(self, task_id):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            task = session.get(Task, task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            # Update fields if provided
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
            if task.start_time >= task.end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            recurrence_rule_updated = False
            if 'recurrence_rule' in data:
                task.recurrence_rule = data['recurrence_rule']
                recurrence_rule_updated = True
            if 'expires_on' in data:
                try:
                    task.expires_on = date.fromisoformat(data['expires_on'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid expires_on format. Use YYYY-MM-DD', 422)
            if 'classroom_id' in data:
                if data['classroom_id']:
                    classroom = session.get(Classroom, data['classroom_id'])
                    if not classroom:
                        return error_response('NOT_FOUND', 'Classroom not found', 404)
                task.classroom_id = data['classroom_id']
            if 'notes' in data:
                task.notes = data['notes']
            if 'status' in data:
                if data['status'] not in ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE']:
                    return error_response('VALIDATION_ERROR', 'Invalid status', 422)
                task.status = data['status']
            session.commit()
            # Regenerate assignments if recurrence rule is updated
            if recurrence_rule_updated:
                try:
                    # Delete old assignments for this task
                    session.query(Assignment).filter(Assignment.task_id == task_id).delete()
                    session.commit()
                    # Refresh the task object from the session
                    session.refresh(task)
                    start_date = date.today()
                    end_date = task.expires_on if task.expires_on else (start_date + timedelta(weeks=4))
                    assignments = task.generate_assignments(start_date, end_date)
                    # Ensure task_id is set correctly
                    for a in assignments:
                        a.task_id = task.id
                    session.add_all(assignments)
                    session.commit()
                except Exception as e:
                    session.rollback()
                    return error_response('VALIDATION_ERROR', f'Invalid recurrence rule: {str(e)}', 422)
            result = serialize_task(task)
            return result, 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, task_id):
        session = next(get_db())
        try:
            task = session.get(Task, task_id)
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            
            # Delete all future assignments
            future_assignments = session.query(Assignment).filter(
                Assignment.task_id == task_id,
                Assignment.date >= date.today()
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
        aides = session.query(TeacherAide).all()
        result = [serialize_aide(a) for a in aides]
        return result, 200

    def post(self):
        data = request.get_json(force=True)
        # Validation
        if not data.get('name') or not data.get('colour_hex'):
            return {'error': 'Missing required fields: name, colour_hex'}, 400
        if not isinstance(data['colour_hex'], str) or not data['colour_hex'].startswith('#') or len(data['colour_hex']) != 7:
            return {'error': 'colour_hex must be a string like #RRGGBB'}, 400
        session = next(get_db())
        aide = TeacherAide(
            name=data['name'],
            qualifications=data.get('qualifications', ''),
            colour_hex=data['colour_hex']
        )
        session.add(aide)
        session.commit()
        result = serialize_aide(aide)
        return result, 201

class TeacherAideResource(Resource):
    def get(self, aide_id):
        session = next(get_db())
        aide = session.get(TeacherAide, aide_id)
        if not aide:
            return {'error': 'Not found'}, 404
        result = serialize_aide(aide)
        return result, 200

    def put(self, aide_id):
        data = request.get_json(force=True)
        session = next(get_db())
        aide = session.get(TeacherAide, aide_id)
        if not aide:
            return {'error': 'Not found'}, 404
        if 'name' in data:
            aide.name = data['name']
        if 'qualifications' in data:
            aide.qualifications = data['qualifications']
        if 'colour_hex' in data:
            if not isinstance(data['colour_hex'], str) or not data['colour_hex'].startswith('#') or len(data['colour_hex']) != 7:
                return {'error': 'colour_hex must be a string like #RRGGBB'}, 400
            aide.colour_hex = data['colour_hex']
        session.commit()
        result = serialize_aide(aide)
        return result, 200

    def delete(self, aide_id):
        session = next(get_db())
        aide = session.get(TeacherAide, aide_id)
        if not aide:
            return {'error': 'Not found'}, 404
        session.delete(aide)
        session.commit()
        return '', 204

# --- Availability Endpoints ---

class AvailabilityListResource(Resource):
    def get(self, aide_id):
        session = next(get_db())
        aide = session.get(TeacherAide, aide_id)
        if not aide:
            return {'error': 'Aide not found'}, 404
        result = [serialize_availability(a) for a in aide.availabilities]
        return result, 200

    def post(self, aide_id):
        data = request.get_json(force=True)
        session = next(get_db())
        aide = session.get(TeacherAide, aide_id)
        if not aide:
            return {'error': 'Aide not found'}, 404
        # Validate input
        weekday = data.get('weekday')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        if weekday not in ['MO', 'TU', 'WE', 'TH', 'FR']:
            return {'error': 'weekday must be one of MO, TU, WE, TH, FR'}, 400
        try:
            st = time.fromisoformat(start_time)
            et = time.fromisoformat(end_time)
        except Exception:
            return {'error': 'start_time and end_time must be in HH:MM format'}, 400
        if st >= et or st < time(8,0) or et > time(16,0):
            return {'error': 'start_time must be before end_time and within 08:00-16:00'}, 400
        # Check for unique constraint
        existing = session.query(Availability).filter_by(aide_id=aide_id, weekday=weekday).first()
        if existing:
            return {'error': 'Availability for this weekday already exists'}, 400
        avail = Availability(
            aide_id=aide_id,
            weekday=weekday,
            start_time=st,
            end_time=et
        )
        session.add(avail)
        session.commit()
        result = serialize_availability(avail)
        return result, 201

class AvailabilityResource(Resource):
    def put(self, aide_id, avail_id):
        data = request.get_json(force=True)
        session = next(get_db())
        avail = session.query(Availability).filter_by(id=avail_id, aide_id=aide_id).first()
        if not avail:
            return {'error': 'Availability not found'}, 404
        if 'weekday' in data:
            if data['weekday'] not in ['MO', 'TU', 'WE', 'TH', 'FR']:
                return {'error': 'weekday must be one of MO, TU, WE, TH, FR'}, 400
            avail.weekday = data['weekday']
        if 'start_time' in data:
            try:
                st = time.fromisoformat(data['start_time'])
            except Exception:
                return {'error': 'start_time must be in HH:MM format'}, 400
            avail.start_time = st
        if 'end_time' in data:
            try:
                et = time.fromisoformat(data['end_time'])
            except Exception:
                return {'error': 'end_time must be in HH:MM format'}, 400
            avail.end_time = et
        if avail.start_time >= avail.end_time or avail.start_time < time(8,0) or avail.end_time > time(16,0):
            return {'error': 'start_time must be before end_time and within 08:00-16:00'}, 400
        session.commit()
        result = serialize_availability(avail)
        return result, 200

    def delete(self, aide_id, avail_id):
        session = next(get_db())
        avail = session.query(Availability).filter_by(id=avail_id, aide_id=aide_id).first()
        if not avail:
            return {'error': 'Availability not found'}, 404
        session.delete(avail)
        session.commit()
        return '', 204

# --- Assignment Endpoints ---

class AssignmentListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            # Get filter parameters
            week = request.args.get('week')  # Format: YYYY-WW
            aide_id = request.args.get('aide_id')
            status = request.args.get('status')
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 20))
            
            # Build query
            query = session.query(Assignment)
            
            if week:
                try:
                    year, week_num = map(int, week.split('-'))
                    # Calculate start and end dates for the week
                    start_date = date.fromisocalendar(year, week_num, 1)
                    end_date = date.fromisocalendar(year, week_num, 7)
                    query = query.filter(Assignment.date.between(start_date, end_date))
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid week format. Use YYYY-WW', 422)
            
            if aide_id:
                query = query.filter(Assignment.aide_id == aide_id)
            if status:
                query = query.filter(Assignment.status == status)
            
            # Get total count
            total = query.count()
            
            # Apply pagination
            assignments = query.offset((page - 1) * per_page).limit(per_page).all()
            
            result = {
                "assignments": [serialize_assignment(assignment) for assignment in assignments],
                "total": total,
                "page": page,
                "per_page": per_page
            }
            return result, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self):
        logger.debug("Received POST request to /api/assignments")
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            logger.debug(f"Request data: {data}")
            # Validate required fields
            required_fields = ['task_id', 'date', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    logger.error(f"Missing required field: {field}")
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            # Validate task exists
            task = session.get(Task, data['task_id'])
            if not task:
                logger.error(f"Task not found: {data['task_id']}")
                return error_response('NOT_FOUND', 'Task not found', 404)
            # Validate times
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
                assignment_date = date.fromisoformat(data['date'])
            except ValueError:
                logger.error("Invalid date/time format")
                return error_response('VALIDATION_ERROR', 'Invalid date/time format', 422)
            if start_time >= end_time:
                logger.error("start_time must be before end_time")
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            # Create assignment
            assignment = Assignment(
                task_id=data['task_id'],
                aide_id=data.get('aide_id'),
                date=assignment_date,
                start_time=start_time,
                end_time=end_time,
                status='UNASSIGNED'
            )
            # Check for conflicts if aide is assigned
            if assignment.aide_id:
                conflicts = assignment.check_conflicts(session)
                if conflicts:
                    logger.debug(f"Conflicts found: {conflicts}")
                    return error_response('CONFLICT', 'Assignment conflicts with existing assignments', 409)
            session.add(assignment)
            session.commit()
            logger.debug(f"Assignment created: {assignment}")
            result = serialize_assignment(assignment)
            return result, 201
        except Exception as e:
            logger.error(f"Internal error: {str(e)}")
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentBatchResource(Resource):
    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['task_id', 'start_date', 'end_date', 'recurrence_rule']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate task exists
            task = session.get(Task, data['task_id'])
            if not task:
                return error_response('NOT_FOUND', 'Task not found', 404)
            
            # Validate dates
            try:
                start_date = date.fromisoformat(data['start_date'])
                end_date = date.fromisoformat(data['end_date'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            if start_date > end_date:
                return error_response('VALIDATION_ERROR', 'start_date must be before end_date', 422)
            
            # Generate assignments based on recurrence rule
            try:
                from dateutil.rrule import rrulestr
                from datetime import datetime as dt
                
                dt_start = dt.combine(start_date, dt.min.time())
                dt_end = dt.combine(end_date, dt.max.time())
                rule = rrulestr(data['recurrence_rule'], dtstart=dt_start)
                dates = [d.date() for d in rule.between(dt_start, dt_end, inc=True)]
                
                assignments = []
                for d in dates:
                    assignment = Assignment(
                        task_id=data['task_id'],
                        aide_id=data.get('aide_id'),
                        date=d,
                        start_time=task.start_time,
                        end_time=task.end_time,
                        status='UNASSIGNED'
                    )
                    
                    # Check for conflicts if aide is assigned
                    if assignment.aide_id:
                        conflicts = assignment.check_conflicts(session)
                        if conflicts:
                            session.rollback()
                            return error_response('CONFLICT', 'Assignment conflicts with existing assignments', 409)
                    
                    assignments.append(assignment)
                
                session.add_all(assignments)
                session.commit()
                
                result = {
                    "assignments": [serialize_assignment(a) for a in assignments],
                    "total": len(assignments)
                }
                return result, 201
            except Exception as e:
                session.rollback()
                return error_response('VALIDATION_ERROR', f'Invalid recurrence rule: {str(e)}', 422)
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentCheckResource(Resource):
    def post(self):
        logger.debug("Received POST request to /api/assignments/check")
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            logger.debug(f"Request data: {data}")
            # Validate required fields
            required_fields = ['aide_id', 'date', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    logger.error(f"Missing required field: {field}")
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            # Validate aide exists
            aide = session.get(TeacherAide, data['aide_id'])
            if not aide:
                logger.error(f"Teacher aide not found: {data['aide_id']}")
                return error_response('NOT_FOUND', 'Teacher aide not found', 404)
            # Validate times
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
                check_date = date.fromisoformat(data['date'])
            except ValueError:
                logger.error("Invalid date/time format")
                return error_response('VALIDATION_ERROR', 'Invalid date/time format', 422)
            if start_time >= end_time:
                logger.error("start_time must be before end_time")
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            # Check for conflicts
            conflicts = session.query(Assignment).filter(
                Assignment.aide_id == data['aide_id'],
                Assignment.date == check_date,
                (
                    (Assignment.start_time <= start_time) & (start_time < Assignment.end_time) |
                    (Assignment.start_time < end_time) & (end_time <= Assignment.end_time) |
                    (start_time <= Assignment.start_time) & (Assignment.start_time < end_time)
                )
            ).all()
            if conflicts:
                logger.debug(f"Conflicts found: {conflicts}")
                result = {
                    "has_conflicts": True,
                    "conflicts": [serialize_assignment(c) for c in conflicts]
                }
                return result, 409
            else:
                logger.debug("No conflicts found")
                result = {
                    "has_conflicts": False,
                    "conflicts": []
                }
                return result, 200
        except Exception as e:
            logger.error(f"Internal error: {str(e)}")
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentResource(Resource):
    def get(self, assignment_id):
        session = next(get_db())
        try:
            assignment = session.get(Assignment, assignment_id)
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            result = serialize_assignment(assignment)
            return result, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def patch(self, assignment_id):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            assignment = session.get(Assignment, assignment_id)
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            
            # Update fields if provided
            if 'aide_id' in data:
                aide = session.get(TeacherAide, data['aide_id'])
                if not aide:
                    return error_response('NOT_FOUND', 'Teacher aide not found', 404)
                assignment.aide_id = data['aide_id']
            
            if 'status' in data:
                if data['status'] not in ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE']:
                    return error_response('VALIDATION_ERROR', 'Invalid status', 422)
                assignment.status = data['status']
            
            # Check for conflicts if aide_id changed
            if 'aide_id' in data:
                conflicts = assignment.check_conflicts(session)
                if conflicts:
                    return error_response('CONFLICT', 'Assignment conflicts with existing assignments', 409)
            
            session.commit()
            result = serialize_assignment(assignment)
            return result, 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, assignment_id):
        session = next(get_db())
        try:
            assignment = session.get(Assignment, assignment_id)
            if not assignment:
                return error_response('NOT_FOUND', 'Assignment not found', 404)
            
            session.delete(assignment)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

# Register resources
api.add_resource(TeacherAideListResource, '/teacher-aides')
api.add_resource(TeacherAideResource, '/teacher-aides/<int:aide_id>')
api.add_resource(AvailabilityListResource, '/teacher-aides/<int:aide_id>/availability')
api.add_resource(AvailabilityResource, '/teacher-aides/<int:aide_id>/availability/<int:avail_id>')
api.add_resource(TaskListResource, '/tasks')
api.add_resource(TaskResource, '/tasks/<int:task_id>')
api.add_resource(AssignmentListResource, '/assignments')
api.add_resource(AssignmentBatchResource, '/assignments/batch')
api.add_resource(AssignmentCheckResource, '/assignments/check')
api.add_resource(AssignmentResource, '/assignments/<int:assignment_id>')

@api_bp.route('/health')
def health_check():
    return jsonify({"status": "healthy"}) 