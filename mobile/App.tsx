import React, { useEffect, useState } from "react";
import { StyleSheet, View, Vibration, SafeAreaView, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useWebSocket } from "./src/hooks/useWebSocket";
import { StatusHeader } from "./src/components/StatusHeader";
import { MapViewContainer } from "./src/components/MapViewContainer";
import { registerForPushNotificationsAsync } from "./src/hooks/registerForPushNotifications";
import MapView, { Polygon, Marker, PROVIDER_DEFAULT } from "react-native-maps";

const TEST_TUTOR_ID = "tutor_mama_123";
const TEST_DEVICE_ID = "dispositivo_juanito_123";

// Coordenadas del Kindergarten Piloto UAGRM (Latitud, Longitud)
const KINDER_POLY = [
  { latitude: -17.7780, longitude: -63.1930 },
  { latitude: -17.7740, longitude: -63.1930 },
  { latitude: -17.7740, longitude: -63.1900 },
  { latitude: -17.7780, longitude: -63.1900 },
];

export default function App() {
  const [appMode, setAppMode] = useState<"tutor" | "child_simulator">("tutor");
  const { status, lastAlert } = useWebSocket(TEST_TUTOR_ID);
  const isAlarm = status === "ALARM";

  // Registro de notificaciones push
  useEffect(() => {
    registerForPushNotificationsAsync(TEST_TUTOR_ID);
  }, []);

  // Manejar alertas físicas por vibración ante peligro del niño (Modo Tutor)
  useEffect(() => {
    if (isAlarm && appMode === "tutor") {
      Vibration.vibrate([0, 600, 200, 600], true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [isAlarm, appMode]);

  // Variables para el Simulador del Niño
  const [childLat, setChildLat] = useState(-17.7760);
  const [childLon, setChildLon] = useState(-63.1915);
  const [simResponse, setSimResponse] = useState<string>("Ninguna actualización enviada");
  const [simIsSafe, setSimIsSafe] = useState<boolean>(true);

  // Enviar tracking simulado al backend
  const sendSimulatedLocation = async (lat: number, lon: number) => {
    try {
      const response = await fetch("http://10.0.2.2:8000/api/v1/tracking/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: TEST_DEVICE_ID,
          tutor_id: TEST_TUTOR_ID,
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

  return (
    <SafeAreaView style={[styles.container, isAlarm && appMode === "tutor" && styles.containerAlarm]}>
      <StatusBar style={isAlarm && appMode === "tutor" ? "light" : "dark"} />
      
      {/* Botones de navegación de Roles */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navButton, appMode === "tutor" && styles.navButtonActive]} 
          onPress={() => setAppMode("tutor")}
        >
          <Text style={[styles.navButtonText, appMode === "tutor" && styles.navButtonTextActive]}>Modo Tutor</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, appMode === "child_simulator" && styles.navButtonActive]} 
          onPress={() => setAppMode("child_simulator")}
        >
          <Text style={[styles.navButtonText, appMode === "child_simulator" && styles.navButtonTextActive]}>Simulador Niño</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {appMode === "tutor" ? (
          <View style={styles.fullWidth}>
            <StatusHeader status={status} />
            <MapViewContainer lastAlert={lastAlert} status={status} />
          </View>
        ) : (
          <View style={styles.fullWidth}>
            <View style={styles.simCard}>
              <Text style={styles.simTitle}>Simulador GPS del Dispositivo del Niño</Text>
              <Text style={styles.simInstructions}>Toca el mapa para posicionar al niño. Se enviará la ubicación en tiempo real al backend.</Text>
              <Text style={[styles.simStatus, simIsSafe ? styles.textSafe : styles.textAlarm]}>{simResponse}</Text>
            </View>
            <View style={styles.mapWrapper}>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                  latitude: -17.7760,
                  longitude: -63.1915,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
                onPress={handleSimulatorMapPress}
              >
                <Polygon
                  coordinates={KINDER_POLY}
                  fillColor="rgba(59, 130, 246, 0.15)"
                  strokeColor="#3b82f6"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: childLat, longitude: childLon }}
                  title="Posición Simulada del Niño"
                  description="Arrastra o presiona en el mapa"
                  pinColor="blue"
                />
              </MapView>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
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
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: 30, // Ajuste para SafeArea en dispositivos sin notch
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  navButtonActive: {
    backgroundColor: "#3b82f6",
  },
  navButtonText: {
    fontWeight: "bold",
    color: "#4b5563",
  },
  navButtonTextActive: {
    color: "#ffffff",
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
    height: "60%",
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
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 5,
  },
  simInstructions: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  simStatus: {
    fontSize: 14,
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
});
