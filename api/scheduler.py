"""Scheduler for automatic tasks like horizon extension."""

import threading
import time
from datetime import datetime, timedelta, date
from typing import Optional
from sqlalchemy.orm import Session

from api.db import get_db
from api.recurrence import extend_assignment_horizon, DEFAULT_HORIZON_WEEKS

class Scheduler:
    """Simple scheduler for running periodic tasks."""
    
    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.horizon_extension_interval = 24 * 60 * 60  # 24 hours in seconds
        
    def start(self):
        """Start the scheduler."""
        if self.running:
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        print(f"Scheduler started at {datetime.now()}")
    
    def stop(self):
        """Stop the scheduler."""
        self.running = False
        if self.thread:
            self.thread.join()
        print(f"Scheduler stopped at {datetime.now()}")
    
    def _run(self):
        """Main scheduler loop."""
        while self.running:
            try:
                # Run horizon extension
                self._extend_horizon()
                
                # Sleep for the configured interval
                time.sleep(self.horizon_extension_interval)
                
            except Exception as e:
                print(f"Scheduler error: {e}")
                # Sleep for a shorter interval on error
                time.sleep(60)  # 1 minute
    
    def _extend_horizon(self):
        """Extend the assignment horizon for all recurring tasks."""
        try:
            from api.session import managed_session
            with managed_session() as session:
                tasks_processed, assignments_created = extend_assignment_horizon(session, DEFAULT_HORIZON_WEEKS)
                
                if tasks_processed > 0 or assignments_created > 0:
                    print(f"Horizon extension: {tasks_processed} tasks processed, {assignments_created} assignments created")
            
        except Exception as e:
            print(f"Horizon extension error: {e}")
    
    def run_horizon_extension_now(self) -> tuple[int, int]:
        """Manually trigger horizon extension and return results."""
        from api.session import managed_session
        with managed_session() as session:
            return extend_assignment_horizon(session, DEFAULT_HORIZON_WEEKS)

# Global scheduler instance
scheduler = Scheduler()

def start_scheduler():
    """Start the global scheduler."""
    scheduler.start()

def stop_scheduler():
    """Stop the global scheduler."""
    scheduler.stop()

def get_scheduler_status() -> dict:
    """Get the current status of the scheduler."""
    return {
        'running': scheduler.running,
        'horizon_extension_interval': scheduler.horizon_extension_interval,
        'last_run': datetime.now().isoformat() if scheduler.running else None
    }


# Compatibility wrapper used by task routes/tests
def generate_assignments_for_task(task, session, horizon_weeks: int = DEFAULT_HORIZON_WEEKS):
    """Generate assignments for a given task across the default horizon.

    This provides a stable import path for routes and tests expecting
    ``api.scheduler.generate_assignments_for_task``.
    """
    # Import locally to avoid any potential circular imports at module load
    from api.recurrence import generate_assignments

    start_date: date = date.today()
    end_date: date = start_date + timedelta(weeks=horizon_weeks)
    # Respect task expiry if set
    if getattr(task, 'expires_on', None):
        try:
            if task.expires_on < end_date:
                end_date = task.expires_on
        except Exception:
            # If expires_on is not comparable (unexpected type), ignore
            pass

    return generate_assignments(task, start_date, end_date, session)
