import sys
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.models import Base
from app import create_app
from api.db import set_engine, init_db
from api.session import get_session_manager, SessionManager

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@pytest.fixture(scope="session")
def engine():
    """Create a test database engine using a file-based SQLite database."""
    test_engine = create_engine(
        'sqlite:///test_db.sqlite',
        connect_args={"check_same_thread": False},
        echo=True  # Log all SQL statements
    )
    set_engine(test_engine)
    return test_engine

@pytest.fixture(scope="session")
def connection(engine):
    """Create a database connection for the test session."""
    connection = engine.connect()
    yield connection
    connection.close()

@pytest.fixture(scope="session")
def tables(connection):
    """Create all database tables."""
    Base.metadata.create_all(connection)
    logger.debug("Database tables created")
    yield
    Base.metadata.drop_all(connection)
    logger.debug("Database tables dropped")

@pytest.fixture
def db_session(connection, tables):
    """Create a database session for each test."""
    # Roll back any existing transaction
    connection.rollback()
    
    # Start a new transaction
    transaction = connection.begin()
    
    # Get a session from the session manager
    session_manager = get_session_manager()
    session = session_manager.get_session()
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        logger.debug("Database session closed and transaction rolled back")

@pytest.fixture
def app(engine):
    """Create and configure a Flask app for testing."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False
    })
    
    # Initialize the database
    with app.app_context():
        init_db()
        logger.debug("Test database initialized")
        logger.debug("Registered routes:")
        for rule in app.url_map.iter_rules():
            logger.debug(f"{rule.endpoint}: {rule.rule}")
    
    return app

@pytest.fixture
def client(app):
    """Create a test client for the app."""
    with app.test_client() as client:
        logger.debug("Test client created")
        yield client

@pytest.fixture
def runner(app):
    """Create a test CLI runner for the app."""
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