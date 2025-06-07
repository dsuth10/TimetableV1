from datetime import datetime, date, time, timedelta
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Time, Date, Enum, Text, CheckConstraint, and_, func, Table
from sqlalchemy.orm import relationship, declarative_base
from typing import List, Optional
from dateutil.rrule import rrulestr
from .constants import Status
import logging

logger = logging.getLogger(__name__)

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

# Association table for absence-assignment relationship
absence_assignments = Table(
    'absence_assignments',
    Base.metadata,
    Column('absence_id', Integer, ForeignKey('absences.id', ondelete='CASCADE'), primary_key=True),
    Column('assignment_id', Integer, ForeignKey('assignments.id', ondelete='CASCADE'), primary_key=True)
)

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

class Classroom(Base):
    __tablename__ = 'classrooms'
    __table_args__ = (UniqueConstraint('name', name='uq_classroom_name'),)
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationship
    tasks = relationship("Task", back_populates="classroom", cascade="all, delete-orphan")

class Task(Base):
    """Task model for storing task information."""
    __tablename__ = 'tasks'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    recurrence_rule = Column(String(200))
    expires_on = Column(Date)
    classroom_id = Column(Integer, ForeignKey('classrooms.id', ondelete='SET NULL'))
    notes = Column(Text)
    status = Column(String(20), default='UNASSIGNED')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    classroom = relationship('Classroom', back_populates='tasks')
    assignments = relationship('Assignment', back_populates='task', cascade='all, delete-orphan')
    
    def generate_assignments(self, start_date: date, end_date: date, session=None) -> List['Assignment']:
        """Generate assignments for this task between start_date and end_date.
        
        Args:
            start_date: The start date for assignment generation
            end_date: The end date for assignment generation
            session: Optional database session to use
            
        Returns:
            List of generated assignments
        """
        if not self.recurrence_rule:
            return []
            
        try:
            # Parse the recurrence rule
            dt_start = datetime.combine(start_date, self.start_time)
            rule = rrulestr(self.recurrence_rule, dtstart=dt_start)
            
            # Generate dates
            dates = list(rule.between(
                datetime.combine(start_date, self.start_time),
                datetime.combine(end_date, self.end_time),
                inc=True
            ))
            
            # Create assignments
            assignments = []
            for dt in dates:
                # Skip if before task's start date
                if dt.date() < start_date:
                    continue
                # Skip if after task's end date
                if self.expires_on and dt.date() > self.expires_on:
                    continue
                # Check if assignment already exists for this date
                if session:
                    existing = session.query(Assignment).filter_by(
                        task_id=self.id,
                        date=dt.date(),
                        start_time=self.start_time,
                        end_time=self.end_time
                    ).first()
                    if existing:
                        continue
                # Create assignment
                assignment = Assignment(
                    task_id=self.id,
                    date=dt.date(),
                    start_time=self.start_time,
                    end_time=self.end_time,
                    status='UNASSIGNED'
                )
                if session:
                    session.add(assignment)
                assignments.append(assignment)
            if session:
                session.flush()
            return assignments
            
        except Exception as e:
            raise ValueError(f"Invalid recurrence rule: {str(e)}")
    
    def update_future_assignments(self, session, old_recurrence: Optional[str] = None,
                                old_start_time: Optional[time] = None,
                                old_end_time: Optional[time] = None) -> int:
        """Update future assignments based on changes to the task.
        
        Args:
            session: The database session to use
            old_recurrence: The previous recurrence rule
            old_start_time: The previous start time
            old_end_time: The previous end time
            
        Returns:
            Number of assignments updated
        """
        # Get current date and calculate end date
        start_date = date.today()
        end_date = start_date + timedelta(weeks=4)
        
        # Get existing assignments in the date range
        existing_assignments = session.query(Assignment).filter(
            Assignment.task_id == self.id,
            Assignment.date >= start_date,
            Assignment.date <= end_date
        ).all()
        
        # Delete existing assignments
        for assignment in existing_assignments:
            session.delete(assignment)
        
        # Generate new assignments if recurring
        if self.recurrence_rule:
            new_assignments = self.generate_assignments(start_date, end_date, session)
            return len(new_assignments)
        
        return 0

class Assignment(Base):
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

class Absence(Base):
    __tablename__ = 'absences'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id', ondelete='CASCADE'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    aide = relationship("TeacherAide", back_populates="absences")
    assignments = relationship("Assignment", secondary=absence_assignments)

    def release_assignments(self, session) -> List['Assignment']:
        """Release all assignments for this absence date range."""
        # Debug: Print absence details
        logger.debug(f"Releasing assignments for absence: aide_id={self.aide_id}, start_date={self.start_date}, end_date={self.end_date}")
        
        assignments = session.query(Assignment).filter(
            Assignment.aide_id == self.aide_id,
            Assignment.date.between(self.start_date, self.end_date)
        ).all()
        
        # Debug: Print found assignments
        logger.debug(f"Found {len(assignments)} assignments to check")
        for assignment in assignments:
            logger.debug(f"Assignment: id={assignment.id}, date={assignment.date}, status={assignment.status}")
        
        released = []
        for assignment in assignments:
            if assignment.status != Status.UNASSIGNED:
                assignment.aide_id = None
                assignment.status = Status.UNASSIGNED
                self.assignments.append(assignment)
                released.append(assignment)
                logger.debug(f"Released assignment: id={assignment.id}")
        
        return released

# Create indexes
from sqlalchemy import Index

Index('teacher_aide_name_idx', TeacherAide.name)
Index('assignment_date_idx', Assignment.date)
Index('assignment_aide_date_idx', Assignment.aide_id, Assignment.date)
Index('absence_aide_date_idx', Absence.aide_id, Absence.start_date) 