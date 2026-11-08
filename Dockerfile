# Build the same non-root backend image for API, worker and one-off migration jobs.
FROM python:3.11-slim-bookworm@sha256:90d117a7f1ef6535dc75831e1a9184725757fede0d4d424d7977fb5429d50610
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock && pip check
COPY *.py alembic.ini ./
COPY config ./config
COPY domain ./domain
COPY routers ./routers
COPY passport ./passport
COPY receipts ./receipts
COPY services ./services
COPY tools ./tools
COPY alembic ./alembic
COPY data ./data
RUN groupadd --gid 10001 masar && useradd --uid 10001 --gid masar --create-home masar && \
    mkdir -p /var/lib/masar/evidence /var/lib/masar/receipts && chown -R masar:masar /var/lib/masar
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000","--workers","1","--no-server-header"]
