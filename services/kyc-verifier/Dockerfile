FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download DeepFace model at build time
RUN python -c "from deepface import DeepFace; DeepFace.build_model('Facenet')"

COPY app/ /app/app/

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
