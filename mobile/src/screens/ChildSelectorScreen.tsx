import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth, SelectedChild } from "../context/AuthContext";
import { getApiUrl } from "../utils/api";

interface ApiChild {
  id: string;
  name: string;
  age: number;
  device_id?: string;
  kindergarten_id?: string;
  classroom_id?: string;
  status: string;
}

export const ChildSelectorScreen: React.FC = () => {
  const { token, role, logout, selectChild } = useAuth();
  const [children, setChildren] = useState<ApiChild[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = role === "tutor" ? "/tutor/children" : "/children";
      const response = await fetch(getApiUrl(endpoint), {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data);
      } else {
        setError("Error al obtener la lista de niños.");
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (child: ApiChild) => {
    if (!child.device_id) {
      alert("Este niño no tiene un dispositivo hardware GPS asignado.");
      return;
    }
    selectChild({
      childId: child.id,
      deviceId: child.device_id,
      name: child.name
    });
  };

  const renderChildItem = ({ item }: { item: ApiChild }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.childName}>{item.name}</Text>
        <Text style={[styles.badge, item.status === "ALARM" ? styles.badgeAlarm : styles.badgeSafe]}>
          {item.status === "ALARM" ? "FUERA" : "SEGURO"}
        </Text>
      </View>
      <Text style={styles.childInfo}>Edad: {item.age} años</Text>
      <Text style={styles.childInfo}>GPS ID: {item.device_id || "No Asignado"}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Selecciona un Estudiante</Text>
        <Text style={styles.subtitle}>Selecciona el niño que deseas monitorear o simular</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00f2fe" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChildren}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : children.length === 0 ? (
        <Text style={styles.emptyText}>No tienes niños asignados a tu cuenta.</Text>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          renderItem={renderChildItem}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0e1a",
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  childName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  badge: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  badgeSafe: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
  },
  badgeAlarm: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
  },
  childInfo: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 12,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  emptyText: {
    flex: 1,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 40,
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "bold",
  },
});
