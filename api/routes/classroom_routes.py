from flask_restful import Resource
from flask import request
from api.models import Classroom
from api.db import get_db
from .utils import error_response, serialize_classroom

class ClassroomListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            classrooms = session.query(Classroom).all()
            return [serialize_classroom(classroom) for classroom in classrooms], 200
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
            
            # Create classroom
            classroom = Classroom(
                name=data['name'],
                capacity=data.get('capacity'),
                notes=data.get('notes')
            )
            
            session.add(classroom)
            session.commit()
            
            return serialize_classroom(classroom), 201
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class ClassroomResource(Resource):
    def get(self, classroom_id):
        session = next(get_db())
        try:
            classroom = session.query(Classroom).get(classroom_id)
            if not classroom:
                return error_response('NOT_FOUND', f'Classroom {classroom_id} not found', 404)
            return serialize_classroom(classroom), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, classroom_id):
        session = next(get_db())
        try:
            classroom = session.query(Classroom).get(classroom_id)
            if not classroom:
                return error_response('NOT_FOUND', f'Classroom {classroom_id} not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'name' in data:
                classroom.name = data['name']
            if 'capacity' in data:
                classroom.capacity = data['capacity']
            if 'notes' in data:
                classroom.notes = data['notes']
            
            session.commit()
            return serialize_classroom(classroom), 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, classroom_id):
        session = next(get_db())
        try:
            classroom = session.query(Classroom).get(classroom_id)
            if not classroom:
                return error_response('NOT_FOUND', f'Classroom {classroom_id} not found', 404)
            
            session.delete(classroom)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)
