from sqlalchemy.orm import declarative_base
from sqlalchemy import Table, Column, Integer, ForeignKey

Base = declarative_base()

WEEKDAY_MAP = {
    'MONDAY': 'MO',
    'TUESDAY': 'TU',
    'WEDNESDAY': 'WE',
    'THURSDAY': 'TH',
    'FRIDAY': 'FR',
    'SATURDAY': 'SA',
    'SUNDAY': 'SU',
}

absence_assignments = Table(
    'absence_assignments',
    Base.metadata,
    Column('absence_id', Integer, ForeignKey('absences.id', ondelete='CASCADE'), primary_key=True),
    Column('assignment_id', Integer, ForeignKey('assignments.id', ondelete='CASCADE'), primary_key=True)
) 