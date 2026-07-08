import React, { createContext, useState, useEffect, ReactNode, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SelectedChild {
  childId: string;
  deviceId: string;
  name: string;
}

interface AuthContextType {
  token: string | null;
  role: string | null;
  username: string | null;
  companyId: string | null;
  kindergartenId: string | null;
  classroomId: string | null;
  selectedChild: SelectedChild | null;
  loading: boolean;
  login: (token: string, role: string, username: string, companyId: string, kindergartenId?: string | null, classroomId?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  selectChild: (child: SelectedChild | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [kindergartenId, setKindergartenId] = useState<string | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<SelectedChild | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    cargarSesion();
  }, []);

  const cargarSesion = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("user_token");
      const storedRole = await AsyncStorage.getItem("user_role");
      const storedUser = await AsyncStorage.getItem("user_username");
      const storedCompany = await AsyncStorage.getItem("user_company_id");
      const storedKinder = await AsyncStorage.getItem("user_kindergarten_id");
      const storedClassroom = await AsyncStorage.getItem("user_classroom_id");
      const storedChild = await AsyncStorage.getItem("user_selected_child");

      if (storedToken) {
        setToken(storedToken);
        setRole(storedRole);
        setUsername(storedUser);
        setCompanyId(storedCompany);
        setKindergartenId(storedKinder);
        setClassroomId(storedClassroom);
        if (storedChild) {
          setSelectedChild(JSON.parse(storedChild));
        }
      }
    } catch (e) {
      console.error("Error al cargar la sesión persistida:", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    t: string,
    r: string,
    u: string,
    c: string,
    kId?: string | null,
    cId?: string | null
  ) => {
    setToken(t);
    setRole(r);
    setUsername(u);
    setCompanyId(c);
    setKindergartenId(kId || null);
    setClassroomId(cId || null);

    const storagePairs: [string, string][] = [
      ["user_token", t],
      ["user_role", r],
      ["user_username", u],
      ["user_company_id", c],
    ];

    if (kId) storagePairs.push(["user_kindergarten_id", kId]);
    if (cId) storagePairs.push(["user_classroom_id", cId]);

    await AsyncStorage.multiSet(storagePairs);
  };

  const logout = async () => {
    setToken(null);
    setRole(null);
    setUsername(null);
    setCompanyId(null);
    setKindergartenId(null);
    setClassroomId(null);
    setSelectedChild(null);
    await AsyncStorage.multiRemove([
      "user_token",
      "user_role",
      "user_username",
      "user_company_id",
      "user_kindergarten_id",
      "user_classroom_id",
      "user_selected_child",
    ]);
  };

  const selectChild = async (child: SelectedChild | null) => {
    setSelectedChild(child);
    if (child) {
      await AsyncStorage.setItem("user_selected_child", JSON.stringify(child));
    } else {
      await AsyncStorage.removeItem("user_selected_child");
    }
  };

  return (
    <AuthContext.Provider value={{
      token, role, username, companyId, kindergartenId, classroomId, selectedChild, loading,
      login, logout, selectChild
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
