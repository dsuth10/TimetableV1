from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
import logging
from typing import Generator, Optional
from .session import init_session_manager, managed_session

logger = logging.getLogger(__name__)

# Create the database directory if it doesn't exist
os.makedirs('instance', exist_ok=True)

# Default: file-based SQLite database
DEFAULT_DATABASE_URL = 'sqlite:///instance/app.db'

# Global variables
engine = None
session_factory = None

def get_engine():
    """Get the current database engine."""
    global engine
    if engine is None:
        engine = create_engine(DEFAULT_DATABASE_URL)
        # Initialize session factory when engine is created
        set_engine(engine)
    return engine

def set_engine(new_engine):
    """Set a new database engine (used for testing)."""
    global engine, session_factory
    engine = new_engine
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    init_session_manager(session_factory)

def get_db() -> Generator:
    """Get a database session using the managed session context.
    
    Yields:
        Session: A database session with automatic transaction management
    """
    with managed_session() as session:
        yield session

def init_db():
    """Initialize the database by creating all tables."""
    from .models import Base
    current_engine = get_engine()
    Base.metadata.create_all(bind=current_engine)
    logger.debug("Database tables created")
    
    # Create a test session to verify connection
    with managed_session() as session:
        try:
            session.execute(text("SELECT 1"))
            logger.debug("Database connection verified")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise 