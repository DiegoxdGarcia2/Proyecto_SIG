import React from "react";
import { StyleSheet, View, Text } from "react-native";

// Coordenadas de Santa Cruz de la Sierra (UAGRM)
const DEFAULT_LAT = -17.7760;
const DEFAULT_LNG = -63.1915;

interface Props {
    lastAlert: any;
    status: string;
}

export const MapViewContainer: React.FC<Props> = ({ lastAlert, status }) => {
    const getChildCoords = () => {
        if (lastAlert?.location?.coordinates) {
            const [lon, lat] = lastAlert.location.coordinates;
            return { latitude: lat, longitude: lon };
        }
        return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    };

    const childCoords = getChildCoords();
    const isAlarm = status === "ALARM";

    // Calcular bbox para el iframe de OpenStreetMap
    const zoomDelta = 0.005;
    const minLng = childCoords.longitude - zoomDelta;
    const minLat = childCoords.latitude - zoomDelta;
    const maxLng = childCoords.longitude + zoomDelta;
    const maxLat = childCoords.latitude + zoomDelta;

    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${childCoords.latitude}%2C${childCoords.longitude}`;

    return (
        <View style={styles.mapWrapper}>
            <iframe
                title="Mapa de Monitoreo"
                src={embedUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
            />
            <View style={[styles.legend, { backgroundColor: isAlarm ? "rgba(239, 68, 68, 0.95)" : "rgba(16, 185, 129, 0.95)" }]}>
                <Text style={styles.legendText}>
                    {isAlarm ? "🔴 Alerta: Fuera de la Geocerca" : "🟢 Seguro: Dentro del Kínder"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mapWrapper: {
        width: "90%",
        height: "65%",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
        position: "relative"
    },
    legend: {
        position: "absolute",
        bottom: 12,
        left: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    legendText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#ffffff",
    },
});
