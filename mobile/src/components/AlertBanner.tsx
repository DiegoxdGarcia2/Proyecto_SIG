import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated, TouchableOpacity, Vibration } from "react-native";
import { WebSocketAlert } from "../hooks/useWebSocket";

interface AlertBannerProps {
  alert: WebSocketAlert | null;
  onClose: () => void;
}

/**
 * Componente que muestra una notificación/alerta visual de tipo Banner superior
 * cuando el WebSocket detecta una anomalía de salida (GEOFENCE_EXIT) o retorno (GEOFENCE_ENTER).
 * Incluye efecto de vibración en dispositivo y auto-cierre opcional.
 */
export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-150)).current; // Iniciar arriba oculto

  useEffect(() => {
    if (alert) {
      // Disparar vibración de alerta
      if (alert.type === "ALERT") {
        // Patrón SOS o alarma: vibrar 500ms, pausar 250ms, vibrar 500ms
        Vibration.vibrate([0, 500, 250, 500]);
      } else {
        // Entrada o info común: vibrar una sola vez corta
        Vibration.vibrate(200);
      }

      // Animación de entrada: slide hacia abajo
      Animated.spring(slideAnim, {
        toValue: 10,
        useNativeDriver: true,
        bounciness: 8,
      }).start();

      // Temporizador para auto-ocultarse en 9 segundos
      const timer = setTimeout(() => {
        handleDismiss();
      }, 9000);

      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleDismiss = () => {
    // Animación de salida: slide hacia arriba
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!alert) return null;

  const isDanger = alert.type === "ALERT";
  const title = isDanger ? "⚠️ ALERTA DE SEGURIDAD" : "ℹ️ INGRESO SEGURO";
  const bgStyle = isDanger ? styles.bannerDanger : styles.bannerSuccess;
  const textStyle = isDanger ? styles.textDanger : styles.textSuccess;
  const timeString = alert.timestamp 
    ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : new Date().toLocaleTimeString();

  return (
    <Animated.View style={[styles.bannerContainer, bgStyle, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, textStyle]}>{title}</Text>
          <Text style={styles.time}>{timeString}</Text>
        </View>
        <Text style={styles.message}>{alert.message}</Text>
        {alert.classroom_id && (
          <Text style={styles.details}>
            Estudiante: {alert.child_name} | Aula: Pre-Kínder A
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 40,
    left: "5%",
    right: "5%",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 99999, // Superar MapViews y otros layouts de React Native
  },
  bannerDanger: {
    backgroundColor: "rgba(28, 13, 16, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderLeftWidth: 6,
    borderLeftColor: "#ef4444",
  },
  bannerSuccess: {
    backgroundColor: "rgba(10, 22, 18, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderLeftWidth: 6,
    borderLeftColor: "#10b981",
  },
  content: {
    flex: 1,
    paddingRight: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 10,
    color: "#9ca3af",
  },
  textDanger: {
    color: "#ef4444",
  },
  textSuccess: {
    color: "#10b981",
  },
  message: {
    fontSize: 13,
    color: "#f3f4f6",
    fontWeight: "600",
    lineHeight: 18,
  },
  details: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 22,
    color: "#d1d5db",
    fontWeight: "300",
    lineHeight: 24,
  },
});
