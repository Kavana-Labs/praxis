FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y \
    build-essential \ 
    curl \ 
    git \
    ca-certificates \ 
    && rm -rf /var/lib/apt/lists/*


RUN useradd -m -u 10001 executor 

WORKDIR /app 


COPY requirements.txt . 
RUN pip install --upgrade pip && pip install -r requirements.txt 


COPY app ./app   

RUN chown -R executor:executor /app 
USER executor 

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]