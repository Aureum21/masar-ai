"""Deployment settings. Production is explicit and fails closed."""
import os
import secrets
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from config.runtime import load_environment

def production():
    return os.getenv('MASAR_ENV', 'development') == 'production'

def csv_setting(name, default=''):
    return [value.strip() for value in os.getenv(name, default).split(',') if value.strip()]

def signing_key():
    load_environment()
    key = os.getenv('SECRET_KEY', '')
    if key:
        return key
    if production():
        raise RuntimeError('Production requires SECRET_KEY')
    # No shared/public fallback key. Set SECRET_KEY for stable local sessions.
    return secrets.token_hex(32)

def cors_origins():
    return csv_setting('CORS_ORIGINS', '' if production() else 'http://localhost:3000,http://127.0.0.1:3000')

def allowed_hosts():
    return csv_setting('API_ALLOWED_HOSTS') + ['localhost', '127.0.0.1'] if production() else ['*']

def validate_settings():
    load_environment()
    if os.getenv('MASAR_ENV', 'development') not in ('development', 'test', 'production'):
        raise RuntimeError('Unknown MASAR_ENV; use development, test or production')
    if not production():
        return
    problems = []
    key = os.getenv('SECRET_KEY', '')
    if len(key) < 32 or key.lower().startswith(('your_', 'change', 'replace', '09d25e094faa6')):
        problems.append('SECRET_KEY must be a unique random secret of at least 32 characters')
    db = os.getenv('DATABASE_URL', '')
    parsed = urlparse(db)
    if parsed.scheme not in ('postgresql', 'postgresql+asyncpg') or not parsed.hostname or not parsed.username or not parsed.password:
        problems.append('DATABASE_URL must explicitly configure PostgreSQL')
    if parsed.hostname not in ('localhost', '127.0.0.1', 'postgres'):
        query = parse_qs(parsed.query)
        if not (query.get('sslmode', [''])[0] in ('require', 'verify-ca', 'verify-full') or query.get('ssl', [''])[0] in ('true', 'require')):
            problems.append('Remote DATABASE_URL requires explicit TLS')
    origins = cors_origins()
    if not origins or any(urlparse(origin).scheme != 'https' or not urlparse(origin).hostname or urlparse(origin).path not in ('', '/') or '*' in origin for origin in origins):
        problems.append('CORS_ORIGINS requires explicit HTTPS frontend origins')
    frontend = os.getenv('frontend_url', '').rstrip('/')
    if frontend not in [origin.rstrip('/') for origin in origins]:
        problems.append('frontend_url must match a configured HTTPS frontend origin')
    hosts = csv_setting('API_ALLOWED_HOSTS')
    if not hosts or any('*' in host or '/' in host or ':' in host for host in hosts):
        problems.append('API_ALLOWED_HOSTS requires explicit hostnames')
    checkpoint = os.getenv('CHECKPOINT_DATABASE_URL')
    if checkpoint:
        parsed_checkpoint=urlparse(checkpoint)
        checkpoint_query=parse_qs(parsed_checkpoint.query)
        if parsed_checkpoint.hostname not in ('localhost','127.0.0.1','postgres') and not (checkpoint_query.get('sslmode',[''])[0] in ('require','verify-ca','verify-full') or checkpoint_query.get('ssl',[''])[0] in ('true','require')):
            problems.append('Remote CHECKPOINT_DATABASE_URL requires explicit TLS')
    if os.getenv('AWS_PROFILE'):
        problems.append('Remove desktop AWS_PROFILE; configure a scoped production workload identity')
    if not os.getenv('S3_BUCKET_NAME'):
        problems.append('S3_BUCKET_NAME must identify the private attraction bucket')
    if os.getenv('CHECKPOINT_BACKEND', 'postgres') != 'postgres':
        problems.append('Production requires PostgreSQL checkpoints')
    evidence = os.getenv('PASSPORT_EVIDENCE_DIR', '')
    if not evidence or not Path(evidence).is_absolute():
        problems.append('PASSPORT_EVIDENCE_DIR must be an absolute persistent private directory')
    evidence_backend = os.getenv('PASSPORT_EVIDENCE_STORAGE', 'local')
    if evidence_backend not in {'local', 's3'}:
        problems.append('PASSPORT_EVIDENCE_STORAGE must be local or s3')
    if evidence_backend == 's3' and not os.getenv('PASSPORT_EVIDENCE_BUCKET'):
        problems.append('PASSPORT_EVIDENCE_BUCKET must identify the private evidence bucket')
    if os.getenv('TRAVEL_PROVIDER_ENVIRONMENT', 'sandbox') != 'sandbox' or not os.getenv('NUTIEE_API_KEY', '').startswith('sand_'):
        problems.append('This deployment package supports sandbox travel bookings only')
    if not os.getenv('OPENAI_API_KEY'):
        problems.append('OPENAI_API_KEY is required for the configured agents')
    if problems:
        # Setting names only: never echo secret values or connection URLs.
        raise RuntimeError('Production configuration rejected: ' + '; '.join(problems))
