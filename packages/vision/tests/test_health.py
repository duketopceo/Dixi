import pytest
import sys
import os

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    """Test that the health endpoint returns a valid response."""
    response = client.get('/health')
    
    assert response.status_code == 200
    assert response.is_json
    
    data = response.get_json()
    assert 'status' in data
    assert 'service' in data
    assert 'tracking' in data
    assert 'timestamp' in data
    assert data['status'] == 'healthy'
    assert data['service'] == 'vision'
    assert isinstance(data['tracking'], bool)
    assert isinstance(data['timestamp'], int)

