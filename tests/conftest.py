import sys
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import logging

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.models import Base
from app import create_app
from api.db import set_engine, init_db, get_db
from api.session import get_session_manager, SessionManager

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@pytest.fixture(scope="session")
def engine():
    """Create a test database engine."""
    return create_engine('sqlite:///:memory:')

@pytest.fixture(scope="session")
def tables(engine):
    """Create all tables in the test database."""
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

@pytest.fixture
def connection(engine):
    """Create a connection to the test database."""
    connection = engine.connect()
    yield connection
    connection.close()

@pytest.fixture
def db_session(connection):
    """Create a database session with automatic rollback."""
    transaction = connection.begin()
    session = Session(bind=connection)
    
    # Override the get_db function to return our test session
    def override_get_db():
        try:
            yield session
        finally:
            session.close()
    
    # Apply the override
    get_db.override = override_get_db
    
    yield session
    
    # Cleanup
    session.close()
    transaction.rollback()
    get_db.override = None

@pytest.fixture
def app(engine):
    """Create a Flask app for testing."""
    app = create_app(engine)
    app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False
    })
    return app

@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create a test CLI runner."""
    return app.test_cli_runner()

@pytest.fixture(autouse=True)
def setup_database(app, db_session):
    """Set up a fresh database for each test."""
    # Clear all tables
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()
    logger.debug("Database tables cleared")
    yield 

@pytest.fixture
def test_app(app):
    """Return the app instance for testing."""
    return app 