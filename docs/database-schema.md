# Database Schema

## Overview

The Teacher Aide Scheduler uses SQLAlchemy ORM with PostgreSQL in production and SQLite in development. The schema is designed to handle teacher aide assignments, availability, tasks, and absences efficiently.

## Models

### TeacherAide
```python
class TeacherAide(Base):
    __tablename__ = 'teacher_aide'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    qualifications = Column(Text)
    colour_hex = Column(String(7), nullable=False)  # For timetable visualization
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    availabilities = relationship('Availability', back_populates='aide', cascade='all, delete-orphan')
    assignments = relationship('Assignment', back_populates='aide')
    absences = relationship('Absence', back_populates='aide', cascade='all, delete-orphan')

    def is_available(self, date: date, start_time: time, end_time: time) -> bool:
        """Check if aide is available for given time slot."""
        if any(absence.date == date for absence in self.absences):
            return False
        weekday = date.strftime('%A').upper()
        return any(
            availability.weekday == weekday and
            availability.start_time <= start_time and
            availability.end_time >= end_time
            for availability in self.availabilities
        )
```

### Availability
```python
class Availability(Base):
    __tablename__ = 'availability'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id'), nullable=False)
    weekday = Column(String(2), nullable=False)  # MO, TU, WE, TH, FR
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    aide = relationship('TeacherAide', back_populates='availabilities')

    # Constraints
    __table_args__ = (
        CheckConstraint('weekday IN ("MO", "TU", "WE", "TH", "FR")'),
        CheckConstraint('start_time < end_time'),
        CheckConstraint('start_time >= "08:00"'),
        CheckConstraint('end_time <= "16:00"'),
        UniqueConstraint('aide_id', 'weekday', name='uq_availability_aide_weekday')
    )
```

### Task
```python
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
    classroom = relationship('Classroom', back_populates='tasks')
    assignments = relationship('Assignment', back_populates='task', cascade='all, delete-orphan')

    def generate_assignments(self, start_date: date, end_date: date) -> List['Assignment']:
        """Generate assignments for a date range based on recurrence rule."""
        if not self.recurrence_rule:
            return []
        from dateutil.rrule import rrulestr
        rule = rrulestr(self.recurrence_rule, dtstart=start_date)
        dates = list(rule.between(start_date, end_date))
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
```

### Assignment
```python
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
    task = relationship('Task', back_populates='assignments')
    aide = relationship('TeacherAide', back_populates='assignments')

    def check_conflicts(self) -> List['Assignment']:
        """Check for scheduling conflicts with other assignments."""
        if not self.aide_id:
            return []
        return Assignment.query.filter(
            Assignment.aide_id == self.aide_id,
            Assignment.date == self.date,
            Assignment.id != self.id,
            (
                (Assignment.start_time <= self.start_time < Assignment.end_time) |
                (Assignment.start_time < self.end_time <= Assignment.end_time) |
                (self.start_time <= Assignment.start_time < self.end_time)
            )
        ).all()
```

### Absence
```python
class Absence(Base):
    __tablename__ = 'absence'
    
    id = Column(Integer, primary_key=True)
    aide_id = Column(Integer, ForeignKey('teacher_aide.id'), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    aide = relationship('TeacherAide', back_populates='absences')

    def release_assignments(self) -> List[Assignment]:
        """Release all assignments for this absence date."""
        assignments = Assignment.query.filter_by(
            aide_id=self.aide_id,
            date=self.date
        ).all()
        for assignment in assignments:
            assignment.aide_id = None
            assignment.status = 'UNASSIGNED'
        return assignments
```

### Classroom
```python
class Classroom(Base):
    __tablename__ = 'classroom'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    tasks = relationship('Task', back_populates='classroom')
```

## Database Migrations

The schema is managed using Alembic migrations. The initial migration creates all tables with appropriate constraints and relationships.

### Creating a New Migration

```bash
flask db migrate -m "Description of changes"
flask db upgrade
```

### Rolling Back Changes

```bash
flask db downgrade
```

## Indexes

The following indexes are created to optimize query performance:

1. `teacher_aide_name_idx` on `teacher_aide(name)`
2. `assignment_date_idx` on `assignment(date)`
3. `assignment_aide_date_idx` on `assignment(aide_id, date)`
4. `absence_aide_date_idx` on `absence(aide_id, date)`

## Common Queries

### Get Available Aides for a Time Slot
```python
def get_available_aides(date: date, start_time: time, end_time: time) -> List[TeacherAide]:
    return TeacherAide.query.filter(
        ~TeacherAide.absences.any(Absence.date == date),
        TeacherAide.availabilities.any(
            and_(
                Availability.weekday == date.strftime('%A').upper(),
                Availability.start_time <= start_time,
                Availability.end_time >= end_time
            )
        )
    ).all()
```

### Get Aide's Schedule for a Week
```python
def get_aide_schedule(aide_id: int, week_start: date) -> List[Assignment]:
    week_end = week_start + timedelta(days=6)
    return Assignment.query.filter(
        Assignment.aide_id == aide_id,
        Assignment.date.between(week_start, week_end)
    ).order_by(Assignment.date, Assignment.start_time).all()
```

## Data Integrity

The following constraints ensure data integrity:

1. Time slots must be within school hours (08:00-16:00)
2. No double-booking of aides
3. One absence per aide per date
4. Valid weekday values (MO, TU, WE, TH, FR)
5. Start time must be before end time
6. Cascade deletion for related records 