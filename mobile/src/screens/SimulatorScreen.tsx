import React, { useState, useRef, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../utils/api";

// Coordenadas de la geocerca del Kinder Piloto UAGRM (centro aproximado)
const INSIDE_LAT = -17.776;
const INSIDE_LNG = -63.1915;
// Coordenadas claramente fuera de la geocerca (150m al norte)
const OUTSIDE_LAT = -17.773;
const OUTSIDE_LNG = -63.1915;

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

/**
 * Pantalla de simulación GPS interactiva para probar el geofencing.
 * Envía coordenadas reales al backend para probar el análisis espacial
 * y la cadena de notificaciones WebSocket a todos los roles.
 */
export const SimulatorScreen: React.FC<{ onBackToSelector: () => void }> = ({
  onBackToSelector,
}) => {
  const { selectedChild, username, logout } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [childStatus, setChildStatus] = useState<string>("SAFE");
  const [lastCoords, setLastCoords] = useState({ lat: INSIDE_LAT, lng: INSIDE_LNG });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  // Si no hay un niño seleccionado (flujo administrador), asignamos por defecto a Juanito Pérez
  const activeChild = selectedChild || {
    id: "6a4dc2e5b2a679848e2eb3d2",
    name: "Juanito Pérez",
    deviceId: "dispositivo_juanito_123"
  };

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      logIdRef.current += 1;
      const entry: LogEntry = {
        id: logIdRef.current,
        time: new Date().toLocaleTimeString(),
        message,
        type,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 30));
    },
    [],
  );

  /**
   * Envía una posición al endpoint /tracking/update del backend.
   */
  const sendPosition = async (lat: number, lng: number, label: string) => {
    if (!activeChild) return;
    setIsSending(true);
    setLastCoords({ lat, lng });
    addLog(`📡 Enviando posición ${label}: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);

    try {
      const response = await fetch(getApiUrl("/tracking/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: activeChild.deviceId,
          tutor_id: username || "web_simulator",
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChildStatus(data.status);

        if (data.status === "OUTSIDE") {
          addLog(
            `🚨 ¡ALERTA! ${activeChild.name} FUERA de la geocerca. El backend notificó a tutores, profesores y admins.`,
            "error",
          );
        } else {
          addLog(
            `✅ ${activeChild.name} está SEGURO dentro de la geocerca.`,
            "success",
          );
        }
      } else {
        const err = await response.json().catch(() => ({}));
        addLog(`❌ Error del servidor: ${err.detail || response.statusText}`, "error");
      }
    } catch (e: any) {
      addLog(`❌ Error de conexión: ${e.message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateExit = () => {
    sendPosition(OUTSIDE_LAT, OUTSIDE_LNG, "FUERA de geocerca");
  };

  const handleSimulateReturn = () => {
    sendPosition(INSIDE_LAT, INSIDE_LNG, "DENTRO de geocerca");
  };

  const handleCustomPosition = (deltaLat: number, deltaLng: number, dir: string) => {
    const newLat = lastCoords.lat + deltaLat;
    const newLng = lastCoords.lng + deltaLng;
    sendPosition(newLat, newLng, `movimiento ${dir}`);
  };

  // Generar URL del mapa con el marcador actual
  const zoomDelta = 0.006;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lastCoords.lng - zoomDelta}%2C${lastCoords.lat - zoomDelta}%2C${lastCoords.lng + zoomDelta}%2C${lastCoords.lat + zoomDelta}&layer=mapnik&marker=${lastCoords.lat}%2C${lastCoords.lng}`;

  const statusColor = childStatus === "OUTSIDE" ? "#ef4444" : "#10b981";
  const statusLabel = childStatus === "OUTSIDE" ? "⚠️ FUERA DE GEOCERCA" : "✅ SEGURO";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header con info del niño */}
        <View style={styles.card}>
          <Text style={styles.title}>🛰️ Simulador GPS: {activeChild?.name}</Text>
          <Text style={styles.subtitle}>
            Dispositivo: {activeChild?.deviceId}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado actual:</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.coordsText}>
            📍 Lat: {lastCoords.lat.toFixed(5)} | Lng: {lastCoords.lng.toFixed(5)}
          </Text>
        </View>

        {/* Botones de simulación principales */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Simulación Rápida</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.simButton, styles.exitButton]}
              onPress={handleSimulateExit}
              disabled={isSending}
            >
              <Text style={styles.simButtonText}>
                🚨 Simular SALIDA{"\n"}de Geocerca
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simButton, styles.returnButton]}
              onPress={handleSimulateReturn}
              disabled={isSending}
            >
              <Text style={styles.simButtonText}>
                ✅ Simular RETORNO{"\n"}a Geocerca
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Controles de movimiento manual */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Movimiento Manual</Text>
          <View style={styles.dpadContainer}>
            <TouchableOpacity
              style={styles.dpadButton}
              onPress={() => handleCustomPosition(0.001, 0, "↑ Norte")}
              disabled={isSending}
            >
              <Text style={styles.dpadText}>⬆️ Norte</Text>
            </TouchableOpacity>
            <View style={styles.dpadMiddleRow}>
              <TouchableOpacity
                style={styles.dpadButton}
                onPress={() => handleCustomPosition(0, -0.001, "← Oeste")}
                disabled={isSending}
              >
                <Text style={styles.dpadText}>⬅️ Oeste</Text>
              </TouchableOpacity>
              <View style={styles.dpadCenter}>
                <Text style={styles.dpadCenterText}>📌</Text>
              </View>
              <TouchableOpacity
                style={styles.dpadButton}
                onPress={() => handleCustomPosition(0, 0.001, "→ Este")}
                disabled={isSending}
              >
                <Text style={styles.dpadText}>➡️ Este</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.dpadButton}
              onPress={() => handleCustomPosition(-0.001, 0, "↓ Sur")}
              disabled={isSending}
            >
              <Text style={styles.dpadText}>⬇️ Sur</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mapa embebido */}
        <View style={styles.mapWrapper}>
          <iframe
            title="Mapa de Simulación GPS"
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </View>

        {/* Log de eventos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Registro de Eventos</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyLog}>
              Presiona un botón de simulación para comenzar...
            </Text>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <Text style={styles.logTime}>[{log.time}]</Text>
                <Text
                  style={[
                    styles.logMessage,
                    log.type === "error" && styles.logError,
                    log.type === "success" && styles.logSuccess,
                    log.type === "warning" && styles.logWarning,
                  ]}
                >
                  {log.message}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Navegación */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.navButton} onPress={onBackToSelector}>
            <Text style={styles.navButtonText}>🔄 Cambiar de Niño</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.logoutBtn]}
            onPress={logout}
          >
            <Text style={styles.logoutBtnText}>🚪 Salir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1117",
    width: "100%",
  },
  scroll: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 40,
  },
  card: {
    width: "92%",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 14,
    color: "#d1d5db",
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
  coordsText: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  simButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exitButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
    marginRight: 8,
  },
  returnButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.5)",
    marginLeft: 8,
  },
  simButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  dpadContainer: {
    alignItems: "center",
  },
  dpadMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dpadButton: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    margin: 4,
    minWidth: 90,
    alignItems: "center",
  },
  dpadText: {
    color: "#93c5fd",
    fontWeight: "bold",
    fontSize: 13,
  },
  dpadCenter: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  dpadCenterText: {
    fontSize: 24,
  },
  mapWrapper: {
    width: "92%",
    height: 300,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  logRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  logTime: {
    fontSize: 11,
    color: "#6b7280",
    marginRight: 8,
    fontFamily: "monospace",
    minWidth: 75,
  },
  logMessage: {
    fontSize: 12,
    color: "#d1d5db",
    flex: 1,
  },
  logError: {
    color: "#f87171",
  },
  logSuccess: {
    color: "#34d399",
  },
  logWarning: {
    color: "#fbbf24",
  },
  emptyLog: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  footer: {
    flexDirection: "row",
    width: "92%",
    justifyContent: "space-between",
    marginTop: 6,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    marginRight: 8,
  },
  navButtonText: {
    color: "#d1d5db",
    fontWeight: "bold",
    fontSize: 13,
  },
  logoutBtn: {
    marginRight: 0,
    marginLeft: 8,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 13,
  },
});
