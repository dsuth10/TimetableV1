import sys
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.models import Base
from app import create_app
from api.db import set_engine

@pytest.fixture(scope="session")
def engine():
    # Use a single in-memory SQLite database connection for the whole session
    test_engine = create_engine('sqlite:///:memory:', connect_args={"check_same_thread": False})
    set_engine(test_engine)
    return test_engine

@pytest.fixture(scope="session")
def connection(engine):
    # Create a single connection for the session
    connection = engine.connect()
    yield connection
    connection.close()

@pytest.fixture(scope="session")
def tables(connection):
    Base.metadata.create_all(connection)
    yield
    Base.metadata.drop_all(connection)

@pytest.fixture
def db_session(connection, tables):
    # Roll back any existing transaction
    connection.rollback()
    # Use a basic transaction for each test
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()  # Close the session
    transaction.rollback()  # Rollback the transaction

@pytest.fixture
def test_app(engine):
    app = create_app(engine=engine)
    app.config.update({
        "TESTING": True,
    })
    return app

@pytest.fixture
def client(test_app):
    return test_app.test_client() 