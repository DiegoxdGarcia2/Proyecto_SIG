import { Platform } from "react-native";

// Detectar si la app está en modo desarrollo local o en producción
const isLocal = (): boolean => {
  // Retornamos false temporalmente para forzar pruebas contra produccion (GCP) en localhost:8081
  return false; 
};

export const getApiUrl = (endpoint: string): string => {
  if (isLocal()) {
    return `http://localhost:8000/api/v1${endpoint}`;
  }
  // URL del backend desplegado en Google Cloud Run
  return `https://backend-6161081745.us-central1.run.app/api/v1${endpoint}`;
};

export const getWsUrl = (endpoint: string): string => {
  if (isLocal()) {
    return `ws://localhost:8000/api/v1${endpoint}`;
  }
  // URL del websocket seguro en Google Cloud Run
  return `wss://backend-6161081745.us-central1.run.app/api/v1${endpoint}`;
};
