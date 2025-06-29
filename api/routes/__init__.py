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

# Create the blueprint
api_bp = Blueprint('api', __name__)
api = Api(api_bp)

logger = logging.getLogger(__name__)

def error_response(code: str, message: str, status: int) -> tuple[dict, int]:
    """Return a standardized error response."""
    return {'error': {'code': code, 'message': message}}, status

# Import route handlers after blueprint creation to avoid circular imports
from .task_routes import TaskListResource, TaskResource
from .aide_routes import TeacherAideListResource, TeacherAideResource
from .availability_routes import AvailabilityListResource, AvailabilityResource
from .assignment_routes import (
    AssignmentListResource, 
    AssignmentResource,
    AssignmentBatchResource,
    AssignmentCheckResource,
    HorizonExtensionResource
)
from .absence_routes import AbsenceListResource, AbsenceResource
from .classroom_routes import ClassroomListResource, ClassroomResource
from .school_class_routes import SchoolClassListResource, SchoolClassBulkUploadResource, SchoolClassResource

# Register resources
api.add_resource(TaskListResource, '/tasks')
api.add_resource(ClassroomListResource, '/classrooms')
api.add_resource(SchoolClassListResource, '/school-classes')
api.add_resource(SchoolClassBulkUploadResource, '/school-classes/bulk-upload')
api.add_resource(SchoolClassResource, '/school-classes/<int:school_class_id>')
api.add_resource(ClassroomResource, '/classrooms/<int:classroom_id>')
api.add_resource(TaskResource, '/tasks/<int:task_id>')
api.add_resource(TeacherAideListResource, '/teacher-aides')
api.add_resource(TeacherAideResource, '/teacher-aides/<int:aide_id>')
api.add_resource(AvailabilityListResource, '/teacher-aides/<int:aide_id>/availability')
api.add_resource(AvailabilityResource, '/teacher-aides/<int:aide_id>/availability/<int:avail_id>')
api.add_resource(AssignmentListResource, '/assignments')
api.add_resource(AssignmentResource, '/assignments/<int:assignment_id>')
api.add_resource(AssignmentBatchResource, '/assignments/batch')
api.add_resource(AssignmentCheckResource, '/assignments/check')
api.add_resource(HorizonExtensionResource, '/assignments/extend-horizon')
api.add_resource(AbsenceListResource, '/absences')
api.add_resource(AbsenceResource, '/absences/<int:absence_id>')

@api_bp.route('/health')
def health_check():
    return jsonify({'status': 'ok'}), 200
