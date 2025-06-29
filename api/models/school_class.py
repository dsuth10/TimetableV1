from sqlalchemy import Column, Integer, String, DateTime, Text, func
from sqlalchemy.orm import relationship
from .base import Base

class SchoolClass(Base):
    __tablename__ = 'school_classes'
    id = Column(Integer, primary_key=True)
    class_code = Column(String(50), unique=True, nullable=False)
    grade = Column(String(50), nullable=False)
    teacher = Column(String(100), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships (to be defined later for students and teacher aide support)
    tasks = relationship("Task", back_populates="school_class", cascade="all, delete-orphan")
    # students = relationship("Student", back_populates="school_class")
    # teacher_aide_support = relationship("TeacherAideSupport", back_populates="school_class")
