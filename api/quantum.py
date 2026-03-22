import sys
import os
from pathlib import Path

# Fix: Ensure project root is in sys.path for sibling imports
root_path = Path(__file__).resolve().parent.parent
if str(root_path) not in sys.path:
    sys.path.append(str(root_path))

try:
    from quantum_service.main import app
except (ImportError, ModuleNotFoundError):
    sys.path.append(os.getcwd())
    from quantum_service.main import app

# Vercel expects a variable named 'app' to be the ASGI/WSGI application
