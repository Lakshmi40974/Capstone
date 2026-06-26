import os
import re
import json
import asyncio
import logging
from typing import Dict, Any, List, Callable, Awaitable
from backend.agents import get_all_agents, BaseAgent
from backend.memory import MemoryManager

logger = logging.getLogger(__name__)

# Base Workspace Directory for generated projects
WORKSPACE_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "projects")

class Orchestrator:
    def __init__(self, project_id: str, prompt: str, memory_mgr: MemoryManager, broadcast_fn: Callable[[Dict[str, Any]], Awaitable[None]]):
        self.project_id = project_id
        self.prompt = prompt
        self.memory_mgr = memory_mgr
        self.broadcast = broadcast_fn
        self.project_dir = os.path.join(WORKSPACE_BASE, project_id)
        os.makedirs(self.project_dir, exist_ok=True)
        
        # Load API keys
        self.api_key = memory_mgr.get_api_key()
        self.agents = get_all_agents(self.api_key)
        
        # Initialize execution stats
        self.tokens_used = 0
        self.files_generated = 0
        self.execution_time = 0.0

    async def log_and_broadcast(self, agent_name: str, status: str, message: str):
        logger.info(f"[{agent_name}] {status}: {message}")
        self.memory_mgr.log_agent_activity(self.project_id, agent_name, status, message)
        
        await self.broadcast({
            "type": "log",
            "project_id": self.project_id,
            "agent_name": agent_name,
            "status": status,
            "message": message
        })

    def parse_and_save_files(self, text: str) -> List[str]:
        # Regex to match code blocks with Path comments
        # Matches ```[lang]\n[Path comment]\n[code]```
        # E.g. // Path: src/index.css or # Path: main.py
        pattern = r"```(?:[a-zA-Z0-9+#-]+)?\s*[\r\n]+(?://|#|/\*|<!--)\s*Path:\s*([^\r\n]+)[\s\*]*[\r\n]+(.*?)(?=```)"
        matches = re.findall(pattern, text, re.DOTALL)
        
        saved_paths = []
        for path_str, code in matches:
            clean_path = path_str.strip().replace("\\", "/")
            # Remove trailing comments if any
            clean_path = re.sub(r"\s*\*+/.*$", "", clean_path).strip()
            
            # Ensure path is relative and safe
            if clean_path.startswith("/"):
                clean_path = clean_path[1:]
            
            full_path = os.path.join(self.project_dir, clean_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(code.strip())
                
            self.memory_mgr.save_file(self.project_id, clean_path, code.strip())
            saved_paths.append(clean_path)
            self.files_generated += 1
            
        return saved_paths

    async def execute(self):
        await self.log_and_broadcast("System", "Running", f"Starting project generation for: '{self.prompt}'")
        self.memory_mgr.update_project_status(self.project_id, "In Progress")

        # Check API Key
        if not self.api_key:
            await self.log_and_broadcast("System", "Error", "Gemini API Key is missing. Please add it in settings first.")
            self.memory_mgr.update_project_status(self.project_id, "Failed")
            return

        # Prepare context dict
        context = {
            "prompt": self.prompt,
            "requirements": "",
            "architecture": "",
            "design": "",
            "files": []
        }

        # Sequence of Agents to run
        flow = [
            ("Product Manager", self.run_pm),
            ("Software Architect", self.run_architect),
            ("UI/UX Designer", self.run_uiux),
            ("Research Agent", self.run_research),
            ("Database Engineer", self.run_db_engineer),
            ("Backend Developer", self.run_backend_dev),
            ("Frontend Developer", self.run_frontend_dev),
            ("Code Reviewer", self.run_reviewer),
            ("Security Agent", self.run_security),
            ("QA Testing Agent", self.run_qa),
            ("Performance Agent", self.run_performance),
            ("Debugging Agent", self.run_debugging),
            ("DevOps Agent", self.run_devops),
            ("Documentation Agent", self.run_documentation),
        ]

        for agent_name, agent_step in flow:
            try:
                await self.log_and_broadcast(agent_name, "Working", f"Agent starting analysis...")
                await agent_step(context)
                await self.log_and_broadcast(agent_name, "Completed", f"Agent finished step.")
            except Exception as e:
                await self.log_and_broadcast(agent_name, "Error", f"Failed: {str(e)}")
                # We do not crash the workflow; we let the Debugger agent handle it later
                continue
        
        await self.log_and_broadcast("System", "Completed", f"Generation completed. Total files: {self.files_generated}")
        self.memory_mgr.update_project_status(self.project_id, "Completed")

    # Agent Step Executors
    async def run_pm(self, context: Dict[str, Any]):
        agent = self.agents["Product Manager"]
        prompt = f"Analyze the following software request and build a requirement specification: {self.prompt}"
        response = await agent.run(prompt)
        context["requirements"] = response
        await self.memory_mgr.add_memory(self.project_id, agent.name, response)
        
        # Save requirements spec as a file
        req_path = "docs/requirements.md"
        full_path = os.path.join(self.project_dir, req_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, req_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Created project requirements in docs/requirements.md")

    async def run_architect(self, context: Dict[str, Any]):
        agent = self.agents["Software Architect"]
        prompt = (
            f"Review the requirements:\n\n{context['requirements']}\n\n"
            f"Define a structured folder layout, components list, databases structures, and a Mermaid architecture diagram."
        )
        response = await agent.run(prompt)
        context["architecture"] = response
        await self.memory_mgr.add_memory(self.project_id, agent.name, response)
        
        arch_path = "docs/architecture.md"
        full_path = os.path.join(self.project_dir, arch_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, arch_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Created architecture design in docs/architecture.md")

    async def run_uiux(self, context: Dict[str, Any]):
        agent = self.agents["UI/UX Designer"]
        prompt = (
            f"Review requirements:\n{context['requirements']}\n"
            f"Review architecture:\n{context['architecture']}\n"
            f"Propose styling rules, colors (matching elegant dark theme and glassmorphism), layout guidelines, and UX user journey flow."
        )
        response = await agent.run(prompt)
        context["design"] = response
        await self.memory_mgr.add_memory(self.project_id, agent.name, response)
        
        design_path = "docs/design.md"
        full_path = os.path.join(self.project_dir, design_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, design_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Created UI/UX styling guides in docs/design.md")

    async def run_research(self, context: Dict[str, Any]):
        agent = self.agents["Research Agent"]
        prompt = (
            f"We are building: {self.prompt}. Provide recommendations for core frameworks, libraries, APIs, "
            f"and software best practices for this type of system."
        )
        response = await agent.run(prompt)
        await self.memory_mgr.add_memory(self.project_id, agent.name, response)
        
        res_path = "docs/research.md"
        full_path = os.path.join(self.project_dir, res_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, res_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Completed technology research reports in docs/research.md")

    async def run_db_engineer(self, context: Dict[str, Any]):
        agent = self.agents["Database Engineer"]
        prompt = (
            f"Review requirements and architecture:\n{context['requirements']}\n{context['architecture']}\n"
            f"Design the SQLite and PostgreSQL database tables schema, model relationships, and query index definitions.\n"
            f"Generate SQLAlchemy python model code or SQL schemas as complete code blocks. Wrap them with Path comments on the first line."
        )
        response = await agent.run(prompt)
        saved = self.parse_and_save_files(response)
        
        for path in saved:
            await self.log_and_broadcast(agent.name, "FileCreated", f"Generated database file: {path}")

    async def run_backend_dev(self, context: Dict[str, Any]):
        agent = self.agents["Backend Developer"]
        prompt = (
            f"Review design rules and requirements:\n{context['requirements']}\n{context['architecture']}\n"
            f"Implement the backend routes, endpoints, controller logic, schemas, and authentication scripts (FastAPI/Python).\n"
            f"Make sure to output full complete code files. Wrap them in code blocks specifying their Path in comments on the first line (e.g. # Path: backend/app/main.py)."
        )
        response = await agent.run(prompt)
        saved = self.parse_and_save_files(response)
        
        for path in saved:
            await self.log_and_broadcast(agent.name, "FileCreated", f"Generated backend script: {path}")

    async def run_frontend_dev(self, context: Dict[str, Any]):
        agent = self.agents["Frontend Developer"]
        prompt = (
            f"Review requirements and architecture:\n{context['requirements']}\n{context['architecture']}\n"
            f"Write the React Next.js pages or custom vanilla HTML/JS components and styling details.\n"
            f"Ensure files are complete and use Tailwind CSS styling classes. Wrap them in code blocks specifying their Path in comments on the first line."
        )
        response = await agent.run(prompt)
        saved = self.parse_and_save_files(response)
        
        for path in saved:
            await self.log_and_broadcast(agent.name, "FileCreated", f"Generated frontend file: {path}")

    async def run_reviewer(self, context: Dict[str, Any]):
        agent = self.agents["Code Reviewer"]
        # Fetch list of created files
        files = self.memory_mgr.get_project_files(self.project_id)
        files_details = ""
        for f in files:
            content = self.memory_mgr.get_file_content(self.project_id, f["path"])
            files_details += f"--- FILE: {f['path']} ---\n{content}\n\n"
            
        prompt = (
            f"Review the generated code files:\n{files_details}\n"
            f"Assess bugs, check quality, and give a Code Quality Score (0-100)."
        )
        response = await agent.run(prompt)
        
        rev_path = "docs/code_review.md"
        full_path = os.path.join(self.project_dir, rev_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, rev_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Completed code review. Check details in docs/code_review.md")

    async def run_security(self, context: Dict[str, Any]):
        agent = self.agents["Security Agent"]
        files = self.memory_mgr.get_project_files(self.project_id)
        files_details = ""
        for f in files:
            content = self.memory_mgr.get_file_content(self.project_id, f["path"])
            files_details += f"--- FILE: {f['path']} ---\n{content}\n\n"
            
        prompt = (
            f"Analyze these code files for security vulnerabilities:\n{files_details}\n"
            f"Generate a security audit report listing vulnerability ratings, input sanitizer checks, JWT security, and remediation steps."
        )
        response = await agent.run(prompt)
        
        sec_path = "docs/security_audit.md"
        full_path = os.path.join(self.project_dir, sec_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, sec_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Completed security audit. Details in docs/security_audit.md")

    async def run_qa(self, context: Dict[str, Any]):
        agent = self.agents["QA Testing Agent"]
        files = self.memory_mgr.get_project_files(self.project_id)
        files_details = ""
        for f in files:
            content = self.memory_mgr.get_file_content(self.project_id, f["path"])
            files_details += f"--- FILE: {f['path']} ---\n{content}\n\n"
            
        prompt = (
            f"Write pytest test scripts or frontend Jest testing files for these code structures:\n{files_details}\n"
            f"Ensure to wrap tests in markdown blocks with Path comments on the first line."
        )
        response = await agent.run(prompt)
        saved = self.parse_and_save_files(response)
        
        for path in saved:
            await self.log_and_broadcast(agent.name, "FileCreated", f"Generated testing file: {path}")

    async def run_performance(self, context: Dict[str, Any]):
        agent = self.agents["Performance Agent"]
        files = self.memory_mgr.get_project_files(self.project_id)
        files_details = ""
        for f in files:
            content = self.memory_mgr.get_file_content(self.project_id, f["path"])
            files_details += f"--- FILE: {f['path']} ---\n{content}\n\n"
            
        prompt = (
            f"Check these code implementations for performance bottlenecks:\n{files_details}\n"
            f"Provide recommendations for db query optimizations, memory utilization, and caching strategies."
        )
        response = await agent.run(prompt)
        
        perf_path = "docs/performance_plan.md"
        full_path = os.path.join(self.project_dir, perf_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, perf_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Generated performance optimization plan in docs/performance_plan.md")

    async def run_debugging(self, context: Dict[str, Any]):
        agent = self.agents["Debugging Agent"]
        # We can scan the files, run python compile tests on the backend files, and pass compile warnings to debugger
        errors = []
        files = self.memory_mgr.get_project_files(self.project_id)
        
        # Test compile files in python
        for f in files:
            if f["path"].endswith(".py"):
                file_content = self.memory_mgr.get_file_content(self.project_id, f["path"])
                try:
                    compile(file_content, f["path"], "exec")
                except SyntaxError as e:
                    errors.append(f"Syntax Error in {f['path']}: {str(e)} at line {e.lineno}")
        
        if errors:
            await self.log_and_broadcast(agent.name, "Healing", f"Found errors during static compilation checks: {errors}. Healing code...")
            error_prompt = (
                f"The system detected the following syntax/compilation errors in the files:\n\n"
                f"{json.dumps(errors, indent=2)}\n\n"
                f"Please fix the affected files and return the complete corrected versions wrapped in code blocks specifying the correct Path."
            )
            response = await agent.run(error_prompt)
            saved = self.parse_and_save_files(response)
            for path in saved:
                await self.log_and_broadcast(agent.name, "HealedFile", f"Successfully self-healed: {path}")
        else:
            await self.log_and_broadcast(agent.name, "Success", "Static code compilation check passed. No healing required.")

    async def run_devops(self, context: Dict[str, Any]):
        agent = self.agents["DevOps Agent"]
        prompt = (
            f"We are building: {self.prompt}.\n"
            f"Generate configurations for Docker (Dockerfile, docker-compose.yml) and CI/CD pipelines (GitHub Actions YAML) to build and deploy.\n"
            f"Wrap files in code blocks with relative Path comments on the first line."
        )
        response = await agent.run(prompt)
        saved = self.parse_and_save_files(response)
        
        for path in saved:
            await self.log_and_broadcast(agent.name, "FileCreated", f"Generated DevOps configuration: {path}")

    async def run_documentation(self, context: Dict[str, Any]):
        agent = self.agents["Documentation Agent"]
        files = self.memory_mgr.get_project_files(self.project_id)
        file_list = [f["path"] for f in files]
        
        prompt = (
            f"We have generated a project for: {self.prompt}.\n"
            f"Here are the files we created:\n{json.dumps(file_list, indent=2)}\n\n"
            f"Create a highly professional and descriptive README.md file outlining the project details, "
            f"how to set it up, API routes documentation, and installation scripts."
        )
        response = await agent.run(prompt)
        
        readme_path = "README.md"
        full_path = os.path.join(self.project_dir, readme_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(response)
        self.memory_mgr.save_file(self.project_id, readme_path, response)
        self.files_generated += 1
        
        await self.log_and_broadcast(agent.name, "Success", "Generated documentation index in README.md")
