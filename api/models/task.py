from sqlalchemy import Column, Integer, String, DateTime, Time, Date, ForeignKey, Text, func, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, date, timedelta, time
from typing import List, Optional
from dateutil.rrule import rrulestr
from .base import Base
from .assignment import Assignment

class Task(Base):
    """Task model for storing task information.
    
    Attributes:
        ...
        is_flexible (bool): Whether the task is flexible (no set time or location)
    """
    __tablename__ = 'tasks'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    recurrence_rule = Column(String(200))
    expires_on = Column(Date)
    classroom_id = Column(Integer, ForeignKey('classrooms.id', ondelete='SET NULL'))
    school_class_id = Column(Integer, ForeignKey('school_classes.id', ondelete='SET NULL')) # New foreign key
    notes = Column(Text)
    status = Column(String(20), default='UNASSIGNED')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    is_flexible = Column(Boolean, default=False)
    
    # Relationships
    classroom = relationship('Classroom', back_populates='tasks')
    school_class = relationship('SchoolClass', back_populates='tasks') # New relationship
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
            print(f"Warning: Failed to generate assignments for task {self.id} with recurrence rule '{self.recurrence_rule}': {str(e)}")
            return []
    
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
