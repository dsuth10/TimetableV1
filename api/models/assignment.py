from sqlalchemy import Column, Integer, DateTime, Date, Time, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from typing import List
from .base import Base

class Assignment(Base):
    """Model for task assignments to teacher aides."""
    
    __tablename__ = 'assignments'

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id', ondelete='SET NULL'))
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(
        Enum('UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE'),
        nullable=False,
        default='UNASSIGNED'
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    task = relationship("Task", back_populates="assignments")
    aide = relationship("TeacherAide", back_populates="assignments")

    def check_conflicts(self, session) -> List['Assignment']:
        """Check for scheduling conflicts with other assignments."""
        if not self.aide_id:
            return []
        return session.query(Assignment).filter(
            Assignment.aide_id == self.aide_id,
            Assignment.date == self.date,
            Assignment.id != self.id,
            (
                (Assignment.start_time <= self.start_time) & (self.start_time < Assignment.end_time) |
                (Assignment.start_time < self.end_time) & (self.end_time <= Assignment.end_time) |
                (self.start_time <= Assignment.start_time) & (Assignment.start_time < self.end_time)
            )
        ).all()

    def to_dict(self):
        """Convert assignment to dictionary."""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'aide_id': self.aide_id,
            'date': self.date.isoformat(),
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 