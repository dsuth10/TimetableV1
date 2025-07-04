from flask import request
from datetime import datetime, date, timedelta
from api.db import get_db
from api.models import Task, Assignment
from api.constants import Status
from api.recurrence import DEFAULT_HORIZON_WEEKS

def error_response(code: str, message: str, status: int) -> tuple[dict, int]:
    """Return a standardized error response."""
    return {'error': {'code': code, 'message': message}}, status

def post(self):
    """Create a new task and generate its assignments."""
    session = next(get_db())
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'category', 'start_time', 'end_time']
        for field in required_fields:
            if field not in data:
                return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
        
        # Create task
        task = Task(
            title=data['title'],
            category=data['category'],
            start_time=datetime.strptime(data['start_time'], '%H:%M').time(),
            end_time=datetime.strptime(data['end_time'], '%H:%M').time(),
            recurrence_rule=data.get('recurrence_rule'),
            expires_on=datetime.strptime(data['expires_on'], '%Y-%m-%d').date() if data.get('expires_on') else None,
            classroom_id=data.get('classroom_id'),
            notes=data.get('notes'),
            status=Status.UNASSIGNED
        )
        
        session.add(task)
        session.flush()  # Get task ID without committing
        
        # Generate assignments
        assignments = []
        if task.recurrence_rule:
            start_date = date.today()
            end_date = start_date + timedelta(weeks=DEFAULT_HORIZON_WEEKS)
            assignments = task.generate_assignments(start_date, end_date, session)
        
        session.commit()
        
        return {
            'task': task.to_dict(),
            'assignments': [assignment.to_dict() for assignment in assignments]
        }, 201
    except Exception as e:
        session.rollback()
        return error_response('INTERNAL_ERROR', str(e), 500)

def put(self, task_id):
    """Update an existing task and regenerate assignments if recurrence changes."""
    session = next(get_db())
    try:
        task = session.get(Task, task_id)
        if not task:
            return error_response('NOT_FOUND', 'Task not found', 404)
            
        data = request.get_json()
        
        # Update basic fields
        if 'title' in data:
            task.title = data['title']
        if 'category' in data:
            task.category = data['category']
        if 'start_time' in data:
            task.start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        if 'end_time' in data:
            task.end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        if 'notes' in data:
            task.notes = data['notes']
        if 'expires_on' in data:
            task.expires_on = datetime.strptime(data['expires_on'], '%Y-%m-%d').date()
        if 'classroom_id' in data:
            task.classroom_id = data['classroom_id']
        
        # Handle recurrence rule changes
        assignments = []
        if 'recurrence_rule' in data:
            old_rule = task.recurrence_rule
            task.recurrence_rule = data['recurrence_rule']
            
            # If recurrence rule changed, regenerate assignments
            if old_rule != task.recurrence_rule:
                # Delete future assignments
                session.query(Assignment).filter(
                    Assignment.task_id == task.id,
                    Assignment.date >= date.today()
                ).delete()
                
                # Generate new assignments
                if task.recurrence_rule:
                    start_date = date.today()
                    end_date = start_date + timedelta(weeks=DEFAULT_HORIZON_WEEKS)
                    assignments = task.generate_assignments(start_date, end_date, session)
        
        session.commit()
        
        return {
            'task': task.to_dict(),
            'assignments': [assignment.to_dict() for assignment in assignments] if 'recurrence_rule' in data else []
        }, 200
    except Exception as e:
        session.rollback()
        return error_response('INTERNAL_ERROR', str(e), 500) 