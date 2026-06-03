# Praxis sandbox runner image.
#
# One container per execution job. The DockerExecutor runs this image with no
# network, a read-only root filesystem, dropped capabilities, resource limits,
# and a non-root user. The scientific stack is pre-installed (no pip at runtime).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MPLBACKEND=Agg \
    MPLCONFIGDIR=/tmp

# Curated, pinned-by-image scientific dependencies. No runtime installs.
RUN pip install --no-cache-dir \
    numpy \
    sympy \
    matplotlib \
    pandas

# Non-root user and the controlled artifact output directory.
RUN useradd -m -u 10001 runner \
    && mkdir -p /workspace/output \
    && chown -R 10001:10001 /workspace

COPY run_user_code.py /opt/run_user_code.py

USER 10001
WORKDIR /workspace

# The executor overrides CMD with the path to the mounted user code.
CMD ["python", "/opt/run_user_code.py", "/workspace/code/code.py"]
