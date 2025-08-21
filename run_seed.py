#!/usr/bin/env python3

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

try:
    from seed import seed_database
    print("Starting database seeding...")
    seed_database()
    print("Database seeding completed!")
    
    # Write success message to file
    with open('seed_result.txt', 'w') as f:
        f.write("Database seeding completed successfully!\n")
        
except Exception as e:
    print(f"Error during seeding: {e}")
    # Write error message to file
    with open('seed_result.txt', 'w') as f:
        f.write(f"Error during seeding: {e}\n")
