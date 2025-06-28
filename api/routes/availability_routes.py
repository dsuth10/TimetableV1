from flask_restful import Resource
from flask import request
from api.models import Availability
from api.db import get_db
from datetime import time
from .utils import error_response, serialize_availability

class AvailabilityListResource(Resource):
    def get(self, aide_id):
        session = next(get_db())
        try:
            availabilities = session.query(Availability).filter_by(aide_id=aide_id).all()
            return [serialize_availability(avail) for avail in availabilities], 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self, aide_id):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['weekday', 'start_time', 'end_time']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate weekday
            if data['weekday'] not in ['MO', 'TU', 'WE', 'TH', 'FR']:
                return error_response('VALIDATION_ERROR', 'Invalid weekday', 422)
            
            # Validate times
            try:
                start_time = time.fromisoformat(data['start_time'])
                end_time = time.fromisoformat(data['end_time'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid time format. Use HH:MM', 422)
            
            if start_time >= end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            # Create availability
            availability = Availability(
                aide_id=aide_id,
                weekday=data['weekday'],
                start_time=start_time,
                end_time=end_time
            )
            
            session.add(availability)
            session.commit()
            
            return serialize_availability(availability), 201
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AvailabilityResource(Resource):
    def put(self, aide_id, avail_id):
        session = next(get_db())
        try:
            availability = session.query(Availability).filter_by(
                id=avail_id,
                aide_id=aide_id
            ).first()
            
            if not availability:
                return error_response('NOT_FOUND', f'Availability {avail_id} not found for aide {aide_id}', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'weekday' in data:
                if data['weekday'] not in ['MO', 'TU', 'WE', 'TH', 'FR']:
                    return error_response('VALIDATION_ERROR', 'Invalid weekday', 422)
                availability.weekday = data['weekday']
            
            if 'start_time' in data:
                try:
                    availability.start_time = time.fromisoformat(data['start_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid start_time format. Use HH:MM', 422)
            
            if 'end_time' in data:
                try:
                    availability.end_time = time.fromisoformat(data['end_time'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid end_time format. Use HH:MM', 422)
            
            # Validate times
            if availability.start_time >= availability.end_time:
                return error_response('VALIDATION_ERROR', 'start_time must be before end_time', 422)
            
            session.commit()
            return serialize_availability(availability), 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, aide_id, avail_id):
        session = next(get_db())
        try:
            availability = session.query(Availability).filter_by(
                id=avail_id,
                aide_id=aide_id
            ).first()
            
            if not availability:
                return error_response('NOT_FOUND', f'Availability {avail_id} not found for aide {aide_id}', 404)
            
            session.delete(availability)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500) 