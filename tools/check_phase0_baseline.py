"""Offline Python syntax/dependency baseline; does not import app or read .env."""
import argparse
import ast
import importlib.metadata
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
args = parser.parse_args()
root = args.root.resolve()
files = sorted(set(root.glob("*.py")) | set((root / "services").rglob("*.py"))
               | set((root / "alembic").rglob("*.py")) | set((root / "config").rglob("*.py")))
errors = []
for path in files:
    try:
        ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    except (SyntaxError, UnicodeError) as exc:
        errors.append({"file": str(path.relative_to(root)), "error": str(exc)})
versions = {}
for name in ["fastapi", "uvicorn", "sqlalchemy", "asyncpg", "alembic", "pydantic",
             "langgraph", "langchain-core", "langchain-openai", "httpx", "python-dotenv"]:
    try:
        versions[name] = importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        versions[name] = "NOT INSTALLED"
print(json.dumps({"syntaxFiles": len(files), "syntaxErrors": errors, "dependencies": versions,
                  "databaseContacted": False, "providersContacted": False}, indent=2))
raise SystemExit(1 if errors else 0)
