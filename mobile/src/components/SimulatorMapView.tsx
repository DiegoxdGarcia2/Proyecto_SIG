import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Polygon, Marker, PROVIDER_DEFAULT } from "react-native-maps";

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
  selectedChild,
  kinderPoly,
  onMapPress,
}) => {
  return (
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
        onPress={onMapPress}
      >
        <Polygon
          coordinates={kinderPoly}
          fillColor="rgba(59, 130, 246, 0.15)"
          strokeColor="#3b82f6"
          strokeWidth={2}
        />
        <Marker
          coordinate={{ latitude: childLat, longitude: childLon }}
          title={`Posición de: ${selectedChild?.name}`}
          description="Presiona en el mapa para simular movimiento"
          pinColor="blue"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  mapWrapper: {
    width: "100%",
    height: "100%",
  },
  map: {
    flex: 1,
  },
});
