import os
import shutil
import zipfile
import asyncio
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.memory import MemoryManager
from backend.orchestrator import Orchestrator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Auto Software Development Team API", version="1.0.0")

# Enable CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory_mgr = MemoryManager()

# Active WebSocket connections mapping project_id -> list of websockets
active_connections: Dict[str, List[WebSocket]] = {}

class ProjectCreate(BaseModel):
    name: str
    description: str

class SettingsUpdate(BaseModel):
    gemini_api_key: str
    github_token: Optional[str] = ""

class ChatRequest(BaseModel):
    agent_name: str
    message: str

class FileUpdate(BaseModel):
    content: str

# WebSocket Broadcaster
async def broadcast_to_project(project_id: str, data: Dict[str, Any]):
    if project_id in active_connections:
        dead_connections = []
        for connection in active_connections[project_id]:
            try:
                await connection.send_json(data)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            active_connections[project_id].remove(dead)

# REST Routes
@app.get("/api/projects")
async def get_projects():
    return memory_mgr.get_projects()

@app.post("/api/projects")
async def create_project(data: ProjectCreate):
    import uuid
    project_id = str(uuid.uuid4())
    project = memory_mgr.create_project(project_id, data.name, data.description)
    return project

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    project = memory_mgr.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.get("/api/projects/{project_id}/files")
async def get_project_files(project_id: str):
    return memory_mgr.get_project_files(project_id)

@app.get("/api/projects/{project_id}/files/{path:path}")
async def get_file_content(project_id: str, path: str):
    content = memory_mgr.get_file_content(project_id, path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": path, "content": content}

@app.put("/api/projects/{project_id}/files/{path:path}")
async def update_file(project_id: str, path: str, data: FileUpdate):
    # Update SQLite database
    memory_mgr.save_file(project_id, path, data.content)
    
    # Update local filesystem
    project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "projects", project_id)
    full_path = os.path.join(project_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(data.content)
        
    await broadcast_to_project(project_id, {
        "type": "file_updated",
        "path": path
    })
    return {"status": "success", "path": path}

@app.get("/api/projects/{project_id}/logs")
async def get_project_logs(project_id: str):
    return memory_mgr.get_project_logs(project_id)

@app.get("/api/settings")
async def get_settings():
    key = memory_mgr.get_api_key()
    masked_key = f"{key[:6]}...{key[-4:]}" if key and len(key) > 10 else ""
    github = memory_mgr.get_setting("GITHUB_TOKEN", "")
    masked_github = f"{github[:6]}..." if github and len(github) > 6 else ""
    return {
        "gemini_api_key": masked_key,
        "github_token": masked_github
    }

@app.post("/api/settings")
async def update_settings(data: SettingsUpdate):
    if data.gemini_api_key and not data.gemini_api_key.startswith("..."):
        memory_mgr.save_api_key(data.gemini_api_key)
    if data.github_token is not None and not data.github_token.startswith("..."):
        memory_mgr.save_setting("GITHUB_TOKEN", data.github_token)
    return {"status": "success"}

# Trigger multi-agent pipeline
@app.post("/api/projects/{project_id}/generate")
async def start_generation(project_id: str, background_tasks: BackgroundTasks):
    project = memory_mgr.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project["status"] == "In Progress":
        return {"status": "already_running"}

    async def run_pipeline():
        async def broadcast_fn(data):
            await broadcast_to_project(project_id, data)
            
        orchestrator = Orchestrator(
            project_id=project_id,
            prompt=project["description"],
            memory_mgr=memory_mgr,
            broadcast_fn=broadcast_fn
        )
        await orchestrator.execute()

    background_tasks.add_task(run_pipeline)
    return {"status": "started"}

# Direct chat to specific Agent
@app.post("/api/projects/{project_id}/chat")
async def chat_with_agent(project_id: str, data: ChatRequest):
    project = memory_mgr.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    api_key = memory_mgr.get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is not configured.")
        
    # Get all agents initialized
    from backend.agents import get_all_agents
    agents = get_all_agents(api_key)
    agent = agents.get(data.agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {data.agent_name} not found")
        
    # Gather logs / contextual memory of this agent
    memories = await memory_mgr.search_memory(project_id, data.message, limit=3)
    memory_context = "\n".join([f"[{m['agent_name']}]: {m['content']}" for m in memories])
    
    # Formulate chat prompt
    chat_prompt = (
        f"You are responding to a direct chat question from the user. "
        f"Context from past project events and decisions:\n{memory_context}\n\n"
        f"User query: {data.message}"
    )
    
    response = await agent.run(chat_prompt)
    
    # Log this conversation to project logs
    memory_mgr.log_agent_activity(project_id, data.agent_name, "Chat", f"User: {data.message}")
    memory_mgr.log_agent_activity(project_id, data.agent_name, "ChatResponse", f"Agent: {response}")
    
    await broadcast_to_project(project_id, {
        "type": "log",
        "project_id": project_id,
        "agent_name": data.agent_name,
        "status": "Chat",
        "message": f"User: {data.message}"
    })
    
    await broadcast_to_project(project_id, {
        "type": "log",
        "project_id": project_id,
        "agent_name": data.agent_name,
        "status": "ChatResponse",
        "message": f"Agent: {response}"
    })
    
    return {"response": response}

# Export project as ZIP file
@app.get("/api/projects/{project_id}/export")
async def export_project(project_id: str):
    project = memory_mgr.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "projects", project_id)
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=400, detail="Project files do not exist.")
        
    export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "exports")
    os.makedirs(export_dir, exist_ok=True)
    zip_path = os.path.join(export_dir, f"{project_id}.zip")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, project_dir)
                zipf.write(file_path, arcname)
                
    # Return path or stream the download
    # For FastAPI we can return the local path or use FileResponse
    from fastapi.responses import FileResponse
    return FileResponse(zip_path, media_type='application/zip', filename=f"{project['name'].replace(' ', '_')}.zip")

# Analytics Endpoint
@app.get("/api/analytics")
async def get_analytics():
    projects = memory_mgr.get_projects()
    total_projects = len(projects)
    
    conn = memory_mgr._get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT count(*) FROM project_files")
    total_files = cursor.fetchone()[0]
    
    cursor.execute("SELECT count(*) FROM memories")
    total_memories = cursor.fetchone()[0]
    
    cursor.execute("SELECT count(*) FROM project_logs WHERE status='Error'")
    error_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT count(*) FROM project_logs")
    total_logs = cursor.fetchone()[0]
    
    conn.close()
    
    success_rate = 100
    if total_projects > 0:
        completed = sum(1 for p in projects if p["status"] == "Completed")
        success_rate = int((completed / total_projects) * 100)

    # Return standard statistics
    return {
        "active_agents": 14,
        "total_projects": total_projects,
        "total_files": total_files,
        "token_usage": total_memories * 1800, # estimation
        "success_rate": success_rate,
        "error_count": error_count,
        "build_success_rate": max(0, min(100, 100 - error_count * 5)) if total_logs > 0 else 100
    }

# WebSockets Endpoint for Streaming Log updates
@app.websocket("/api/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await websocket.accept()
    if project_id not in active_connections:
        active_connections[project_id] = []
    active_connections[project_id].append(websocket)
    try:
        while True:
            # We keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections[project_id].remove(websocket)
        if not active_connections[project_id]:
            del active_connections[project_id]
