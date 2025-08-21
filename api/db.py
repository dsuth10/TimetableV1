from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
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
_engine = None
_session_factory = None

Base = declarative_base()

def get_engine():
    """Get the current database engine."""
    global _engine
    if _engine is None:
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'timetable.db')
        _engine = create_engine(
            f'sqlite:///{db_path}',
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args={
                'timeout': 30,
                'check_same_thread': False
            }
        )
        # Initialize session factory when engine is created
        set_engine(_engine)
    return _engine

def set_engine(new_engine):
    """Set a new database engine (used for testing)."""
    global _engine, _session_factory
    _engine = new_engine
    _session_factory = sessionmaker(bind=_engine)
    init_session_manager(_session_factory)

def get_session():
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(bind=get_engine())
    return scoped_session(_session_factory)()

def get_db() -> Generator:
    """Get a database session using the managed session context, or the test override if set."""
    if hasattr(get_db, "override") and get_db.override is not None:
        yield from get_db.override()
    else:
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