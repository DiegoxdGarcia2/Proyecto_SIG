import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Polygon, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useAuth } from "../context/AuthContext";
import { useBackgroundLocation } from "../hooks/useBackgroundLocation";

// Polígono del Kindergarten Piloto UAGRM (Latitud, Longitud)
const KINDER_POLY = [
  { latitude: -17.7780, longitude: -63.1930 },
  { latitude: -17.7740, longitude: -63.1930 },
  { latitude: -17.7740, longitude: -63.1900 },
  { latitude: -17.7780, longitude: -63.1900 },
];

export const TrackingScreen: React.FC<{ onBackToSelector: () => void }> = ({ onBackToSelector }) => {
  const { selectedChild, logout } = useAuth();
  const { isTracking, error, startTracking, stopTracking } = useBackgroundLocation();
  const [status, setStatus] = useState<string>("Inactivo");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: -17.7760,
    longitude: -63.1915,
  });

  const toggleTracking = async () => {
    if (isTracking) {
      await stopTracking();
      setStatus("Inactivo");
    } else {
      await startTracking();
      setStatus("Buscando señal GPS...");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Dispositivo GPS: {selectedChild?.name}</Text>
        <Text style={styles.subtitle}>ID Dispositivo: {selectedChild?.deviceId}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Estado del Tracking:</Text>
          <Text style={[styles.statusValue, isTracking ? styles.textActive : styles.textInactive]}>
            {isTracking ? "ACTIVO" : "INACTIVO"}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, isTracking ? styles.buttonActive : styles.buttonInactive]} 
          onPress={toggleTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? "🛑 Detener GPS Real" : "⚡ Iniciar GPS Real"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
        >
          <Polygon
            coordinates={KINDER_POLY}
            fillColor="rgba(59, 130, 246, 0.15)"
            strokeColor="#3b82f6"
            strokeWidth={2}
          />
          <Marker
            coordinate={coords}
            title={`Niño: ${selectedChild?.name}`}
            description="Última posición del GPS"
            pinColor="blue"
          />
        </MapView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.navButton} onPress={onBackToSelector}>
          <Text style={styles.navButtonText}>🔄 Cambiar de Niño</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.logoutBtn]} onPress={logout}>
          <Text style={styles.logoutBtnText}>🚪 Salir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    paddingTop: 40,
    width: "100%",
  },
  card: {
    width: "90%",
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  textActive: {
    color: "#10b981",
  },
  textInactive: {
    color: "#ef4444",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: "#ef4444",
  },
  buttonInactive: {
    backgroundColor: "#3b82f6",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  mapWrapper: {
    width: "90%",
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    width: "90%",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    marginRight: 8,
  },
  navButtonText: {
    color: "#4b5563",
    fontWeight: "bold",
    fontSize: 13,
  },
  logoutBtn: {
    marginRight: 0,
    marginLeft: 8,
    borderColor: "rgba(239, 68, 68, 0.2)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 13,
  },
});
