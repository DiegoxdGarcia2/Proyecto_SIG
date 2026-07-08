import { useEffect, useState, useRef } from "react";
import { getWsUrl } from "../utils/api";

export type ChildStatus = "SAFE" | "ALARM" | "DISCONNECTED" | "CONNECTING";

export interface WebSocketAlert {
  type: "ALERT" | "INFO";
  child_id: string;
  child_name: string;
  event: "GEOFENCE_EXIT" | "GEOFENCE_ENTER";
  message: string;
  kindergarten_id?: string;
  classroom_id?: string;
  timestamp: string;
}

export function useWebSocket(
  tutorId: string,
  role: string | null = "tutor",
  companyId: string | null = null,
  kindergartenId: string | null = null,
  classroomId: string | null = null
) {
  const [status, setStatus] = useState<ChildStatus>("CONNECTING");
  const [lastAlert, setLastAlert] = useState<WebSocketAlert | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = () => {
    if (role === "tutor" && !tutorId) return;
    if (role !== "tutor" && !companyId) return;

    // Limpiar recursos y conexiones anteriores
    if (wsRef.current) wsRef.current.close();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    setStatus("CONNECTING");

    let urlPath = "";
    if (role === "tutor") {
      urlPath = `/ws/tutor/${tutorId}`;
    } else {
      // Conectar como admin/teacher con filtros en query parameters para que el backend filtre
      const params = new URLSearchParams();
      if (kindergartenId) params.append("kindergarten_id", kindergartenId);
      if (classroomId) params.append("classroom_id", classroomId);
      urlPath = `/ws/admin/${companyId}?${params.toString()}`;
    }

    const wsUrl = getWsUrl(urlPath);
    console.log("Conectando WebSocket móvil a:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("SAFE"); // Estado por defecto
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Mensaje WebSocket recibido en móvil:", data);

        // Soporte para formato del backend: data.type === 'ALERT' indica anomalía de salida
        if (data.type === "ALERT" || data.event === "GEOFENCE_EXIT") {
          setStatus("ALARM");
          setLastAlert(data);
        } else if (data.type === "INFO" || data.event === "GEOFENCE_ENTER") {
          setStatus("SAFE");
          setLastAlert(data);
        }
      } catch (e) {
        console.error("Error al parsear mensaje de WebSocket:", e);
      }
    };

    ws.onclose = () => {
      setStatus("DISCONNECTED");
      reconnectTimeoutRef.current = setTimeout(connect, 5000); // Reconectar tras 5s
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [tutorId, role, companyId, kindergartenId, classroomId]);

  return { status, lastAlert, reconnect: connect, setLastAlert };
}
