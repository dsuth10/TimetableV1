from contextlib import contextmanager
from typing import Generator, Optional
import logging
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

class SessionManager:
    """Manages database sessions with proper lifecycle handling."""
    
    def __init__(self, session_factory: sessionmaker):
        """Initialize the session manager.
        
        Args:
            session_factory: SQLAlchemy session factory to use
        """
        self._session_factory = session_factory
        self._scoped_session = scoped_session(session_factory)
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around a series of operations.
        
        Yields:
            Session: A database session
            
        Raises:
            SQLAlchemyError: If any database operation fails
        """
        session = self._scoped_session()
        try:
            yield session
            session.commit()
            logger.debug("Session committed successfully")
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Session rolled back due to error: {str(e)}")
            raise
        finally:
            session.close()
            logger.debug("Session closed")
    
    def get_session(self) -> Session:
        """Get a new database session.
        
        Returns:
            Session: A new database session
            
        Note:
            The caller is responsible for closing the session
        """
        return self._scoped_session()
    
    def cleanup(self) -> None:
        """Clean up all sessions in the registry."""
        self._scoped_session.remove()
        logger.debug("All sessions cleaned up")

# Global session manager instance
_session_manager: Optional[SessionManager] = None

def init_session_manager(session_factory: sessionmaker) -> None:
    """Initialize the global session manager.
    
    Args:
        session_factory: SQLAlchemy session factory to use
    """
    global _session_manager
    _session_manager = SessionManager(session_factory)
    logger.info("Session manager initialized")

def get_session_manager() -> SessionManager:
    """Get the global session manager instance.
    
    Returns:
        SessionManager: The global session manager
        
    Raises:
        RuntimeError: If session manager is not initialized
    """
    if _session_manager is None:
        raise RuntimeError("Session manager not initialized")
    return _session_manager

@contextmanager
def managed_session() -> Generator[Session, None, None]:
    """Get a managed database session with automatic cleanup.
    
    Yields:
        Session: A database session with automatic transaction management
        
    Raises:
        RuntimeError: If session manager is not initialized
        SQLAlchemyError: If any database operation fails
    """
    manager = get_session_manager()
    with manager.session_scope() as session:
        yield session 