def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json == {"status": "healthy"}


def test_404_on_unknown_endpoint(client):
    """Test that unknown endpoints return 404."""
    response = client.get('/api/unknown')
    assert response.status_code == 404


def test_cors_headers(client):
    """Test that CORS headers are present in responses."""
    response = client.get('/api/health')
    assert 'Access-Control-Allow-Origin' in response.headers
    assert response.headers['Access-Control-Allow-Origin'] == '*'


def test_app_testing_mode(test_app):
    """Test that the app is in testing mode during tests."""
    assert test_app.config['TESTING'] is True 