FROM python:3.11-slim

# Evitar que Python escriba archivos .pyc en disco y habilitar logs instantáneos
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY . .

# Puerto expuesto por defecto en Cloud Run
EXPOSE 8080

# Ejecutar la aplicación con Uvicorn en el puerto 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
