from sqlalchemy import Column, Integer, String, DateTime, Text, func
from sqlalchemy.orm import relationship
from datetime import date, time
from .base import Base, WEEKDAY_MAP

class TeacherAide(Base):
    __tablename__ = 'teacher_aide'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    qualifications = Column(Text)
    colour_hex = Column(String(7), nullable=False)  # Format: #RRGGBB
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    availabilities = relationship("Availability", back_populates="aide", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="aide")
    absences = relationship("Absence", back_populates="aide", cascade="all, delete-orphan")

    def is_available(self, date_: date, start_time: time, end_time: time) -> bool:
        """Check if aide is available for given time slot."""
        if any(absence.date == date_ for absence in self.absences):
            return False
        weekday = WEEKDAY_MAP[date_.strftime('%A').upper()]
        return any(
            availability.weekday == weekday and
            availability.start_time <= start_time and
            availability.end_time >= end_time
            for availability in self.availabilities
        ) 