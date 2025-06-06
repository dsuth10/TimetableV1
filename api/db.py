from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# Create the database directory if it doesn't exist
os.makedirs('instance', exist_ok=True)

# Default: file-based SQLite database
engine = create_engine('sqlite:///test.db')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Allow tests to override the engine

def set_engine(new_engine):
    global engine, SessionLocal
    engine = new_engine
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize the database by creating all tables."""
    from .models import Base
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        session.commit()
    finally:
        session.close() 