import { useEffect, useState, useRef } from "react";

export type ChildStatus = "SAFE" | "ALARM" | "DISCONNECTED" | "CONNECTING";

export function useWebSocket(tutorId: string) {
    const [status, setStatus] = useState<ChildStatus>("CONNECTING");
    const [lastAlert, setLastAlert] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<any>(null);

    const connect = () => {
        if (!tutorId) return;
        
        // Limpiar recursos y conexiones anteriores
        if (wsRef.current) wsRef.current.close();
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

        setStatus("CONNECTING");
        const wsUrl = `ws://10.0.2.2:8000/api/v1/ws/tutor/${tutorId}`; // 10.0.2.2 es el localhost del host en emulador Android
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus("SAFE"); // Estado por defecto al reconectar
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === "ALARM" || data.status === "ALARM") {
                    setStatus("ALARM");
                    setLastAlert(data);
                } else if (data.status === "SAFE") {
                    setStatus("SAFE");
                    setLastAlert(null);
                }
            } catch (e) {
                console.error("Error parsing WS message:", e);
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
    }, [tutorId]);

    return { status, lastAlert, reconnect: connect };
}
