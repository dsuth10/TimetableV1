from sqlalchemy import Column, Integer, String, DateTime, Time, ForeignKey, CheckConstraint, UniqueConstraint, func
from sqlalchemy.orm import relationship
from .base import Base

class Availability(Base):
    __tablename__ = 'availability'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id', ondelete='CASCADE'), nullable=False)
    weekday = Column(String(2), nullable=False)  # MO, TU, WE, TH, FR
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship
    aide = relationship("TeacherAide", back_populates="availabilities")

    # Constraints
    __table_args__ = (
        CheckConstraint('weekday IN ("MO", "TU", "WE", "TH", "FR")'),
        CheckConstraint('start_time < end_time'),
        CheckConstraint('start_time >= "08:00"'),
        CheckConstraint('end_time <= "16:00"'),
        UniqueConstraint('aide_id', 'weekday', name='uq_availability_aide_weekday')
    ) 