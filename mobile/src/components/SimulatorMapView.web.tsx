import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

interface Props {
  childLat: number;
  childLon: number;
  selectedChild: any;
  kinderPoly: Array<{ latitude: number; longitude: number }>;
  onMapPress: (e: any) => void;
}

export const SimulatorMapView: React.FC<Props> = ({
  childLat,
  childLon,
  onMapPress,
}) => {
  // Delta de movimiento para la simulación web (~50 metros por paso)
  const step = 0.0005;

  const moveGPS = (direction: "up" | "down" | "left" | "right") => {
    let nextLat = childLat;
    let nextLon = childLon;

    switch (direction) {
      case "up":
        nextLat += step;
        break;
      case "down":
        nextLat -= step;
        break;
      case "left":
        nextLon -= step;
        break;
      case "right":
        nextLon += step;
        break;
    }

    // Disparar el evento con la misma firma nativa
    onMapPress({
      nativeEvent: {
        coordinate: {
          latitude: Number(nextLat.toFixed(6)),
          longitude: Number(nextLon.toFixed(6)),
        },
      },
    });
  };

  // Calcular bbox para el iframe de OpenStreetMap
  const zoomDelta = 0.005;
  const minLng = childLon - zoomDelta;
  const minLat = childLat - zoomDelta;
  const maxLng = childLon + zoomDelta;
  const maxLat = childLat + zoomDelta;

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${childLat}%2C${childLon}`;

  return (
    <View style={styles.container}>
      {/* Mapa de OpenStreetMap */}
      <View style={styles.mapWrapper}>
        <iframe
          title="Mapa del Simulador"
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </View>

      {/* Controles de Simulación GPS Web */}
      <View style={styles.controlsWrapper}>
        <Text style={styles.controlsTitle}>🕹️ Simulador de Movimiento GPS</Text>
        <View style={styles.keypad}>
          <View style={styles.row}>
            <TouchableOpacity style={styles.keyButton} onPress={() => moveGPS("up")}>
              <Text style={styles.keyText}>Norte (↑)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.keyButton} onPress={() => moveGPS("left")}>
              <Text style={styles.keyText}>Oeste (←)</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity style={styles.keyButton} onPress={() => moveGPS("right")}>
              <Text style={styles.keyText}>Este (→)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.keyButton} onPress={() => moveGPS("down")}>
              <Text style={styles.keyText}>Sur (↓)</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.coordinatesText}>
          Lat: {childLat.toFixed(6)} | Lng: {childLon.toFixed(6)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mapWrapper: {
    flex: 1.2,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  controlsWrapper: {
    flex: 0.8,
    backgroundColor: "#ffffff",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  controlsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4b5563",
    marginBottom: 6,
  },
  keypad: {
    width: "70%",
    alignItems: "center",
    gap: 4,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  keyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    minWidth: 75,
    alignItems: "center",
  },
  keyText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  spacer: {
    width: 6,
  },
  coordinatesText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 6,
    fontWeight: "600",
  },
});
