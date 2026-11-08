"""Health probe for the dedicated evidence worker; no inference or API calls."""
import os
from pathlib import Path
import tempfile
import time

if __name__ == '__main__':
    path = Path(os.getenv('EVIDENCE_HEARTBEAT_FILE', str(Path(tempfile.gettempdir())/'masar-evidence-heartbeat')))
    raise SystemExit(0 if path.exists() and time.time()-path.stat().st_mtime < 60 else 1)
