import os
import sqlite3
import json
import datetime
import math
import re
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "platform.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    
    # Project logs / history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)

    # Project generated files
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_files (
        project_id TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (project_id, path),
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)
    
    # Vector long-term memories
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT, -- JSON array of floats
        timestamp TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)
    
    # Platform settings (API keys, general configs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

# Helper to hash text / tokenize for fallback TF-IDF
def get_tfidf_embedding(text: str) -> List[float]:
    # Pure Python TF-IDF embedding vector generator
    # We use a fixed vocabulary size of 256 using hash bucketing for a stable vector length
    words = re.findall(r'\w+', text.lower())
    vector = [0.0] * 256
    if not words:
        return vector
    for word in words:
        # Simple hash function to map word to index 0-255
        idx = abs(hash(word)) % 256
        vector[idx] += 1.0
    # Normalize vector to unit length
    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude > 0:
        vector = [v / magnitude for v in vector]
    return vector

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2) or not v1 or not v2:
        return 0.0
    dot_prod = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_prod / (mag1 * mag2)

class MemoryManager:
    def __init__(self):
        init_db()
        
    def _get_connection(self):
        return sqlite3.connect(DB_PATH)

    def get_api_key(self) -> Optional[str]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", ("GEMINI_API_KEY",))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else os.environ.get("GEMINI_API_KEY")

    def save_api_key(self, key: str):
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("GEMINI_API_KEY", key))
        conn.commit()
        conn.close()

    def get_setting(self, key: str, default: Any = None) -> Any:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else default

    def save_setting(self, key: str, value: str):
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
        conn.commit()
        conn.close()

    def create_project(self, project_id: str, name: str, description: str) -> Dict[str, Any]:
        conn = self._get_connection()
        cursor = conn.cursor()
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (project_id, name, description, "Pending", now, now)
        )
        conn.commit()
        conn.close()
        return {
            "id": project_id,
            "name": name,
            "description": description,
            "status": "Pending",
            "created_at": now,
            "updated_at": now
        }

    def update_project_status(self, project_id: str, status: str):
        conn = self._get_connection()
        cursor = conn.cursor()
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute(
            "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
            (status, now, project_id)
        )
        conn.commit()
        conn.close()

    def get_projects(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        projects = [dict(row) for row in rows]
        conn.close()
        return projects

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        project = dict(row) if row else None
        conn.close()
        return project

    def log_agent_activity(self, project_id: str, agent_name: str, status: str, message: str):
        conn = self._get_connection()
        cursor = conn.cursor()
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT INTO project_logs (project_id, agent_name, status, message, timestamp) VALUES (?, ?, ?, ?, ?)",
            (project_id, agent_name, status, message, now)
        )
        conn.commit()
        conn.close()

    def get_project_logs(self, project_id: str) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM project_logs WHERE project_id = ? ORDER BY id ASC", (project_id,))
        rows = cursor.fetchall()
        logs = [dict(row) for row in rows]
        conn.close()
        return logs

    def save_file(self, project_id: str, path: str, content: str):
        conn = self._get_connection()
        cursor = conn.cursor()
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT OR REPLACE INTO project_files (project_id, path, content, updated_at) VALUES (?, ?, ?, ?)",
            (project_id, path, content, now)
        )
        conn.commit()
        conn.close()

    def get_project_files(self, project_id: str) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT path, updated_at FROM project_files WHERE project_id = ?", (project_id,))
        rows = cursor.fetchall()
        files = [dict(row) for row in rows]
        conn.close()
        return files

    def get_file_content(self, project_id: str, path: str) -> Optional[str]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT content FROM project_files WHERE project_id = ? AND path = ?", (project_id, path))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None

    # Vector Memory methods
    async def add_memory(self, project_id: str, agent_name: str, content: str):
        # We generate the vector embedding. We first try using Google Generative AI if key is set.
        api_key = self.get_api_key()
        embedding = None
        
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=content,
                    task_type="retrieval_document"
                )
                embedding = result['embedding']
            except Exception as e:
                # If API call fails, fall back to pure TF-IDF vector
                embedding = get_tfidf_embedding(content)
        else:
            embedding = get_tfidf_embedding(content)
            
        memory_id = f"{project_id}_{agent_name}_{datetime.datetime.utcnow().timestamp()}"
        now = datetime.datetime.utcnow().isoformat()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO memories (id, project_id, agent_name, content, embedding, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (memory_id, project_id, agent_name, content, json.dumps(embedding), now)
        )
        conn.commit()
        conn.close()

    async def search_memory(self, project_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        # Compute query embedding
        api_key = self.get_api_key()
        query_embedding = None
        
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=query,
                    task_type="retrieval_query"
                )
                query_embedding = result['embedding']
            except Exception:
                query_embedding = get_tfidf_embedding(query)
        else:
            query_embedding = get_tfidf_embedding(query)
            
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM memories WHERE project_id = ?",
            (project_id,)
        )
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            record = dict(row)
            if record['embedding']:
                record_emb = json.loads(record['embedding'])
                score = cosine_similarity(query_embedding, record_emb)
                record['score'] = score
                results.append(record)
                
        # Sort by similarity score descending
        results.sort(key=lambda x: x.get('score', 0), reverse=True)
        conn.close()
        return results[:limit]
