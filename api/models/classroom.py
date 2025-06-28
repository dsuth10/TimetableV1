from sqlalchemy import Column, Integer, String, DateTime, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from .base import Base

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