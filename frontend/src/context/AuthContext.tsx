import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { ENDPOINTS } from '../config/api';

export type UserRole = 'STUDENT' | 'DRIVER' | 'CONTROLLER' | 'ADMIN_CROUS' | 'SUPERADMIN';
export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface User {
  user_id: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  matricule_uac?: string | null;
  kyc_status?: KycStatus;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  justRegistered: boolean;
  clearJustRegistered: () => void;
  login: (phoneNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    payload: {
      phone_number: string;
      password: string;
      first_name: string;
      last_name: string;
      matricule_uac?: string;
      role?: UserRole;
    }
  ) => Promise<{ success: boolean; error?: string; user?: any }>;
  logout: () => void;
  quickLogin: (roleKey: 'STUDENT' | 'DRIVER' | 'CONTROLLER' | 'ADMIN_CROUS') => Promise<void>;
  updateUserKycStatus: (status: KycStatus) => void;
}

const formatApiError = (detail: any, defaultMsg: string): string => {
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
  }
  if (typeof detail === 'object' && detail.message) return detail.message;
  return defaultMsg;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Stockage sécurisé / persistant compatible Web & Mobile
const saveAuthData = (token: string, user: User) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      localStorage.setItem('epass_token', token);
      localStorage.setItem('epass_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }
};

const clearAuthData = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      localStorage.removeItem('epass_token');
      localStorage.removeItem('epass_user');
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }
};

const getStoredAuthData = (): { token: string | null; user: User | null } => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('epass_token');
      const userStr = localStorage.getItem('epass_user');
      const user = userStr ? JSON.parse(userStr) : null;
      return { token, user };
    } catch (e) {
      return { token: null, user: null };
    }
  }
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Tentative de récupération directe de la session via le Cookie HttpOnly
        const cookieRes = await fetch(ENDPOINTS.MY_PROFILE, {
          credentials: 'include',
        });

        if (cookieRes.ok) {
          const p = await cookieRes.json();
          const userData: User = {
            user_id: p.user_id,
            phone_number: p.phone_number,
            first_name: p.first_name,
            last_name: p.last_name,
            role: p.role,
            matricule_uac: p.matricule_uac,
            kyc_status: p.kyc_status,
          };
          setUser(userData);
          setToken('cookie_session');
          saveAuthData('cookie_session', userData);
          setIsInitialLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Cookie session check error:', e);
      }

      // Fallback sur stockage local si cookie indisponible
      try {
        const stored = getStoredAuthData();
        if (stored.token && stored.user) {
          setToken(stored.token);
          setUser(stored.user);
        }
      } catch (e) {
        console.warn('Init auth load error:', e);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initAuth();
  }, []);

  const clearJustRegistered = () => {
    setJustRegistered(false);
  };

  const login = async (phoneNumber: string, password: string) => {
    setIsLoading(true);
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    try {
      const response = await fetch(ENDPOINTS.LOGIN, {
        method: 'POST',
        credentials: 'include', // Envoi et réception automatique des Cookies de session
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: cleanPhone,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        return {
          success: false,
          error: formatApiError(data.detail, 'Numéro de téléphone ou mot de passe incorrect.'),
        };
      }

      // Récupération du profil utilisateur (avec Cookie de session)
      const profileRes = await fetch(ENDPOINTS.MY_PROFILE, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      let userData: User;
      if (profileRes.ok) {
        const p = await profileRes.json();
        userData = {
          user_id: p.user_id,
          phone_number: p.phone_number,
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role,
          matricule_uac: p.matricule_uac,
          kyc_status: p.kyc_status,
        };
      } else {
        userData = {
          user_id: data.user_id,
          phone_number: cleanPhone,
          first_name: 'Utilisateur',
          last_name: 'UAC',
          role: data.role,
          kyc_status: data.kyc_status,
        };
      }

      setToken(data.access_token);
      setUser(userData);
      saveAuthData(data.access_token, userData);
      setIsLoading(false);

      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Impossible de contacter le serveur backend. Vérifiez que le backend est démarré.',
      };
    }
  };

  const register = async (payload: {
    phone_number: string;
    password: string;
    first_name: string;
    last_name: string;
    matricule_uac?: string;
    role?: UserRole;
  }) => {
    setIsLoading(true);
    const cleanPhone = payload.phone_number.replace(/\s+/g, '').replace(/-/g, '');
    try {
      const response = await fetch(ENDPOINTS.REGISTER, {
        method: 'POST',
        credentials: 'include', // Dépôt du Cookie de session à l'inscription
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          phone_number: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        return {
          success: false,
          error: formatApiError(data.detail, "Erreur lors de l'inscription."),
        };
      }

      // Auto-connexion directe et activation du flag justRegistered
      const loginRes = await login(cleanPhone, payload.password);
      if (loginRes.success) {
        setJustRegistered(true);
      }
      setIsLoading(false);
      return loginRes;
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Erreur réseau lors de la communication avec le backend.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch(ENDPOINTS.LOGOUT, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    setUser(null);
    setToken(null);
    setJustRegistered(false);
    clearAuthData();
  };

  const quickLogin = async (roleKey: 'STUDENT' | 'DRIVER' | 'CONTROLLER' | 'ADMIN_CROUS') => {
    const testCredentials = {
      STUDENT: { phone: '+22997001122', pass: 'Student1234' },
      DRIVER: { phone: '+22997000001', pass: 'Driver1234' },
      CONTROLLER: { phone: '+22997000002', pass: 'Controller1234' },
      ADMIN_CROUS: { phone: '+22997000000', pass: 'Admin1234' },
    };

    const cred = testCredentials[roleKey];
    await login(cred.phone, cred.pass);
  };

  const updateUserKycStatus = (status: KycStatus) => {
    if (user) {
      const updated = { ...user, kyc_status: status };
      setUser(updated);
      if (token) {
        saveAuthData(token, updated);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isInitialLoading,
        justRegistered,
        clearJustRegistered,
        login,
        register,
        logout,
        quickLogin,
        updateUserKycStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
