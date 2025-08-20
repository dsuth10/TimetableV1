from flask import Blueprint
from flask_restful import Api
import logging

# Import all route resources
from .aide_routes import (
    TeacherAideListResource, 
    TeacherAideResource
)
from .task_routes import TaskListResource, TaskResource
from .assignment_routes import (
    AssignmentListResource, 
    AssignmentResource,
    AssignmentBatchResource,
    AssignmentCheckResource,
    AssignmentWeeklyMatrixResource,
    HorizonExtensionResource
)
from .absence_routes import AbsenceListResource, AbsenceResource
from .classroom_routes import ClassroomListResource, ClassroomResource
from .school_class_routes import SchoolClassListResource, SchoolClassBulkUploadResource, SchoolClassResource
from .scheduler_routes import SchedulerStatusResource, SchedulerControlResource, ManualHorizonExtensionResource

# Create blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')
api = Api(api_bp)

logger = logging.getLogger(__name__)

def error_response(code: str, message: str, status: int) -> tuple[dict, int]:
    """Return a standardized error response."""
    return {'error': {'code': code, 'message': message}}, status

# Register all resources
api.add_resource(TeacherAideListResource, '/aides')
api.add_resource(TeacherAideResource, '/aides/<int:aide_id>')

api.add_resource(TaskListResource, '/tasks')
api.add_resource(TaskResource, '/tasks/<int:task_id>')

api.add_resource(AssignmentListResource, '/assignments')
api.add_resource(AssignmentResource, '/assignments/<int:assignment_id>')
api.add_resource(AssignmentBatchResource, '/assignments/batch')
api.add_resource(AssignmentCheckResource, '/assignments/check')
api.add_resource(AssignmentWeeklyMatrixResource, '/assignments/weekly-matrix')
api.add_resource(HorizonExtensionResource, '/assignments/extend-horizon')

api.add_resource(AbsenceListResource, '/absences')
api.add_resource(AbsenceResource, '/absences/<int:absence_id>')

api.add_resource(ClassroomListResource, '/classrooms')
api.add_resource(ClassroomResource, '/classrooms/<int:classroom_id>')

api.add_resource(SchoolClassListResource, '/school-classes')
api.add_resource(SchoolClassBulkUploadResource, '/school-classes/bulk-upload')
api.add_resource(SchoolClassResource, '/school-classes/<int:school_class_id>')

# Scheduler management routes
api.add_resource(SchedulerStatusResource, '/scheduler/status')
api.add_resource(SchedulerControlResource, '/scheduler/control')
api.add_resource(ManualHorizonExtensionResource, '/scheduler/extend-horizon')

@api_bp.route('/health')
def health_check():
    """Health check endpoint."""
    return {'status': 'healthy'}, 200
