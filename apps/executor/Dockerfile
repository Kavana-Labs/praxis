FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV MPLBACKEND=Agg

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10001 executor

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Service + shared runner script (the runner is also used by the subprocess backend).
COPY app ./app
COPY runner ./runner
COPY main.py ./

RUN chown -R executor:executor /app
USER executor

EXPOSE 8000

# In Compose the default backend is set to `subprocess` (the scientific stack is installed in
# this image). For per-job container isolation, run the service on the host with the Docker
# backend — see docs/execution-service.md.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
