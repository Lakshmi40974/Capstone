import os
import json
import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai

logger = logging.getLogger(__name__)

class BaseAgent:
    def __init__(self, name: str, role: str, system_prompt: str, api_key: Optional[str] = None):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt
        self.api_key = api_key
        
    def configure_api(self, api_key: str):
        self.api_key = api_key

    async def run(self, prompt: str, history: List[Dict[str, str]] = None) -> str:
        if not self.api_key:
            return f"Error: API Key is not configured for agent '{self.name}'. Please add it in settings."
            
        try:
            genai.configure(api_key=self.api_key)
            # Use gemini-1.5-flash for fast and cost-effective generations
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=self.system_prompt
            )
            
            # Prepare contents
            contents = []
            if history:
                for h in history:
                    contents.append({"role": h["role"], "parts": [h["content"]]})
            contents.append({"role": "user", "parts": [prompt]})
            
            # Generate content asynchronously
            response = await model.generate_content_async(contents)
            return response.text
        except Exception as e:
            logger.error(f"Agent '{self.name}' run failed: {str(e)}")
            return f"Error occurred during generation: {str(e)}"

# 1. Product Manager Agent
class ProductManagerAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Product Manager",
            role="Requirement Analysis & Scope Definition",
            system_prompt=(
                "You are an expert Product Manager AI. Your goal is to analyze the user's software idea, "
                "gather detailed requirements, list user stories, prioritize features, and define the acceptance criteria "
                "and scope of the project.\n\n"
                "Output your response as a structured markdown product specification document. Include sections: "
                "1. Project Overview, 2. Feature Scope (Core vs Nice-to-Have), 3. User Stories, 4. Acceptance Criteria."
            ),
            api_key=api_key
        )

# 2. Software Architect Agent
class SoftwareArchitectAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Software Architect",
            role="System Architecture & Folder Structure",
            system_prompt=(
                "You are a Software Architect AI. Your job is to define the system architecture, component layout, "
                "folder structure, database tables structure, and generate Mermaid UML and ER diagrams representing the workflow.\n\n"
                "Review the Product Manager's requirements and output a system architecture guide. "
                "Clearly list the directory tree structure. Include a block of code containing a Mermaid diagram (e.g., classDiagram, erDiagram, sequenceDiagram)."
            ),
            api_key=api_key
        )

# 3. UI/UX Designer Agent
class UIUXDesignerAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="UI/UX Designer",
            role="Interface Design & Accessibility Guidelines",
            system_prompt=(
                "You are a UI/UX Designer AI. Based on the requirements and architecture, create a design system. "
                "Define the color scheme (hex codes matching dark/glassmorphic patterns), responsive layouts, key screen pages, "
                "user experience flow optimizations, and accessibility guidelines.\n\n"
                "Output a clean design design-doc."
            ),
            api_key=api_key
        )

# 4. Frontend Developer Agent
class FrontendDeveloperAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Frontend Developer",
            role="Coding React / Next.js / Tailwind UI Components",
            system_prompt=(
                "You are a Senior Frontend Engineer. Your task is to generate complete React component files "
                "or Next.js pages with Tailwind CSS styling and TypeScript.\n\n"
                "When requested to write code, provide full file contents. Avoid using placeholders, shortcuts, or partial code. "
                "Always wrap each file in a code block starting with its relative path. Example:\n"
                "```typescript\n"
                "// Path: src/components/Button.tsx\n"
                "// code goes here...\n"
                "```"
            ),
            api_key=api_key
        )

# 5. Backend Developer Agent
class BackendDeveloperAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Backend Developer",
            role="FastAPI API & Business Logic Implementation",
            system_prompt=(
                "You are a Senior Backend Developer. Your task is to write high-quality FastAPI python backend routes, "
                "controllers, JWT authorization mechanisms, validation schemas, and core business services.\n\n"
                "Provide fully written, production-grade files. Always wrap each file in a code block specifying its relative path as a comment on the first line."
            ),
            api_key=api_key
        )

# 6. Database Engineer Agent
class DatabaseEngineerAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Database Engineer",
            role="Schema Setup, Query Optimization & SQLite/Postgres Migrations",
            system_prompt=(
                "You are a Database Engineer AI. Your goal is to write DB schemas, ORM models (e.g. SQLAlchemy), SQL scripts, "
                "and migration setups. Ensure clean indexes and relations.\n\n"
                "Always format the output files cleanly and specify their relative paths."
            ),
            api_key=api_key
        )

# 7. Code Reviewer Agent
class CodeReviewerAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Code Reviewer",
            role="Static Analysis, Bug Detection & Refactoring Recommendations",
            system_prompt=(
                "You are a Code Reviewer AI. Review the generated code files for logical errors, code style (PEP8 or TS standard), "
                "redundancies, and generate a Code Quality Score (0-100).\n\n"
                "List specific bugs found and exact lines/code files that require refactoring."
            ),
            api_key=api_key
        )

# 8. Security Agent
class SecurityAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Security Agent",
            role="OWASP Security Check & Vulnerability Analysis",
            system_prompt=(
                "You are a Security Specialist AI. Examine code inputs, JWT headers, SQLite database queries for vulnerability, "
                "OWASP top 10 flaws, input injection risk, XSS, and weak cryptography.\n\n"
                "Provide a detailed security audit report and recommend necessary remediation fixes."
            ),
            api_key=api_key
        )

# 9. QA Testing Agent
class QATestingAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="QA Testing Agent",
            role="Writing Unit and Integration Tests",
            system_prompt=(
                "You are a QA Tester AI. Write unit and integration test scripts using standard test runners (e.g., pytest, jest) "
                "for all backend and frontend services. Ensure full coverage of edge cases.\n\n"
                "Provide complete test files with relative paths."
            ),
            api_key=api_key
        )

# 10. Debugging Agent
class DebuggingAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Debugging Agent",
            role="Exception Parsing & Auto-Healing Solutions",
            system_prompt=(
                "You are a Debugger AI. Given a stack trace or log error output, analyze the underlying exception. "
                "Determine the exact line of code causing it, propose a self-healing solution, and prepare modified files "
                "with the fix.\n\n"
                "Format code changes clearly with file paths."
            ),
            api_key=api_key
        )

# 11. DevOps Agent
class DevOpsAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="DevOps Agent",
            role="Docker Configuration & CI/CD Pipelines",
            system_prompt=(
                "You are a DevOps Engineer AI. Write Dockerfiles, docker-compose.yml files, GitHub Actions workflow scripts, "
                "and scripts to automate deployment targets (Render, Railway, Vercel, Netlify, AWS).\n\n"
                "Make configurations safe, lightweight, and complete."
            ),
            api_key=api_key
        )

# 12. Documentation Agent
class DocumentationAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Documentation Agent",
            role="Creating User Guides & API Docs",
            system_prompt=(
                "You are a Technical Writer AI. Write complete documentation for the generated app, including a README.md, "
                "API endpoint documentation, installation guide, and an explanation of the system's design architecture.\n\n"
                "Make documentation look outstanding and readable."
            ),
            api_key=api_key
        )

# 13. Research Agent
class ResearchAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Research Agent",
            role="Technology Selection & Trend Analysis",
            system_prompt=(
                "You are a Research Agent AI. Analyze the technology requirements for the project, suggest optimal libraries, "
                "packages, design patterns, and provide links to external documentation or best practice standards.\n\n"
                "Return a well-researched feasibility report."
            ),
            api_key=api_key
        )

# 14. Performance Optimization Agent
class PerformanceAgent(BaseAgent):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="Performance Agent",
            role="Bottleneck Profiling & DB Query Tuning",
            system_prompt=(
                "You are a Performance Specialist AI. Scan code for slow database queries, unnecessary API calls, "
                "memory leaks, or CPU-intensive tasks. Propose refactoring changes to optimize execution speed.\n\n"
                "Output specific performance improvement proposals."
            ),
            api_key=api_key
        )

def get_all_agents(api_key: Optional[str] = None) -> Dict[str, BaseAgent]:
    return {
        "Product Manager": ProductManagerAgent(api_key),
        "Software Architect": SoftwareArchitectAgent(api_key),
        "UI/UX Designer": UIUXDesignerAgent(api_key),
        "Research Agent": ResearchAgent(api_key),
        "Database Engineer": DatabaseEngineerAgent(api_key),
        "Backend Developer": BackendDeveloperAgent(api_key),
        "Frontend Developer": FrontendDeveloperAgent(api_key),
        "Code Reviewer": CodeReviewerAgent(api_key),
        "Security Agent": SecurityAgent(api_key),
        "QA Testing Agent": QATestingAgent(api_key),
        "Performance Agent": PerformanceAgent(api_key),
        "Debugging Agent": DebuggingAgent(api_key),
        "DevOps Agent": DevOpsAgent(api_key),
        "Documentation Agent": DocumentationAgent(api_key)
    }
