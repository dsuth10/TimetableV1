from .db import get_engine, managed_session, init_db
from .models import Classroom
import logging

logger = logging.getLogger(__name__)

def seed_classrooms():
    """Seed the database with default classrooms."""
    default_classrooms = [
        {"name": "Room 101", "capacity": 30, "notes": "Main classroom"},
        {"name": "Room 102", "capacity": 25, "notes": "Science lab"},
        {"name": "Room 103", "capacity": 35, "notes": "Computer lab"},
        {"name": "Art Studio", "capacity": 24, "notes": "Art room with supplies"},
        {"name": "Music Room", "capacity": 20, "notes": "Music room with instruments"},
        {"name": "Library", "capacity": 40, "notes": "School library"},
        {"name": "Gymnasium", "capacity": 100, "notes": "Main gym"},
        {"name": "Auditorium", "capacity": 200, "notes": "School auditorium"},
    ]

    with managed_session() as session:
        # Clear existing classrooms
        session.query(Classroom).delete()
        session.commit()
        logger.info("Cleared existing classrooms")

        # Add new classrooms
        for classroom_data in default_classrooms:
            classroom = Classroom(**classroom_data)
            session.add(classroom)
        
        session.commit()
        logger.info(f"Added {len(default_classrooms)} classrooms to the database")

        # Verify the classrooms were added
        count = session.query(Classroom).count()
        logger.info(f"Total classrooms in database: {count}")

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize database and seed data
    logger.info("Initializing database...")
    init_db()
    logger.info("Seeding classrooms...")
    seed_classrooms()
    logger.info("Done!") 