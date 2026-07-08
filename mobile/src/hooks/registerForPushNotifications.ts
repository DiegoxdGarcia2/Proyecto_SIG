import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getApiUrl } from "../utils/api";

// Configurar cómo se comportan las notificaciones cuando la app está activa
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(tutorId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Debe usar un dispositivo físico para las notificaciones push.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("¡Permiso de notificaciones push denegado!");
    return null;
  }

  // Configuración específica de canales para Android (sonidos, vibraciones, etc.)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F77",
    });
  }

  try {
    // Obtener el token FCM nativo del dispositivo
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    // Enviar el token al backend FastAPI
    const response = await fetch(getApiUrl("/tutors/register-fcm"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tutor_id: tutorId,
        fcm_token: token,
      }),
    });

    if (response.ok) {
      console.log("Token FCM registrado exitosamente en el backend para:", tutorId);
    } else {
      console.error("Error al registrar el token FCM en el backend:", await response.text());
    }

    return token;
  } catch (error) {
    console.error("Error al obtener o registrar el token de notificaciones:", error);
    return null;
  }
}
