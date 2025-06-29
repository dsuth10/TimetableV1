import requests
import json
import os

# Ensure the script is run from the correct directory
script_dir = os.path.dirname(__file__)
os.chdir(script_dir)

with open('temp_classes.json', 'r') as f:
    data = json.load(f)

url = "http://127.0.0.1:5000/api/school-classes/bulk-upload"
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, headers=headers, data=json.dumps(data))
    response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
    print(response.status_code)
    print(response.json())
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Response status: {e.response.status_code}")
        print(f"Response text: {e.response.text}")
