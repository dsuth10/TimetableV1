from flask_restful import Resource
from flask import request
from api.models import TeacherAide
from api.db import get_db
from .utils import error_response, serialize_aide

class TeacherAideListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            aides = session.query(TeacherAide).all()
            return [serialize_aide(aide) for aide in aides], 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['name']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Create teacher aide
            aide = TeacherAide(
                name=data['name'],
                qualifications=data.get('qualifications'),
                colour_hex=data.get('colour_hex')
            )
            
            session.add(aide)
            session.commit()
            
            return serialize_aide(aide), 201
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class TeacherAideResource(Resource):
    def get(self, aide_id):
        session = next(get_db())
        try:
            aide = session.query(TeacherAide).get(aide_id)
            if not aide:
                return error_response('NOT_FOUND', f'Teacher aide {aide_id} not found', 404)
            return serialize_aide(aide), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, aide_id):
        session = next(get_db())
        try:
            aide = session.query(TeacherAide).get(aide_id)
            if not aide:
                return error_response('NOT_FOUND', f'Teacher aide {aide_id} not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'name' in data:
                aide.name = data['name']
            if 'qualifications' in data:
                aide.qualifications = data['qualifications']
            if 'colour_hex' in data:
                aide.colour_hex = data['colour_hex']
            
            session.commit()
            return serialize_aide(aide), 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, aide_id):
        session = next(get_db())
        try:
            aide = session.query(TeacherAide).get(aide_id)
            if not aide:
                return error_response('NOT_FOUND', f'Teacher aide {aide_id} not found', 404)
            
            session.delete(aide)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500) 