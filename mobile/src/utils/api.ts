import { Platform } from "react-native";

export const getApiUrl = (endpoint: string): string => {
  // Si se corre en el navegador web (Chrome), apuntar a localhost. 
  // Si corre en emulador Android, usar la IP especial de puente 10.0.2.2.
  const host = Platform.OS === "web" ? "localhost" : "10.0.2.2";
  return `http://${host}:8000/api/v1${endpoint}`;
};

export const getWsUrl = (endpoint: string): string => {
  const host = Platform.OS === "web" ? "localhost" : "10.0.2.2";
  return `ws://${host}:8000/api/v1${endpoint}`;
};
