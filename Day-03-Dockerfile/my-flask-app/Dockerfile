FROM python:3.9-slim

WORKDIR /app

# Copy requirements FIRST (separate layer — Docker can cache this!)
COPY requirements.txt .

# Install dependencies (this layer is cached if requirements.txt didn't change)
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the app (this layer changes more often)
COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]