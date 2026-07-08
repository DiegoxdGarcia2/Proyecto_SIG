import React, { useEffect, useState } from "react";
import { StyleSheet, View, Vibration, SafeAreaView, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
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
import { SimulatorScreen } from "./src/screens/SimulatorScreen";
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
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // Hook de WebSocket consumido dinámicamente con los parámetros del rol correspondiente
  const { status, lastAlert, setLastAlert } = useWebSocket(
    username || "",
    role,
    companyId,
    kindergartenId,
    classroomId
  );
  const isAlarm = status === "ALARM";

  // Cargar historial de alertas inicial desde el backend para el tutor
  useEffect(() => {
    if (token && role === "tutor") {
      fetchHistory();
    }
  }, [token, role, selectedChild]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(getApiUrl("/tutor/logs"), {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryLogs(data);
      }
    } catch (e) {
      console.error("Error al cargar historial de alertas:", e);
    }
  };

  // Inyectar alertas en vivo en el historial
  useEffect(() => {
    if (lastAlert) {
      const newLog = {
        id: Date.now().toString(),
        child_name: lastAlert.child_name || selectedChild?.name,
        status: lastAlert.type === "ALERT" ? "ALARM" : "SAFE",
        timestamp: lastAlert.timestamp || new Date().toISOString(),
        message: lastAlert.message || "Evento de geocerca detectado"
      };
      setHistoryLogs(prev => {
        // Evitar duplicados rápidos
        if (prev.length > 0 && prev[0].message === newLog.message && (Date.now() - new Date(prev[0].timestamp).getTime() < 3000)) {
          return prev;
        }
        return [newLog, ...prev].slice(0, 30);
      });
    }
  }, [lastAlert]);

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

  // Si no ha seleccionado niño, mostrar el selector para TODOS los roles
  if (!selectedChild) {
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

            {/* Historial de Ubicaciones / Alertas del Tutor */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>📋 Historial de Alertas y Eventos</Text>
              <ScrollView style={styles.historyScroll}>
                {historyLogs.length === 0 ? (
                  <Text style={styles.emptyHistory}>Sin eventos registrados recientemente...</Text>
                ) : (
                  historyLogs.map((log: any) => {
                    const isAlarmLog = log.status === "ALARM" || log.event_type === "GEOFENCE_EXIT";
                    const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <View key={log.id || log._id} style={styles.historyRow}>
                        <Text style={styles.historyTime}>[{formattedTime}]</Text>
                        <Text style={[styles.historyMsg, isAlarmLog ? styles.historyError : styles.historySuccess]}>
                          {log.message || (isAlarmLog ? `¡Alerta! ${log.child_name} salió del área segura.` : `${log.child_name} volvió al área segura.`)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        ) : (
          // El profesor o admin ven directamente el simulador para hacer pruebas de notificaciones y geofencing
          <SimulatorScreen onBackToSelector={() => selectChild(null)} />
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
  historyCard: {
    width: "90%",
    backgroundColor: "#111827", // Fondo oscuro sólido de alto contraste
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)", // Borde brillante para delimitar la sección
    padding: 15,
    borderRadius: 14,
    marginTop: 15,
    flex: 1,
    maxHeight: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff", // Título en blanco puro
    marginBottom: 8,
  },
  historyScroll: {
    flex: 1,
  },
  historyRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  historyTime: {
    fontSize: 11,
    color: "#9ca3af", // Tiempo en gris claro legible
    marginRight: 8,
    fontFamily: "monospace",
    minWidth: 72,
    fontWeight: "600",
  },
  historyMsg: {
    fontSize: 12,
    flex: 1,
    color: "#e5e7eb", // Texto por defecto en gris muy claro
  },
  historyError: {
    color: "#f87171", // Rojo brillante para salida/alarma
    fontWeight: "bold",
  },
  historySuccess: {
    color: "#34d399", // Verde brillante para retorno seguro
    fontWeight: "bold",
  },
  emptyHistory: {
    color: "#9ca3af",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
});
