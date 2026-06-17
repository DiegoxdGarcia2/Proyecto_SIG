import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import { ChildStatus } from "../hooks/useWebSocket";

interface Props {
    status: ChildStatus;
}

export const StatusHeader: React.FC<Props> = ({ status }) => {
    const getHeaderStyle = () => {
        if (status === "ALARM") return styles.headerAlarm;
        if (status === "SAFE") return styles.headerSafe;
        if (status === "CONNECTING") return styles.headerConnecting;
        return styles.headerDisconnected;
    };

    const getStatusText = () => {
        if (status === "ALARM") return "ESTADO: ¡ALERTA! Fuera del perímetro";
        if (status === "SAFE") return "Estado: Seguro (Niño en Kinder)";
        if (status === "CONNECTING") return "Conectando al servidor...";
        return "Desconectado del servidor";
    };

    const callNumber = (phoneNumber: string) => {
        Linking.openURL(`tel:${phoneNumber}`).catch((err) =>
            console.error("Error al abrir la llamada telefónica:", err)
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, getHeaderStyle()]}>
                <Text style={styles.headerText}>{getStatusText()}</Text>
            </View>

            {status === "ALARM" && (
                <View style={styles.emergencyActions}>
                    <Text style={styles.emergencyTitle}>Acciones de Emergencia:</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.btnPolice]}
                            onPress={() => callNumber("110")}
                        >
                            <Text style={styles.btnText}>📞 Policía (110)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.btnSchool]}
                            onPress={() => callNumber("33445566")}
                        >
                            <Text style={styles.btnText}>🏫 Escuela</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.btnSupport]}
                            onPress={() => callNumber("911")}
                        >
                            <Text style={styles.btnText}>🚨 911</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        alignItems: "center",
    },
    header: {
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
        marginBottom: 10,
    },
    headerSafe: { backgroundColor: "#10b981" },
    headerAlarm: { backgroundColor: "#ef4444" },
    headerConnecting: { backgroundColor: "#3b82f6" },
    headerDisconnected: { backgroundColor: "#6b7280" },
    headerText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },
    emergencyActions: {
        width: "90%",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 15,
        alignItems: "center",
    },
    emergencyTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#ef4444",
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    btnPolice: { backgroundColor: "#1e3a8a" },
    btnSchool: { backgroundColor: "#d97706" },
    btnSupport: { backgroundColor: "#b91c1c" },
    btnText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
    },
});
