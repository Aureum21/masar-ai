"""Container probe for the worker event loop; queue connectivity is reported in logs."""
import os
import tempfile
import time
from pathlib import Path

def healthy():
    path=Path(os.getenv('WORKER_HEARTBEAT_FILE',str(Path(tempfile.gettempdir())/'masar-worker-heartbeat')))
    try:
        return time.time()-path.stat().st_mtime < 45
    except OSError:
        return False

if __name__ == '__main__':
    raise SystemExit(0 if healthy() else 1)
