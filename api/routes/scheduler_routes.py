"""Scheduler management routes."""

from flask_restful import Resource
from flask import request
from api.scheduler import start_scheduler, stop_scheduler, get_scheduler_status, scheduler
from api.recurrence import extend_assignment_horizon, DEFAULT_HORIZON_WEEKS
from api.db import get_db
from .utils import error_response

class SchedulerStatusResource(Resource):
    def get(self):
        """Get the current status of the scheduler."""
        try:
            status = get_scheduler_status()
            return status, 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

class SchedulerControlResource(Resource):
    def post(self):
        """Start or stop the scheduler."""
        try:
            data = request.get_json(force=True) if request.is_json else {}
            action = data.get('action', 'status')
            
            if action == 'start':
                start_scheduler()
                return {'message': 'Scheduler started'}, 200
            elif action == 'stop':
                stop_scheduler()
                return {'message': 'Scheduler stopped'}, 200
            elif action == 'status':
                status = get_scheduler_status()
                return status, 200
            else:
                return error_response('VALIDATION_ERROR', 'Invalid action. Use "start", "stop", or "status"', 422)
                
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

class ManualHorizonExtensionResource(Resource):
    def post(self):
        """Manually trigger horizon extension."""
        try:
            data = request.get_json(force=True) if request.is_json else {}
            horizon_weeks = data.get('horizon_weeks', DEFAULT_HORIZON_WEEKS)
            
            session = next(get_db())
            tasks_processed, assignments_created = extend_assignment_horizon(session, horizon_weeks)
            
            return {
                'message': 'Horizon extension completed',
                'tasks_processed': tasks_processed,
                'assignments_created': assignments_created,
                'horizon_weeks': horizon_weeks
            }, 200
            
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)
