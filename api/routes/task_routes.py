from flask_restful import Resource
from flask import request
from api.models import Task, SchoolClass
from api.db import get_db
from datetime import datetime, date, time
from sqlalchemy.orm import joinedload
from .utils import error_response, serialize_task
from api.recurrence import update_future_assignments

class TaskListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            # Get filter parameters
            category = request.args.get('category')
            status = request.args.get('status')
            
            # Build query
            query = session.query(Task).options(
                joinedload(Task.classroom),
                joinedload(Task.school_class)
            )
            
            if category:
                query = query.filter_by(category=category)
            if status:
                query = query.filter_by(status=status)
            
            # Get pagination parameters
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
            
            # Get total count
            total = query.count()
            
            # Get paginated results
            tasks = query.order_by(Task.title)\
                .offset((page - 1) * per_page)\
                .limit(per_page)\
                .all()
            
            return {
                'tasks': [serialize_task(task) for task in tasks],
                'total': total,
                'page': page,
                'per_page': per_page,
                'pages': (total + per_page - 1) // per_page
            }, 200
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
            
            # Validate time format
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
            
            # Validate time logic
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
                school_class_id=school_class_id,
                notes=data.get('notes'),
                status=data.get('status', 'ACTIVE')
            )
            
            session.add(task)
            session.commit()

            return {'task': serialize_task(task)}, 201
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
            return {'task': serialize_task(task)}, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, task_id):
        session = next(get_db())
        try:
            task = session.query(Task).get(task_id)
            if not task:
                return error_response('NOT_FOUND', f'Task {task_id} not found', 404)
            
            data = request.get_json(force=True)
            
            # Store old values for comparison
            old_recurrence = task.recurrence_rule
            old_start_time = task.start_time
            old_end_time = task.end_time
            
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
            if 'school_class_id' in data:
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
            
            # Update future assignments if this is a recurring task and relevant fields changed
            assignments_updated = 0
            if task.recurrence_rule and (
                old_recurrence != task.recurrence_rule or
                old_start_time != task.start_time or
                old_end_time != task.end_time
            ):
                assignments_updated = update_future_assignments(
                    task, session, 
                    old_recurrence=old_recurrence,
                    old_start_time=old_start_time,
                    old_end_time=old_end_time
                )
            
            session.commit()

            response = {'task': serialize_task(task)}
            if assignments_updated > 0:
                response['assignments_updated'] = assignments_updated

            return response, 200
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
