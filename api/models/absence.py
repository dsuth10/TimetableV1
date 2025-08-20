from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import relationship
from typing import List
from .base import Base, absence_assignments

class Absence(Base):
    __tablename__ = 'absences'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    aide = relationship("TeacherAide", back_populates="absences")
    assignments = relationship("Assignment", secondary=absence_assignments)

    def release_assignments(self, session) -> List['Assignment']:
        """Release assignments associated with this absence."""
        assignments = session.query(Assignment).filter(
            Assignment.aide_id == self.aide_id,
            Assignment.date == self.date
        ).all()
        for assignment in assignments:
            assignment.aide_id = None
            assignment.status = 'UNASSIGNED'
        return assignments 