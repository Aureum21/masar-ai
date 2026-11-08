"""Validate settings and dependencies without printing secrets or calling providers."""
import importlib
import sys
from config.production import validate_settings

def main():
    try:
        validate_settings()
        for module in ('main','MasarAi','PIL','langgraph.checkpoint.postgres.aio','psycopg_pool','faiss'):
            importlib.import_module(module)
    except Exception as error:
        if isinstance(error, RuntimeError) and str(error).startswith('Production configuration rejected:'):
            print(error)
        else:
            print('Deployment check failed:', type(error).__name__, '(check server configuration/dependencies)')
        return 1
    print('Configuration and backend imports validated. No providers invoked.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
