FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads
USER appuser

ENTRYPOINT ["docker-entrypoint.sh"]

# Default to production mode (gunicorn with uvicorn workers)
# For development, override with --reload flag via docker-compose
CMD ["sh", "-c", "if [ \"$ENVIRONMENT\" = \"development\" ]; then uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload; else gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000; fi"]
