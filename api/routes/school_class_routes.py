from flask_restful import Resource
from flask import request
from api.models import SchoolClass
from api.db import get_db
from .utils import error_response
import logging

logger = logging.getLogger(__name__)

def serialize_school_class(school_class):
    """Serializes a SchoolClass object to a dictionary."""
    return {
        'id': school_class.id,
        'class_code': school_class.class_code,
        'grade': school_class.grade,
        'teacher': school_class.teacher,
        'notes': school_class.notes,
        'created_at': school_class.created_at.isoformat() if school_class.created_at else None,
        'updated_at': school_class.updated_at.isoformat() if school_class.updated_at else None,
    }

class SchoolClassListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            school_classes = session.query(SchoolClass).all()
            return [serialize_school_class(sc) for sc in school_classes], 200
        except Exception as e:
            logger.exception("Error getting school classes")
            return error_response('INTERNAL_ERROR', str(e), 500)

    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            
            # Validate required fields
            required_fields = ['class_code', 'grade', 'teacher']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Create school class
            school_class = SchoolClass(
                class_code=data['class_code'],
                grade=data['grade'],
                teacher=data['teacher'],
                notes=data.get('notes')
            )
            
            session.add(school_class)
            session.commit()
            
            return serialize_school_class(school_class), 201
        except Exception as e:
            session.rollback()
            logger.exception("Error creating school class")
            return error_response('INTERNAL_ERROR', str(e), 500)

class SchoolClassBulkUploadResource(Resource):
    def post(self):
        session = next(get_db())
        try:
            data = request.get_json(force=True)
            if not isinstance(data, list):
                return error_response('VALIDATION_ERROR', 'Expected a list of class data', 422)

            successful_uploads = []
            failed_uploads = []

            for item in data:
                required_fields = ['class_code', 'grade', 'teacher']
                missing_fields = [field for field in required_fields if field not in item]
                if missing_fields:
                    failed_uploads.append({
                        'data': item,
                        'error': f'Missing required fields: {", ".join(missing_fields)}'
                    })
                    continue

                try:
                    school_class = SchoolClass(
                        class_code=item['class_code'],
                        grade=item['grade'],
                        teacher=item['teacher'],
                        notes=item.get('notes')
                    )
                    session.add(school_class)
                    successful_uploads.append(item['class_code'])
                except Exception as e:
                    failed_uploads.append({
                        'data': item,
                        'error': str(e)
                    })
            
            session.commit() # Commit all valid entries in one go

            return {
                'message': f'Successfully uploaded {len(successful_uploads)} classes. Failed to upload {len(failed_uploads)} classes.',
                'successful_class_codes': successful_uploads,
                'failed_entries': failed_uploads
            }, 200

        except Exception as e:
            session.rollback()
            logger.exception("Error during bulk upload of school classes")
            return error_response('INTERNAL_ERROR', str(e), 500)

class SchoolClassResource(Resource):
    def get(self, school_class_id):
        session = next(get_db())
        try:
            school_class = session.query(SchoolClass).get(school_class_id)
            if not school_class:
                return error_response('NOT_FOUND', f'SchoolClass {school_class_id} not found', 404)
            return serialize_school_class(school_class), 200
        except Exception as e:
            logger.exception("Error getting school class by ID")
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, school_class_id):
        session = next(get_db())
        try:
            school_class = session.query(SchoolClass).get(school_class_id)
            if not school_class:
                return error_response('NOT_FOUND', f'SchoolClass {school_class_id} not found', 404)
            
            data = request.get_json(force=True)
            
            if 'class_code' in data:
                school_class.class_code = data['class_code']
            if 'grade' in data:
                school_class.grade = data['grade']
            if 'teacher' in data:
                school_class.teacher = data['teacher']
            if 'notes' in data:
                school_class.notes = data['notes']
            
            session.commit()
            return serialize_school_class(school_class), 200
        except Exception as e:
            session.rollback()
            logger.exception("Error updating school class")
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, school_class_id):
        session = next(get_db())
        try:
            school_class = session.query(SchoolClass).get(school_class_id)
            if not school_class:
                return error_response('NOT_FOUND', f'SchoolClass {school_class_id} not found', 404)
            
            session.delete(school_class)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            logger.exception("Error deleting school class")
            return error_response('INTERNAL_ERROR', str(e), 500)
