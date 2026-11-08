"""Explicit one-off checkpoint schema setup; never run automatically on API startup."""
import asyncio
from config.production import validate_settings
from services.agent_checkpoints import checkpoint_lifespan

async def main():
    validate_settings()
    async with checkpoint_lifespan(setup=True):
        print('Checkpoint schema is ready.')

if __name__ == '__main__':
    asyncio.run(main())
