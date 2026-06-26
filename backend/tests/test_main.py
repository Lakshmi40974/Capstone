import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add workspace directory to PATH so backend is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.memory import MemoryManager

client = TestClient(app)

def test_get_projects():
    response = client.get("/api/projects")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_project():
    response = client.post(
        "/api/projects",
        json={"name": "Test Capstone App", "description": "Build a secure landing page"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["name"] == "Test Capstone App"
    assert data["status"] == "Pending"

def test_get_settings():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "gemini_api_key" in data
    assert "github_token" in data

def test_analytics():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "active_agents" in data
    assert "total_projects" in data
    assert "total_files" in data
