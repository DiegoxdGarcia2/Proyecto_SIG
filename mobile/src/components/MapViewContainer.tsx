import React from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Polygon, Marker, PROVIDER_DEFAULT } from "react-native-maps";

// Coordenadas de Santa Cruz de la Sierra (UAGRM)
const INITIAL_REGION = {
    latitude: -17.7760,
    longitude: -63.1915,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
};

// Vértices del Kindergarten Piloto UAGRM (Latitud, Longitud)
const KINDER_POLY = [
    { latitude: -17.7780, longitude: -63.1930 },
    { latitude: -17.7740, longitude: -63.1930 },
    { latitude: -17.7740, longitude: -63.1900 },
    { latitude: -17.7780, longitude: -63.1900 },
];

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
        // Centro por defecto
        return { latitude: -17.7760, longitude: -63.1915 };
    };

    const childCoords = getChildCoords();
    const isAlarm = status === "ALARM";

    return (
        <View style={styles.mapWrapper}>
            <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={INITIAL_REGION}
            >
                {/* Dibujar el perímetro del Kinder */}
                <Polygon
                    coordinates={KINDER_POLY}
                    fillColor={isAlarm ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}
                    strokeColor={isAlarm ? "#ef4444" : "#10b981"}
                    strokeWidth={2}
                />

                {/* Marcador de ubicación del niño */}
                <Marker
                    coordinate={childCoords}
                    title="Ubicación del Niño"
                    description={isAlarm ? "¡Fuera del Kinder!" : "Dentro del Kinder"}
                    pinColor={isAlarm ? "red" : "green"}
                />
            </MapView>
            <View style={styles.legend}>
                <Text style={styles.legendText}>
                    🟢 Cerca Virtual: Kinder Piloto UAGRM
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mapWrapper: {
        width: "90%",
        height: "50%",
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
    legend: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    legendText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
    },
});
