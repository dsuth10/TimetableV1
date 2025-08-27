from flask_restful import Resource
from flask import request
from api.models import Assignment, Task, TeacherAide, Absence, Availability
from api.db import get_db
from datetime import datetime, timedelta, date, time
from .utils import error_response, serialize_assignment, serialize_absence, serialize_availability
from api.recurrence import extend_assignment_horizon, DEFAULT_HORIZON_WEEKS
from sqlalchemy import and_, or_
import calendar
from sqlalchemy.orm import joinedload

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
            
            # Validate required fields (ensure times are provided to satisfy DB constraints)
            required_fields = ['task_id', 'aide_id', 'date', 'start_time', 'end_time']
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
                date_value = date.fromisoformat(data['date'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)

            # Validate time format
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)

            if start_time >= end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Check for existing assignment
            existing = session.query(Assignment).filter_by(
                task_id=data['task_id'],
                date=date_value
            ).first()
            
            if existing:
                return error_response('CONFLICT', 'Assignment already exists for this task and date', 409)
            
            # Create assignment
            assignment = Assignment(
                task_id=data['task_id'],
                aide_id=data['aide_id'],
                date=date_value,
                start_time=start_time,
                end_time=end_time,
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
                # Allow null for unassigning, otherwise validate aide exists
                if data['aide_id'] is None:
                    assignment.aide_id = None
                else:
                    aide = session.query(TeacherAide).get(data['aide_id'])
                    if not aide:
                        return error_response('NOT_FOUND', f'Teacher aide {data["aide_id"]} not found', 404)
                    assignment.aide_id = data['aide_id']
            
            if 'date' in data:
                try:
                    # Expect YYYY-MM-DD; store as date
                    assignment.date = date.fromisoformat(data['date'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
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

            # Validate time ordering if both present (or previously set)
            if assignment.start_time >= assignment.end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)

            if 'status' in data:
                # Validate status against allowed values
                allowed_statuses = ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE']
                if str(data['status']).upper() not in allowed_statuses:
                    return error_response('VALIDATION_ERROR', f"Invalid status: {data['status']}. Allowed statuses are {', '.join(allowed_statuses)}", 422)
                assignment.status = str(data['status']).upper()

            # Check for conflicts if aide, date, or times changed
            if assignment.aide_id:
                conflict = session.query(Assignment).filter(
                    Assignment.id != assignment_id,
                    Assignment.aide_id == assignment.aide_id,
                    Assignment.date == assignment.date,
                    or_(
                        and_(Assignment.start_time <= assignment.start_time, assignment.start_time < Assignment.end_time),
                        and_(Assignment.start_time < assignment.end_time, assignment.end_time <= Assignment.end_time),
                        and_(assignment.start_time <= Assignment.start_time, Assignment.start_time < assignment.end_time)
                    )
                ).first()
                if conflict:
                    # Include conflicting assignment details to help client resolve
                    task = session.query(Task).get(conflict.task_id)
                    conflict_payload = serialize_assignment(conflict, task)
                    return {
                        'error': {
                            'code': 'CONFLICT',
                            'message': 'Assignment conflicts with existing assignment'
                        },
                        'conflict': conflict_payload
                    }, 409
            
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

class AssignmentWeeklyMatrixResource(Resource):
    def get(self):
        """Get weekly matrix for UI - organized by day and time slots for each aide."""
        session = next(get_db())
        try:
            # Get week parameter
            week = request.args.get('week')
            if not week:
                return error_response('VALIDATION_ERROR', 'Missing required parameter: week', 422)
            
            # Parse week format (YYYY-WW)
            try:
                year, week_num = map(int, week.split('-W'))
                start_date = date.fromisocalendar(year, week_num, 1)  # Monday
                end_date = date.fromisocalendar(year, week_num, 7)    # Sunday
            except (ValueError, IndexError):
                return error_response('VALIDATION_ERROR', 'Invalid week format. Use YYYY-WW', 422)
            
            # Get all teacher aides
            aides = session.query(TeacherAide).order_by(TeacherAide.name).all()
            
            # Get all assignments for the week
            assignments = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).filter(
                Assignment.date.between(start_date, end_date)
            ).all()
            
            # Get all absences for the week
            absences = session.query(Absence).options(
                joinedload(Absence.aide)
            ).filter(
                or_(
                    and_(Absence.start_date <= end_date, Absence.end_date >= start_date)
                )
            ).all()
            
            # Create time slots (30-minute intervals from 08:00 to 16:00)
            time_slots = []
            current_time = time(8, 0)  # 08:00
            end_time = time(16, 0)     # 16:00
            
            while current_time < end_time:
                time_slots.append(current_time.strftime('%H:%M'))
                # Add 30 minutes
                current_minutes = current_time.hour * 60 + current_time.minute + 30
                current_time = time(current_minutes // 60, current_minutes % 60)
            
            # Create day names
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            
            # Build the matrix structure
            matrix = {
                'week': week,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'time_slots': time_slots,
                'days': day_names,
                'aides': [],
                'assignments': {},
                'absences': {}
            }
            
            # Add aide information
            for aide in aides:
                matrix['aides'].append({
                    'id': aide.id,
                    'name': aide.name,
                    'colour_hex': aide.colour_hex,
                    'qualifications': aide.qualifications
                })
            
            # Organize assignments by aide, day, and time slot
            for assignment in assignments:
                if not assignment.aide_id:
                    continue  # Skip unassigned tasks
                
                aide_id = assignment.aide_id
                day_index = (assignment.date - start_date).days
                
                if day_index >= len(day_names):
                    continue  # Skip weekends
                
                day_name = day_names[day_index]
                
                # Find time slots that this assignment covers
                assignment_start = assignment.start_time
                assignment_end = assignment.end_time
                
                for i, slot_time_str in enumerate(time_slots):
                    slot_time = datetime.strptime(slot_time_str, '%H:%M').time()
                    slot_end_time = datetime.strptime(time_slots[i + 1], '%H:%M').time() if i + 1 < len(time_slots) else time(16, 0)
                    
                    # Check if assignment overlaps with this time slot
                    if (assignment_start < slot_end_time and assignment_end > slot_time):
                        key = f"{aide_id}_{day_name}_{slot_time_str}"
                        matrix['assignments'][key] = {
                            'assignment_id': assignment.id,
                            'task_id': assignment.task_id,
                            'task_title': assignment.task.title if assignment.task else 'Unknown Task',
                            'task_category': assignment.task.category if assignment.task else 'UNKNOWN',
                            'start_time': assignment.start_time.strftime('%H:%M'),
                            'end_time': assignment.end_time.strftime('%H:%M'),
                            'status': assignment.status,
                            'is_flexible': assignment.task.is_flexible if assignment.task else False,
                            'classroom': assignment.task.classroom.name if assignment.task and assignment.task.classroom else None,
                            'school_class': assignment.task.school_class.name if assignment.task and assignment.task.school_class else None,
                            'notes': assignment.task.notes if assignment.task else None
                        }
            
            # Organize absences by aide and day
            for absence in absences:
                aide_id = absence.aide_id
                # For date range absences, we need to handle multiple days
                current_date = max(absence.start_date, start_date)
                end_absence_date = min(absence.end_date, end_date)
                
                while current_date <= end_absence_date:
                    day_index = (current_date - start_date).days
                    
                    if day_index >= len(day_names):
                        break  # Skip weekends
                    
                    day_name = day_names[day_index]
                    key = f"{aide_id}_{day_name}"
                    matrix['absences'][key] = {
                        'absence_id': absence.id,
                        'reason': absence.reason,
                        'start_date': absence.start_date.isoformat(),
                        'end_date': absence.end_date.isoformat()
                    }
                    
                    current_date += timedelta(days=1)
            
            return matrix, 200
            
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)
