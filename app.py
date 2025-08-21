from flask import Flask
from flask_cors import CORS
import os
import logging
from api.db import set_engine
from api.db import init_db
from api.routes import api_bp
from api.scheduler import start_scheduler

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_app(engine=None):
    app = Flask(__name__)
    CORS(app)
    # Set the engine if provided (for testing)
    if engine is not None:
        set_engine(engine)
    # Import and register blueprints
    from api.routes import api_bp
    from api.absence import absence_bp
    from api.classroom import classroom_bp
    from api.timetable import timetable_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(absence_bp, url_prefix='/api')
    app.register_blueprint(classroom_bp, url_prefix='/api')
    app.register_blueprint(timetable_bp, url_prefix='/api')
    # Initialize database
    from api.db import init_db
    with app.app_context():
        init_db()
        logger.debug("Database initialized")
    # Print registered routes for debugging
    logger.debug("Registered routes:")
    for rule in app.url_map.iter_rules():
        logger.debug(f"{rule.endpoint}: {rule.rule}")
    # Start the scheduler for automatic horizon extension
    try:
        # Temporarily disable automatic horizon extension to prevent database locks
        # start_scheduler()
        print("Scheduler disabled to prevent database locks")
    except Exception as e:
        print(f"Warning: Could not start scheduler: {e}")
    return app

def print_routes(app):
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule}")

# Call this after app creation for diagnostics
if __name__ == '__main__':
    app = create_app()
    print_routes(app)
    app.run(debug=True, host='0.0.0.0', port=5000) 