from flask_restful import Resource
from flask import request
from api.models import Task, SchoolClass # Import SchoolClass
from api.db import get_db
from datetime import date, time
from .utils import error_response, serialize_task
from sqlalchemy.orm import joinedload # Import joinedload

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
            
            # Build query, eagerly load classroom and school_class
            query = session.query(Task).options(
                joinedload(Task.classroom),
                joinedload(Task.school_class)
            )
            
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

            # Validate school_class_id if provided
            school_class_id = data.get('school_class_id')
            if school_class_id:
                school_class = session.query(SchoolClass).get(school_class_id)
                if not school_class:
                    return error_response('VALIDATION_ERROR', f'SchoolClass with ID {school_class_id} not found', 404)
            
            # Create task
            task = Task(
                title=data['title'],
                category=data['category'],
                start_time=start_time,
                end_time=end_time,
                recurrence_rule=data.get('recurrence_rule'),
                expires_on=date.fromisoformat(data['expires_on']) if data.get('expires_on') else None,
                classroom_id=data.get('classroom_id'),
                school_class_id=school_class_id, # Add school_class_id
                notes=data.get('notes'),
                status=data.get('status', 'ACTIVE')
            )
            
            session.add(task)
            session.commit()
            
            return serialize_task(task), 201
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
                return error_response('NOT_FOUND', f'Task {task_id} not found', 404)
            return serialize_task(task), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, task_id):
        session = next(get_db())
        try:
            task = session.query(Task).get(task_id)
            if not task:
                return error_response('NOT_FOUND', f'Task {task_id} not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
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
            if 'recurrence_rule' in data:
                task.recurrence_rule = data['recurrence_rule']
            if 'expires_on' in data:
                try:
                    task.expires_on = date.fromisoformat(data['expires_on'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid expires_on format. Use YYYY-MM-DD', 422)
            if 'classroom_id' in data:
                task.classroom_id = data['classroom_id']
            if 'school_class_id' in data: # Handle school_class_id update
                school_class_id = data['school_class_id']
                if school_class_id:
                    school_class = session.query(SchoolClass).get(school_class_id)
                    if not school_class:
                        return error_response('VALIDATION_ERROR', f'SchoolClass with ID {school_class_id} not found', 404)
                task.school_class_id = school_class_id
            if 'notes' in data:
                task.notes = data['notes']
            if 'status' in data:
                task.status = data['status']
            
            session.commit()
            return serialize_task(task), 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, task_id):
        session = next(get_db())
        try:
            task = session.query(Task).get(task_id)
            if not task:
                return error_response('NOT_FOUND', f'Task {task_id} not found', 404)
            
            session.delete(task)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)
