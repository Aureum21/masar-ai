"""Worker health diagnostics use fake sessions and temporary files only."""
import asyncio
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch
from tools.evidence_worker import probe_health, health_loop, failure_hint


class Session:
    def __init__(self, execute): self.execute=execute
    async def __aenter__(self): return self
    async def __aexit__(self,*args): pass


class EvidenceHealthTests(unittest.IsolatedAsyncioTestCase):
    async def test_healthy_probe_creates_nested_heartbeat(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'nested'/'heartbeat'
            execute=AsyncMock()
            await probe_health(lambda:Session(execute),path)
            self.assertTrue(path.exists())
            execute.assert_awaited_once()

    async def test_failed_probe_does_not_write_success(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'heartbeat'
            with self.assertRaises(ConnectionError):
                await probe_health(lambda:Session(AsyncMock(side_effect=ConnectionError('private host'))),path)
            self.assertFalse(path.exists())
            self.assertNotIn('private host',failure_hint(ConnectionError('private host')))

    async def test_health_loop_recovers_after_failure(self):
        probe=AsyncMock(side_effect=[TimeoutError(),None])
        with patch('tools.evidence_worker.probe_health',probe),patch('tools.evidence_worker.asyncio.sleep',AsyncMock(side_effect=[None,asyncio.CancelledError()])),self.assertLogs('tools.evidence_worker',level='INFO') as logs:
            with self.assertRaises(asyncio.CancelledError):
                await health_loop(None,Path('unused'))
        self.assertEqual(probe.await_count,2)
        self.assertTrue(any('timed out' in line for line in logs.output))
        self.assertTrue(any('queue connected' in line for line in logs.output))
