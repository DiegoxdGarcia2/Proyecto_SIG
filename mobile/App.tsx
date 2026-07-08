import React, { useEffect, useState } from "react";
import { StyleSheet, View, Vibration, SafeAreaView, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useWebSocket } from "./src/hooks/useWebSocket";
import { StatusHeader } from "./src/components/StatusHeader";
import { MapViewContainer } from "./src/components/MapViewContainer";
import { registerForPushNotificationsAsync } from "./src/hooks/registerForPushNotifications";
import { SimulatorMapView } from "./src/components/SimulatorMapView";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { getApiUrl } from "./src/utils/api";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ChildSelectorScreen } from "./src/screens/ChildSelectorScreen";
import { TrackingScreen } from "./src/screens/TrackingScreen";
import { AlertBanner } from "./src/components/AlertBanner";

// Coordenadas del Kindergarten Piloto UAGRM (Latitud, Longitud)
const KINDER_POLY = [
  { latitude: -17.7780, longitude: -63.1930 },
  { latitude: -17.7740, longitude: -63.1930 },
  { latitude: -17.7740, longitude: -63.1900 },
  { latitude: -17.7780, longitude: -63.1900 },
];

function AppContent() {
  const { 
    token, 
    role, 
    username, 
    companyId, 
    kindergartenId, 
    classroomId, 
    selectedChild, 
    selectChild, 
    loading, 
    logout 
  } = useAuth();
  const [appMode, setAppMode] = useState<"tutor" | "child_simulator" | "gps_real">("tutor");

  // Hook de WebSocket consumido dinámicamente con los parámetros del rol correspondiente
  const { status, lastAlert, setLastAlert } = useWebSocket(
    username || "",
    role,
    companyId,
    kindergartenId,
    classroomId
  );
  const isAlarm = status === "ALARM";

  // Registro de notificaciones push dinámico (FCM fallback)
  useEffect(() => {
    if (token && username) {
      registerForPushNotificationsAsync(username);
    }
  }, [token, username]);

  // Manejar vibraciones físicas de emergencia
  useEffect(() => {
    if (isAlarm) {
      // Patrón de vibración continuo si hay una alerta activa
      const interval = setInterval(() => {
        Vibration.vibrate([0, 500, 200, 500]);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      Vibration.cancel();
    }
  }, [isAlarm]);

  // Si es profesor o administrador, por defecto lo llevamos a la pantalla de GPS Real o Simulador
  useEffect(() => {
    if (role && role !== "tutor") {
      setAppMode("gps_real");
    } else {
      setAppMode("tutor");
    }
  }, [role]);

  // Variables y funciones para el simulador GPS
  const [childLat, setChildLat] = useState(-17.7760);
  const [childLon, setChildLon] = useState(-63.1915);
  const [simResponse, setSimResponse] = useState<string>("Ninguna actualización enviada");
  const [simIsSafe, setSimIsSafe] = useState<boolean>(true);

  const sendSimulatedLocation = async (lat: number, lon: number) => {
    if (!selectedChild) return;
    try {
      const response = await fetch(getApiUrl("/tracking/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: selectedChild.deviceId,
          tutor_id: username || "web_simulator",
          location: {
            type: "Point",
            coordinates: [lon, lat],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSimIsSafe(data.is_safe);
        setSimResponse(`Enviado: ${data.status} (is_safe: ${data.is_safe})`);
      } else {
        setSimResponse(`Error de API: ${await response.text()}`);
      }
    } catch (e: any) {
      setSimResponse(`Error de conexión: ${e.message}`);
    }
  };

  const handleSimulatorMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setChildLat(latitude);
    setChildLon(longitude);
    sendSimulatedLocation(latitude, longitude);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  // Si no ha seleccionado niño y es Tutor o Profesor (que simula o visualiza a sus alumnos)
  if (!selectedChild && role === "tutor") {
    return <ChildSelectorScreen />;
  }

  return (
    <SafeAreaView style={[styles.container, isAlarm && styles.containerAlarm]}>
      <StatusBar style={isAlarm ? "light" : "dark"} />
      
      {/* Banner de alertas in-app global para móviles */}
      <AlertBanner alert={lastAlert} onClose={() => setLastAlert(null)} />

      {/* Barra de navegación nativa según roles */}
      <View style={styles.navBar}>
        {role === "tutor" ? (
          <View style={styles.tutorHeader}>
            <Text style={styles.tutorHeaderText}>Monitoreo: {selectedChild?.name}</Text>
            <TouchableOpacity style={styles.changeChildBtn} onPress={() => selectChild(null)}>
              <Text style={styles.changeChildText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.adminNav}>
            <View>
              <Text style={styles.tutorHeaderText}>Vista: {role === "teacher" ? "Profesor" : "Administrador"}</Text>
              <Text style={{ fontSize: 10, color: "#6b7280" }}>Aula: Pre-Kínder A</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {role === "tutor" ? (
          <View style={styles.fullWidth}>
            <StatusHeader status={status} />
            <MapViewContainer lastAlert={lastAlert} status={status} />
          </View>
        ) : (
          // El profesor o admin ven directamente la pantalla de GPS Real/Historial en web view
          <TrackingScreen onBackToSelector={logout} />
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  containerAlarm: {
    backgroundColor: "#fee2e2",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0e1a",
  },
  navBar: {
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  tutorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tutorHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  changeChildBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  changeChildText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  adminNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  navButtonActive: {
    backgroundColor: "#3b82f6",
  },
  navButtonText: {
    fontWeight: "bold",
    color: "#4b5563",
    fontSize: 12,
  },
  navButtonTextActive: {
    color: "#ffffff",
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 12,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 15,
    width: "100%",
  },
  fullWidth: {
    width: "100%",
    height: "100%",
    alignItems: "center",
  },
  mapWrapper: {
    width: "90%",
    height: "55%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  simCard: {
    width: "90%",
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  simTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  simInstructions: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  simStatus: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  textSafe: {
    color: "#10b981",
  },
  textAlarm: {
    color: "#ef4444",
  },
  backButton: {
    marginTop: 15,
    paddingVertical: 10,
    width: "90%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  backButtonText: {
    color: "#4b5563",
    fontWeight: "bold",
    fontSize: 14,
  },
});
