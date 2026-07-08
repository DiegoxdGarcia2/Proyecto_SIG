import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { getApiUrl } from "../utils/api";

export const LOCATION_TRACKING_TASK = "child-location-tracking-task";

interface BackgroundLocationHook {
  isTracking: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

export function useBackgroundLocation(): BackgroundLocationHook {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkTrackingStatus();
  }, []);

  const checkTrackingStatus = async () => {
    try {
      const active = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      setIsTracking(active);
    } catch (e) {
      setError("No se pudo comprobar el estado del tracking.");
    }
  };

  const startTracking = async () => {
    setError(null);
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        setError("Permiso de ubicación en primer plano denegado.");
        return;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== "granted") {
        setError("Permiso de ubicación en segundo plano denegado. Se requiere para el monitoreo.");
        return;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000, // Cada 15 segundos
        distanceInterval: 5,  // O cada 5 metros
        foregroundService: {
          notificationTitle: "Monitoreo SIG Activo",
          notificationBody: "Transmitiendo ubicación del niño al servidor en tiempo real.",
          notificationColor: "#3b82f6",
        },
      });

      setIsTracking(true);
    } catch (e: any) {
      setError(e.message || "Error al iniciar el tracking en segundo plano.");
    }
  };

  const stopTracking = async () => {
    try {
      const active = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      if (active) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      }
      setIsTracking(false);
    } catch (e: any) {
      setError(e.message || "Error al detener el tracking.");
    }
  };

  return { isTracking, error, startTracking, stopTracking };
}

// Registro global de la tarea en segundo plano
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("Error en tarea de background location:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (!locations || locations.length === 0) return;
    const lastLoc = locations[locations.length - 1];
    
    try {
      const childDataStr = await AsyncStorage.getItem("user_selected_child");
      const tutorId = await AsyncStorage.getItem("user_username");
      
      if (childDataStr && tutorId) {
        const childData = JSON.parse(childDataStr);
        await fetch(getApiUrl("/tracking/update"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: childData.deviceId,
            tutor_id: tutorId,
            location: {
              type: "Point",
              coordinates: [lastLoc.coords.longitude, lastLoc.coords.latitude]
            }
          })
        });
      }
    } catch (e) {
      console.error("Error al enviar posición en background:", e);
    }
  }
});
