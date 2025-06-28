from flask_restful import Resource
from flask import request
from api.models import Absence, Assignment
from api.db import get_db
from datetime import datetime
from .utils import error_response, serialize_absence

class AbsenceListResource(Resource):
    def get(self):
        session = next(get_db())
        try:
            # Get filter parameters
            aide_id = request.args.get('aide_id')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            # Build query
            query = session.query(Absence)
            
            if aide_id:
                query = query.filter_by(aide_id=aide_id)
            if start_date:
                query = query.filter(Absence.date >= datetime.fromisoformat(start_date))
            if end_date:
                query = query.filter(Absence.date <= datetime.fromisoformat(end_date))
            
            # Get pagination parameters
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
            
            # Get total count
            total = query.count()
            
            # Get paginated results
            absences = query.order_by(Absence.date.desc())\
                .offset((page - 1) * per_page)\
                .limit(per_page)\
                .all()
            
            return {
                'items': [serialize_absence(a) for a in absences],
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
            
            # Validate required fields
            required_fields = ['aide_id', 'date', 'reason']
            for field in required_fields:
                if field not in data:
                    return error_response('VALIDATION_ERROR', f'Missing required field: {field}', 422)
            
            # Validate date format
            try:
                date = datetime.fromisoformat(data['date'])
            except ValueError:
                return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
            
            # Check for existing absence
            existing = session.query(Absence).filter_by(
                aide_id=data['aide_id'],
                date=date
            ).first()
            
            if existing:
                return error_response('CONFLICT', 'Absence already exists for this aide and date', 409)
            
            # Check for existing assignments
            assignments = session.query(Assignment).filter_by(
                aide_id=data['aide_id'],
                date=date
            ).all()
            
            if assignments:
                return error_response('CONFLICT', 'Cannot create absence - aide has assignments on this date', 409)
            
            # Create absence
            absence = Absence(
                aide_id=data['aide_id'],
                date=date,
                reason=data['reason']
            )
            
            session.add(absence)
            session.commit()
            
            return serialize_absence(absence), 201
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

class AbsenceResource(Resource):
    def get(self, absence_id):
        session = next(get_db())
        try:
            absence = session.query(Absence).get(absence_id)
            
            if not absence:
                return error_response('NOT_FOUND', f'Absence {absence_id} not found', 404)
            
            return serialize_absence(absence), 200
        except Exception as e:
            return error_response('INTERNAL_ERROR', str(e), 500)

    def put(self, absence_id):
        session = next(get_db())
        try:
            absence = session.query(Absence).get(absence_id)
            
            if not absence:
                return error_response('NOT_FOUND', f'Absence {absence_id} not found', 404)
            
            data = request.get_json(force=True)
            
            # Update fields
            if 'date' in data:
                try:
                    new_date = datetime.fromisoformat(data['date'])
                except ValueError:
                    return error_response('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 422)
                
                # Check for existing absence on new date
                existing = session.query(Absence).filter_by(
                    aide_id=absence.aide_id,
                    date=new_date
                ).first()
                
                if existing and existing.id != absence_id:
                    return error_response('CONFLICT', 'Absence already exists for this aide and date', 409)
                
                # Check for assignments on new date
                assignments = session.query(Assignment).filter_by(
                    aide_id=absence.aide_id,
                    date=new_date
                ).all()
                
                if assignments:
                    return error_response('CONFLICT', 'Cannot update absence - aide has assignments on this date', 409)
                
                absence.date = new_date
            
            if 'reason' in data:
                absence.reason = data['reason']
            
            session.commit()
            return serialize_absence(absence), 200
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500)

    def delete(self, absence_id):
        session = next(get_db())
        try:
            absence = session.query(Absence).get(absence_id)
            
            if not absence:
                return error_response('NOT_FOUND', f'Absence {absence_id} not found', 404)
            
            session.delete(absence)
            session.commit()
            return '', 204
        except Exception as e:
            session.rollback()
            return error_response('INTERNAL_ERROR', str(e), 500) 