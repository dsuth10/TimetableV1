from datetime import datetime, date, time
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Time, Date, Enum, Text, CheckConstraint, and_, func
from sqlalchemy.orm import relationship, declarative_base
from typing import List, Optional

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

class Availability(Base):
    __tablename__ = 'availability'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id'), nullable=False)
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

class Classroom(Base):
    __tablename__ = 'classroom'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationship
    tasks = relationship("Task", back_populates="classroom")

class Task(Base):
    __tablename__ = 'task'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    category = Column(
        Enum('PLAYGROUND', 'CLASS_SUPPORT', 'GROUP_SUPPORT', 'INDIVIDUAL_SUPPORT'),
        nullable=False
    )
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    recurrence_rule = Column(String(200))  # iCal RRULE format
    expires_on = Column(Date)
    classroom_id = Column(Integer, ForeignKey('classroom.id'))
    notes = Column(Text)
    status = Column(
        Enum('UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE'),
        nullable=False,
        default='UNASSIGNED'
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    classroom = relationship("Classroom", back_populates="tasks")
    assignments = relationship("Assignment", back_populates="task", cascade="all, delete-orphan")

    def generate_assignments(self, start_date: date, end_date: date) -> List['Assignment']:
        """Generate assignments for a date range based on recurrence rule."""
        if not self.recurrence_rule:
            return []
        from dateutil.rrule import rrulestr
        from datetime import datetime as dt
        # Convert dates to datetimes at midnight
        dt_start = dt.combine(start_date, dt.min.time())
        dt_end = dt.combine(end_date, dt.max.time())
        rule = rrulestr(self.recurrence_rule, dtstart=dt_start)
        dates = [d.date() for d in rule.between(dt_start, dt_end, inc=True)]
        return [
            Assignment(
                task_id=self.id,
                date=d,
                start_time=self.start_time,
                end_time=self.end_time,
                status='UNASSIGNED'
            )
            for d in dates
        ]

class Assignment(Base):
    __tablename__ = 'assignment'
    
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey('task.id'), nullable=False)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id'))
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

class Absence(Base):
    __tablename__ = 'absence'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id'), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship
    aide = relationship("TeacherAide", back_populates="absences")

    def release_assignments(self, session) -> List['Assignment']:
        """Release all assignments for this absence date."""
        assignments = session.query(Assignment).filter_by(
            aide_id=self.aide_id,
            date=self.date
        ).all()
        for assignment in assignments:
            assignment.aide_id = None
            assignment.status = 'UNASSIGNED'
        return assignments

# Create indexes
from sqlalchemy import Index

Index('teacher_aide_name_idx', TeacherAide.name)
Index('assignment_date_idx', Assignment.date)
Index('assignment_aide_date_idx', Assignment.aide_id, Assignment.date)
Index('absence_aide_date_idx', Absence.aide_id, Absence.date) 