# Use explicit lightweight Python base
FROM python:3.10-slim

# Create a non-root user with ID 1000 matching Hugging Face specifications
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Pre-install system tools safely if required
USER root
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
USER user

# Leverage Docker cache layer for dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn flask-cors

# Copy the rest of the backend files and fix ownership
COPY --chown=user . .

EXPOSE 7860

# Run with Gunicorn bound to Hugging Face's mandatory port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "--timeout", "120", "app:app"]
