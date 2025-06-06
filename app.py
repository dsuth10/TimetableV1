from flask import Flask
from flask_cors import CORS
import os
import logging
from api.db import set_engine

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
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(absence_bp, url_prefix='/api')
    # Initialize database
    from api.db import init_db
    with app.app_context():
        init_db()
    return app

# Initialize database
# from api.db import init_db

def print_routes(app):
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule}")

# Call this after app creation for diagnostics
if __name__ == '__main__':
    app = create_app()
    print_routes(app)
    app.run(debug=True) 