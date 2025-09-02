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

def _is_half_hour_increment(t: time) -> bool:
    return t.minute in (0, 30)

def _within_business_hours(start: time, end: time) -> bool:
    open_time = time(8, 0)
    close_time = time(16, 0)
    return open_time <= start and end <= close_time

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
                # Filter using date (Assignment.date is a Date column)
                query = query.filter(Assignment.date >= date.fromisoformat(start_date))
            if end_date:
                query = query.filter(Assignment.date <= date.fromisoformat(end_date))
            
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

            # Enforce 30-minute increments and business hours
            if not (_is_half_hour_increment(start_time) and _is_half_hour_increment(end_time)):
                return error_response('VALIDATION_ERROR', 'Times must be in 30-minute increments (HH:00 or HH:30)', 422)
            if not _within_business_hours(start_time, end_time):
                return error_response('VALIDATION_ERROR', 'Times must be within business hours (08:00-16:00)', 422)
            
            # Check for existing assignment for the same task and date (duplicate)
            existing = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).filter_by(
                task_id=data['task_id'],
                date=date_value
            ).first()
            
            if existing:
                # Provide conflict payload for frontend UX
                conflict_payload = serialize_assignment(existing, existing.task)
                return {
                    'error': {
                        'code': 'CONFLICT',
                        'message': 'Assignment already exists for this task and date'
                    },
                    'conflict': conflict_payload
                }, 409

            # Check for scheduling conflicts with the same aide on the same date (overlapping times)
            conflict = session.query(Assignment).options(
                joinedload(Assignment.task),
                joinedload(Assignment.aide)
            ).filter(
                Assignment.aide_id == aide.id,
                Assignment.date == date_value,
                or_(
                    and_(Assignment.start_time <= start_time, start_time < Assignment.end_time),
                    and_(Assignment.start_time < end_time, end_time <= Assignment.end_time),
                    and_(start_time <= Assignment.start_time, Assignment.start_time < end_time)
                )
            ).first()
            if conflict:
                conflict_payload = serialize_assignment(conflict, conflict.task)
                return {
                    'error': {
                        'code': 'CONFLICT',
                        'message': 'Teacher aide has a scheduling conflict'
                    },
                    'conflict': conflict_payload
                }, 409

            # Optional: Validate aide availability if availability model is used
            # If Availability records exist for the aide/day, ensure requested time fits in at least one window
            weekday = calendar.day_name[date_value.weekday()][:2].upper()  # e.g., 'MO'
            availability_windows = session.query(Availability).filter_by(
                aide_id=aide.id,
                weekday=weekday
            ).all()
            if availability_windows:
                fits_any = any(
                    (window.start_time <= start_time and end_time <= window.end_time)
                    for window in availability_windows
                )
                if not fits_any:
                    return error_response('VALIDATION_ERROR', 'Requested time is outside aide availability', 422)
            
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

            # Enforce 30-minute increments and business hours
            if not (_is_half_hour_increment(assignment.start_time) and _is_half_hour_increment(assignment.end_time)):
                return error_response('VALIDATION_ERROR', 'Times must be in 30-minute increments (HH:00 or HH:30)', 422)
            if not _within_business_hours(assignment.start_time, assignment.end_time):
                return error_response('VALIDATION_ERROR', 'Times must be within business hours (08:00-16:00)', 422)

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

                # Validate absence overlap (treat absence as full-day)
                absence = session.query(Absence).filter(
                    Absence.aide_id == assignment.aide_id,
                    Absence.start_date <= assignment.date,
                    Absence.end_date >= assignment.date
                ).first()
                if absence:
                    return error_response('VALIDATION_ERROR', 'Aide is absent on the selected date', 422)

                # Optional: Validate availability window (if exists, ensure time fits a window)
                weekday = assignment.date.strftime('%a').upper()[:2]
                availability_windows = session.query(Availability).filter_by(
                    aide_id=assignment.aide_id,
                    weekday=weekday
                ).all()
                if availability_windows:
                    fits_any = any(
                        (window.start_time <= assignment.start_time and assignment.end_time <= window.end_time)
                        for window in availability_windows
                    )
                    if not fits_any:
                        return error_response('VALIDATION_ERROR', 'Requested time is outside aide availability', 422)
            
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
                    required_fields = ['task_id', 'aide_id', 'date', 'start_time', 'end_time']
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
                        date_value = date.fromisoformat(assignment_data['date'])
                    except ValueError:
                        errors.append({
                            'index': idx,
                            'error': 'Invalid date format. Use YYYY-MM-DD'
                        })
                        continue

                    # Validate time format and ordering
                    try:
                        start_time = time.fromisoformat(assignment_data['start_time'])
                        end_time = time.fromisoformat(assignment_data['end_time'])
                    except ValueError:
                        errors.append({
                            'index': idx,
                            'error': 'Invalid time format. Use HH:MM'
                        })
                        continue
                    if start_time >= end_time:
                        errors.append({
                            'index': idx,
                            'error': 'start_time must be before end_time'
                        })
                        continue
                    if not (_is_half_hour_increment(start_time) and _is_half_hour_increment(end_time)):
                        errors.append({
                            'index': idx,
                            'error': 'Times must be in 30-minute increments (HH:00 or HH:30)'
                        })
                        continue
                    if not _within_business_hours(start_time, end_time):
                        errors.append({
                            'index': idx,
                            'error': 'Times must be within business hours (08:00-16:00)'
                        })
                        continue
                    
                    # Check for existing assignment for same task/date
                    existing = session.query(Assignment).filter_by(
                        task_id=assignment_data['task_id'],
                        date=date_value
                    ).first()
                    
                    if existing:
                        errors.append({
                            'index': idx,
                            'error': 'Assignment already exists for this task and date'
                        })
                        continue

                    # Check for scheduling conflicts for the aide on the same date (overlapping times)
                    conflict = session.query(Assignment).options(
                        joinedload(Assignment.task),
                        joinedload(Assignment.aide)
                    ).filter(
                        Assignment.aide_id == aide.id,
                        Assignment.date == date_value,
                        or_(
                            and_(Assignment.start_time <= start_time, start_time < Assignment.end_time),
                            and_(Assignment.start_time < end_time, end_time <= Assignment.end_time),
                            and_(start_time <= Assignment.start_time, Assignment.start_time < end_time)
                        )
                    ).first()
                    if conflict:
                        errors.append({
                            'index': idx,
                            'error': 'Teacher aide has a scheduling conflict'
                        })
                        continue

                    # Validate absence overlap (treat absence as full-day)
                    absence = session.query(Absence).filter(
                        Absence.aide_id == aide.id,
                        Absence.start_date <= date_value,
                        Absence.end_date >= date_value
                    ).first()
                    if absence:
                        errors.append({
                            'index': idx,
                            'error': 'Aide is absent on the selected date'
                        })
                        continue

                    # Validate availability window if records exist for that weekday
                    weekday = calendar.day_name[date_value.weekday()][:2].upper()
                    availability_windows = session.query(Availability).filter_by(
                        aide_id=aide.id,
                        weekday=weekday
                    ).all()
                    if availability_windows:
                        fits_any = any(
                            (window.start_time <= start_time and end_time <= window.end_time)
                            for window in availability_windows
                        )
                        if not fits_any:
                            errors.append({
                                'index': idx,
                                'error': 'Requested time is outside aide availability'
                            })
                            continue
                    
                    # Create assignment
                    assignment = Assignment(
                        task_id=assignment_data['task_id'],
                        aide_id=assignment_data['aide_id'],
                        date=date_value,
                        start_time=start_time,
                        end_time=end_time,
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

            # Optional time window for overlap checks
            start_time = None
            end_time = None
            if 'start_time' in data and 'end_time' in data:
                try:
                    start_time = time.fromisoformat(data['start_time'])
                    end_time = time.fromisoformat(data['end_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
                if start_time >= end_time:
                    return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Check for existing assignments (and optional overlap)
            assignments_query = session.query(Assignment).options(
                joinedload(Assignment.task)
            ).filter(
                Assignment.aide_id == data['aide_id'],
                Assignment.date == check_date
            )
            assignments = assignments_query.all()
            overlapping_assignment = None
            if start_time and end_time:
                overlapping_assignment = assignments_query.filter(
                    or_(
                        and_(Assignment.start_time <= start_time, start_time < Assignment.end_time),
                        and_(Assignment.start_time < end_time, end_time <= Assignment.end_time),
                        and_(start_time <= Assignment.start_time, Assignment.start_time < end_time)
                    )
                ).first()
            
            # Check for absences
            absences = session.query(Absence).filter(
                Absence.aide_id == data['aide_id'],
                Absence.start_date <= check_date.date(),
                Absence.end_date >= check_date.date()
            ).all()
            
            # Get aide's availability for the day
            weekday = check_date.strftime('%a').upper()[:2]  # Convert to MO, TU, etc.
            availability = session.query(Availability).filter_by(
                aide_id=data['aide_id'],
                weekday=weekday
            ).all()

            has_conflict = False
            conflicting_assignment = None
            if overlapping_assignment:
                has_conflict = True
                conflicting_assignment = serialize_assignment(overlapping_assignment, overlapping_assignment.task)
            elif absences:
                has_conflict = True

            response = {
                'available': not (assignments or absences),
                'has_conflict': has_conflict,
                'conflicting_assignment': conflicting_assignment,
                'assignments': [serialize_assignment(a, a.task if hasattr(a, 'task') else None) for a in assignments],
                'absences': [serialize_absence(a) for a in absences],
                'availability': [serialize_availability(a) for a in availability]
            }
            return response, 200
            
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
