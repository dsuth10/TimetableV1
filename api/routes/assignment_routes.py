from flask_restful import Resource
from flask import request
from api.models import Assignment, Task, TeacherAide, Absence, Availability
from api.db import get_db
from datetime import datetime, timedelta
from .utils import error_response, serialize_assignment, serialize_absence, serialize_availability
from api.recurrence import extend_assignment_horizon, DEFAULT_HORIZON_WEEKS
from sqlalchemy import and_, or_

class AssignmentListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            # Get filter parameters
            task_id = request.args.get('task_id')
            aide_id = request.args.get('aide_id')
            status = request.args.get('status')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            # Build query
            query = session.query(Assignment)
            
            if task_id:
                query = query.filter_by(task_id=task_id)
            if aide_id:
                query = query.filter_by(aide_id=aide_id)
            if status:
                query = query.filter_by(status=status)
            if start_date:
                query = query.filter(Assignment.date >= datetime.fromisoformat(start_date))
            if end_date:
                query = query.filter(Assignment.date <= datetime.fromisoformat(end_date))
            
            # Get pagination parameters
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
            
            # Get total count
            total = query.count()
            
            # Get paginated results
            assignments = query.order_by(Assignment.date.desc())\
                .offset((page - 1) * per_page)\
                .limit(per_page)\
                .all()
            
            # Get task titles for serialization
            tasks_map = {t.id: t for t in session.query(Task).all()}
            
            return {
                'items': [serialize_assignment(a, tasks_map.get(a.task_id)) for a in assignments],
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
            required_fields = ['task_id', 'aide_id', 'date']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate task exists
            task = session.query(Task).get(data['task_id'])
            if not task:
                return error_response('NOT_FOUND', f'Task {data["task_id"]} not found', 404)
            
            # Validate aide exists
            aide = session.query(TeacherAide).get(data['aide_id'])
            if not aide:
                return error_response('NOT_FOUND', f'Teacher aide {data["aide_id"]} not found', 404)
            
            # Validate date format
            try:
                date = datetime.fromisoformat(data['date'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            # Check for existing assignment
            existing = session.query(Assignment).filter_by(
                task_id=data['task_id'],
                date=date
            ).first()
            
            if existing:
                return error_response('CONFLICT', 'Assignment already exists for this task and date', 409)
            
            # Create assignment
            assignment = Assignment(
                task_id=data['task_id'],
                aide_id=data['aide_id'],
                date=date,
                status='ASSIGNED'
            )
            
            session.add(assignment)
            session.commit()
            
            return serialize_assignment(assignment, task), 201
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentResource(Resource):
    def get(self, assignment_id):
        session = next(get_db())
        try:
            assignment = session.query(Assignment).get(assignment_id)
            
            if not assignment:
                return error_response('NOT_FOUND', f'Assignment {assignment_id} not found', 404)
            
            # Get task
            task = session.query(Task).get(assignment.task_id)
            
            return serialize_assignment(assignment, task), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, assignment_id):
        session = next(get_db())
        try:
            assignment = session.query(Assignment).get(assignment_id)
            
            if not assignment:
                return error_response('NOT_FOUND', f'Assignment {assignment_id} not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'aide_id' in data:
                # Validate aide exists
                aide = session.query(TeacherAide).get(data['aide_id'])
                if not aide:
                    return error_response('NOT_FOUND', f'Teacher aide {data["aide_id"]} not found', 404)
                assignment.aide_id = data['aide_id']
            
            if 'date' in data:
                try:
                    assignment.date = datetime.fromisoformat(data['date'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            if 'status' in data:
                # Validate status against allowed Assignment statuses
                from api.models import Assignment # Import Assignment model here to avoid circular import
                allowed_statuses = [s.value for s in Assignment.AssignmentStatus]
                if data['status'] not in allowed_statuses:
                    return error_response('VALIDATION_ERROR', f"Invalid status: {data['status']}. Allowed statuses are {', '.join(allowed_statuses)}", 422)
                assignment.status = data['status']
            
            session.commit()
            
            # Get task
            task = session.query(Task).get(assignment.task_id)
            
            return serialize_assignment(assignment, task), 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, assignment_id):
        session = next(get_db())
        try:
            assignment = session.query(Assignment).get(assignment_id)
            
            if not assignment:
                return error_response('NOT_FOUND', f'Assignment {assignment_id} not found', 404)
            
            session.delete(assignment)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentBatchResource(Resource):
    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['assignments']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate assignments array
            if not isinstance(data['assignments'], list):
                return error_response('VALIDATION_ERROR', 'assignments must be an array', 422)
            
            created_assignments = []
            errors = []
            
            for idx, assignment_data in enumerate(data['assignments']):
                try:
                    # Validate required fields
                    required_fields = ['task_id', 'aide_id', 'date']
                    for field in required_fields:
                        if field not in assignment_data:
                            errors.append({
                                'index': idx,
                                'error': f'Missing required field: {field}'
                            })
                            continue
                    
                    # Validate task exists
                    task = session.query(Task).get(assignment_data['task_id'])
                    if not task:
                        errors.append({
                            'index': idx,
                            'error': f'Task {assignment_data["task_id"]} not found'
                        })
                        continue
                    
                    # Validate aide exists
                    aide = session.query(TeacherAide).get(assignment_data['aide_id'])
                    if not aide:
                        errors.append({
                            'index': idx,
                            'error': f'Teacher aide {assignment_data["aide_id"]} not found'
                        })
                        continue
                    
                    # Validate date format
                    try:
                        date = datetime.fromisoformat(assignment_data['date'])
                    except ValueError:
                        errors.append({
                            'index': idx,
                            'error': 'Invalid date format. Use YYYY-MM-DD'
                        })
                        continue
                    
                    # Check for existing assignment
                    existing = session.query(Assignment).filter_by(
                        task_id=assignment_data['task_id'],
                        date=date
                    ).first()
                    
                    if existing:
                        errors.append({
                            'index': idx,
                            'error': 'Assignment already exists for this task and date'
                        })
                        continue
                    
                    # Create assignment
                    assignment = Assignment(
                        task_id=assignment_data['task_id'],
                        aide_id=assignment_data['aide_id'],
                        date=date,
                        status='ASSIGNED'
                    )
                    
                    session.add(assignment)
                    created_assignments.append(assignment)
                    
                except Exception as e:
                    errors.append({
                        'index': idx,
                        'error': str(e)
                    })
            
            if created_assignments:
                session.commit()
                
                # Get tasks for serialization
                tasks_map = {t.id: t for t in session.query(Task).all()}
                
                return {
                    'created': [serialize_assignment(a, tasks_map.get(a.task_id)) for a in created_assignments],
                    'errors': errors
                }, 201
            else:
                return {
                    'created': [],
                    'errors': errors
                }, 422
                
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AssignmentCheckResource(Resource):
    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['aide_id', 'date']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate date format
            try:
                check_date = datetime.fromisoformat(data['date'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            # Check for existing assignments
            assignments = session.query(Assignment).filter_by(
                aide_id=data['aide_id'],
                date=check_date
            ).all()
            
            # Check for absences
            absences = session.query(Absence).filter_by(
                aide_id=data['aide_id'],
                date=check_date
            ).all()
            
            # Get aide's availability for the day
            weekday = check_date.strftime('%a').upper()[:2]  # Convert to MO, TU, etc.
            availability = session.query(Availability).filter_by(
                aide_id=data['aide_id'],
                weekday=weekday
            ).all()
            
            return {
                'available': not (assignments or absences),
                'assignments': [serialize_assignment(a, conflict.task) if conflict else None for a in assignments],
                'absences': [serialize_absence(a) for a in absences],
                'availability': [serialize_availability(a) for a in availability]
            }, 200
            
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

class HorizonExtensionResource(Resource):
    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Get horizon weeks from request or use default
            horizon_weeks = data.get('horizon_weeks', DEFAULT_HORIZON_WEEKS)
            
            # Extend horizon
            extended = extend_assignment_horizon(session, horizon_weeks)
            
            return {
                'extended': extended,
                'horizon_weeks': horizon_weeks
            }, 200
            
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)
