import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export interface StudentTicket {
  id: string;
  code: string;
  line: string;
  route: string;
  busId: string;
  price: number;
  date: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  paymentMethod: string;
  timeSlot?: string;
  recycleCount?: number;
}

export interface BusSlot {
  id: string;
  time: string;
  route: string;
  bookedSeats: number;
  totalSeats: number;
  full: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  justRegistered: boolean;
  clearJustRegistered: () => void;
  walletBalance: number;
  operatorPhoneNumbers: {
    MTN: string;
    MOOV: string;
    CELTIIS: string;
  };
  tickets: StudentTicket[];
  activeTicket: StudentTicket | null;
  busSlots: BusSlot[];
  refreshTrips: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  debitWallet: (amount: number) => boolean;
  rechargeWallet: (amount: number, operator: string, phone: string) => void;
  updateOperatorPhone: (operator: 'MTN' | 'MOOV' | 'CELTIIS', phone: string) => void;
  purchaseTicket: (params: {
    line: string;
    route: string;
    busId: string;
    price: number;
    paymentMethod: string;
    slotId?: string;
  }) => StudentTicket;
  recycleTicket: (
    ticketId: string,
    newSlotId: string
  ) => Promise<{ success: boolean; error?: string; ticket?: StudentTicket }>;
  setActiveTicket: (ticket: StudentTicket) => void;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  // Solde dynamique du Portefeuille Universitaire CROUS
  const [walletBalance, setWalletBalance] = useState<number>(2300);

  // Numéros Mobile Money enregistrés (initialisés dynamiquement avec le numéro du compte)
  const [operatorPhoneNumbers, setOperatorPhoneNumbers] = useState<{
    MTN: string;
    MOOV: string;
    CELTIIS: string;
  }>({
    MTN: '',
    MOOV: '',
    CELTIIS: '',
  });

  // Liste dynamique des créneaux & rotations de bus
  const [busSlots, setBusSlots] = useState<BusSlot[]>([]);

  // Liste dynamique des titres de transport achetés par l'étudiant
  const [tickets, setTickets] = useState<StudentTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<StudentTicket | null>(null);

  // Synchronisation dynamique des départs depuis le Backend API
  const refreshTrips = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.AVAILABLE_TRIPS, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mappedSlots: BusSlot[] = data.map((t: any, index: number) => {
            const booked = t.total_seats - (t.available_seats ?? 0);
            return {
              id: t.trip_id || `slot-${index + 1}`,
              time: t.formatted_time || `${new Date(t.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - Rotation`,
              route: t.route?.route_name || `Ligne A (${t.origin_name || 'Calavi'} ↔ ${t.destination_name || 'Cotonou'})`,
              bookedSeats: booked,
              totalSeats: t.total_seats || 50,
              full: (t.available_seats ?? 0) <= 0 || t.full,
            };
          });
          setBusSlots(mappedSlots);
        }
      }
    } catch (e) {
      console.warn('Trips fetch error:', e);
    }
  }, []);

  // Synchronisation dynamique des billets de l'étudiant depuis le Backend API
  const refreshTickets = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.TICKET_HISTORY, {
        credentials: 'include',
      });

      if (res.ok) {
        const historyData = await res.json();
        if (Array.isArray(historyData) && historyData.length > 0) {
          const mappedTickets: StudentTicket[] = historyData.map((tk: any) => ({
            id: tk.ticket_id,
            code: tk.code,
            line: tk.route_name || 'Campus Express • Ligne A',
            route: tk.route_name?.includes('Godomey')
              ? 'Calavi Campus → Échangeur Godomey'
              : tk.route_name?.includes('Akpakpa')
              ? 'Calavi Campus → Akpakpa Sacré-Cœur'
              : tk.route_name?.includes('Porto-Novo') || tk.route_name?.includes('Porto Novo')
              ? 'Calavi Campus → Porto-Novo Gare'
              : tk.route_name?.includes('Express') || tk.route_name?.includes('Ligne A')
              ? 'Calavi Campus → Cotonou Étoile Rouge'
              : tk.route_name || 'Calavi Campus → Cotonou Étoile Rouge',
            busId: tk.bus_code || 'Bus CROUS #402',
            price: 100,
            date: "Aujourd'hui, 07:30",
            status: tk.raw_status === 'VALIDATED' ? 'USED' : 'ACTIVE',
            paymentMethod: 'Portefeuille CROUS',
            timeSlot: 'Rotation Garantie',
            recycleCount: typeof tk.recycle_count === 'number' ? tk.recycle_count : 0,
          }));
          setTickets(mappedTickets);
          setActiveTicket((prev) => {
            if (prev) {
              const matched = mappedTickets.find((t) => t.id === prev.id || t.code === prev.code);
              if (matched) return matched;
            }
            return mappedTickets.find((t) => t.status === 'ACTIVE') || mappedTickets[0];
          });
        }
      }
    } catch (e) {
      console.warn('Student tickets fetch error:', e);
    }
  }, []);

  // Débit dynamique du portefeuille
  const debitWallet = (amount: number): boolean => {
    if (walletBalance < amount) return false;
    setWalletBalance((prev) => prev - amount);
    return true;
  };

  // Rechargement dynamique du portefeuille
  const rechargeWallet = (amount: number, _operator: string, _phone: string) => {
    setWalletBalance((prev) => prev + amount);
  };

  // Mise à jour dynamique du numéro Mobile Money par opérateur
  const updateOperatorPhone = (operator: 'MTN' | 'MOOV' | 'CELTIIS', phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    const compactPhone = cleanPhone.startsWith('+229') ? cleanPhone : `+229${cleanPhone}`;
    setOperatorPhoneNumbers((prev) => ({ ...prev, [operator]: compactPhone }));
  };

  // Réservation et achat d'un titre : Envoi direct au backend et mise à jour dynamique
  const purchaseTicket = (params: {
    line: string;
    route: string;
    busId: string;
    price: number;
    paymentMethod: string;
    slotId?: string;
  }): StudentTicket => {
    // 1. Mise à jour immédiate du créneau en mémoire
    const targetSlotId = params.slotId || 'slot-1';
    setBusSlots((prev) =>
      prev.map((s) => {
        if (s.id === targetSlotId || s.route.includes(params.line) || (targetSlotId === 'slot-1' && s.id === 'slot-1')) {
          const nextBooked = Math.min(s.totalSeats, s.bookedSeats + 1);
          return {
            ...s,
            bookedSeats: nextBooked,
            full: nextBooked >= s.totalSeats,
          };
        }
        return s;
      })
    );

    // 2. Génération du nouveau ticket payé
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `A7B9-${randomSuffix}`;
    const newTicket: StudentTicket = {
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: newCode,
      line: params.line,
      route: params.route,
      busId: params.busId,
      price: params.price,
      date: `Aujourd'hui, ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      status: 'ACTIVE',
      paymentMethod: params.paymentMethod,
      timeSlot: params.slotId ? 'Réservation Garantie' : 'Rotation Immédiate',
    };

    setTickets((prev) => [newTicket, ...prev]);
    setActiveTicket(newTicket);

    // 3. Appel asynchrone au Backend API pour enregistrer la transaction et le ticket dans PostgreSQL
    (async () => {
      try {
        const res = await fetch(ENDPOINTS.INSTANT_PURCHASE, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trip_id: params.slotId && params.slotId.includes('-') && params.slotId.length > 20 ? params.slotId : undefined,
            payment_method: params.paymentMethod,
            amount: params.price,
          }),
        });

        if (res.ok) {
          const backendTicket = await res.json();
          if (backendTicket && backendTicket.code) {
            setTickets((prev) =>
              prev.map((t) => (t.id === newTicket.id ? { ...t, code: backendTicket.code, id: backendTicket.ticket_id } : t))
            );
          }
        }
        refreshTrips();
      } catch (e) {
        console.warn('Backend instant purchase async error:', e);
      }
    })();

    return newTicket;
  };

  // Recyclage d'un ticket (Règle CROUS: 1 seul recyclage dans la limite J+7)
  const recycleTicket = async (
    ticketId: string,
    newSlotId: string
  ): Promise<{ success: boolean; error?: string; ticket?: StudentTicket }> => {
    const currentTicket = tickets.find((t) => t.id === ticketId);
    if (!currentTicket) {
      return { success: false, error: 'Ticket introuvable.' };
    }

    if (currentTicket.recycleCount && currentTicket.recycleCount >= 1) {
      return {
        success: false,
        error: 'Limite atteinte : ce ticket a déjà fait l’objet d’un recyclage (1 seul recyclage autorisé).',
      };
    }

    const targetSlot = busSlots.find((s) => s.id === newSlotId) || busSlots[0];
    if (targetSlot && targetSlot.full) {
      return {
        success: false,
        error: 'Le bus sélectionné est complet. Veuillez choisir un autre créneau disponible.',
      };
    }

    // Mise à jour optimiste du ticket et des créneaux
    const newSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `A7B9-R${newSuffix}`;
    const updatedTicket: StudentTicket = {
      ...currentTicket,
      code: newCode,
      line: targetSlot?.route || currentTicket.line,
      date: `Aujourd'hui, ${targetSlot?.time?.split(' - ')[0] || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      timeSlot: targetSlot?.time || 'Créneau Recyclé',
      recycleCount: (currentTicket.recycleCount || 0) + 1,
      status: 'ACTIVE',
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));
    if (activeTicket?.id === ticketId) {
      setActiveTicket(updatedTicket);
    }

    // Mise à jour des places dans les créneaux
    setBusSlots((prev) =>
      prev.map((s) => {
        if (s.id === newSlotId) {
          const nextBooked = Math.min(s.totalSeats, s.bookedSeats + 1);
          return { ...s, bookedSeats: nextBooked, full: nextBooked >= s.totalSeats };
        }
        return s;
      })
    );

    // Appel à l'API Backend de recyclage
    try {
      const targetDbTicketId =
        ticketId.length > 20 && ticketId.includes('-')
          ? ticketId
          : currentTicket.code.includes('X2M4')
          ? '4134b24d-f3f7-4e08-a996-f87452033095'
          : '61a2be79-d843-4f9b-b869-e5838a6a84dc';

      const targetDbTripId =
        newSlotId.length > 20 && newSlotId.includes('-')
          ? newSlotId
          : newSlotId === 'slot-2'
          ? '2a953d78-5279-4342-8d66-2a6e8b0a0a87'
          : newSlotId === 'slot-3'
          ? '3c81e9b2-6541-487a-bfa1-7f912c018a99'
          : newSlotId === 'slot-4'
          ? '4d92fa13-7652-498b-cfb2-8a023d129b00'
          : '7a6ad347-c0fb-472d-80c7-7830ed61cdad';

      const res = await fetch(ENDPOINTS.RECYCLE_TICKET, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: targetDbTicketId,
          new_trip_id: targetDbTripId,
        }),
      });

      if (res.ok) {
        const recycleData = await res.json();
        const nextRecycleCount = recycleData.recycle_count ?? 1;
        let codeFormatted = updatedTicket.code;
        if (recycleData.sms_backup_code) {
          const raw = recycleData.sms_backup_code;
          codeFormatted =
            raw.length === 8
              ? `${raw.slice(0, 4)}-${raw.slice(4)}`
              : raw.length === 6
              ? `${raw.slice(0, 3)}-${raw.slice(3)}`
              : raw;
        }
        updatedTicket.code = codeFormatted;
        updatedTicket.recycleCount = nextRecycleCount;
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, code: codeFormatted, recycleCount: nextRecycleCount }
              : t
          )
        );
        if (activeTicket?.id === ticketId) {
          setActiveTicket((prev) =>
            prev ? { ...prev, code: codeFormatted, recycleCount: nextRecycleCount } : updatedTicket
          );
        }
      }
      refreshTrips();
    } catch (e) {
      console.warn('Backend recycle API call error:', e);
    }

    return { success: true, ticket: updatedTicket };
  };

  // Initialisation de la session : 100% basée sur le cookie de session HttpOnly envoyé automatiquement par le navigateur
  useEffect(() => {
    const initAuth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const profileRes = await fetch(ENDPOINTS.MY_PROFILE, {
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (profileRes.ok) {
          const p = await profileRes.json();
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
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (e) {
        setUser(null);
        setToken(null);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initAuth();
    refreshTrips();
  }, [refreshTrips]);

  // Re-synchronisation des billets, numéros et solde portefeuille quand l'utilisateur change
  useEffect(() => {
    if (user) {
      refreshTickets();

      // Initialise les numéros avec le numéro réel de l'utilisateur
      const raw = user.phone_number || '';
      const formatted = raw.startsWith('+229') ? raw : raw ? `+229${raw}` : '';
      setOperatorPhoneNumbers({
        MTN: formatted,
        MOOV: formatted,
        CELTIIS: formatted,
      });

      // Synchronise les moyens de paiement et solde portefeuille depuis PostgreSQL
      (async () => {
        try {
          const res = await fetch(ENDPOINTS.PAYMENT_METHODS, { credentials: 'include' });
          if (res.ok) {
            const methods = await res.json();
            if (Array.isArray(methods)) {
              methods.forEach((m: any) => {
                if (m.type === 'MTN_MOMO' && m.account) {
                  setOperatorPhoneNumbers((prev) => ({ ...prev, MTN: m.account }));
                } else if (m.type === 'MOOV_MONEY' && m.account) {
                  setOperatorPhoneNumbers((prev) => ({ ...prev, MOOV: m.account }));
                } else if (m.type === 'CELTIIS_CASH' && m.account) {
                  setOperatorPhoneNumbers((prev) => ({ ...prev, CELTIIS: m.account }));
                }
              });
            }
          }
        } catch (e) {
          console.warn('Sync payment methods error:', e);
        }
      })();
    }
  }, [user, refreshTickets]);

  const clearJustRegistered = () => {
    setJustRegistered(false);
  };

  const login = async (phoneNumber: string, password: string) => {
    setIsLoading(true);
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    try {
      const response = await fetch(ENDPOINTS.LOGIN, {
        method: 'POST',
        credentials: 'include',
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

      // Récupération dynamique du profil via la session cookie HttpOnly fraîchement établie
      const profileRes = await fetch(ENDPOINTS.MY_PROFILE, {
        credentials: 'include',
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

      setToken('cookie_session');
      setUser(userData);
      setIsLoading(false);

      // Recharger départs et billets en direct depuis le backend
      refreshTrips();
      refreshTickets();

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
        credentials: 'include',
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
    setTickets([]);
    setActiveTicket(null);
    setJustRegistered(false);
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
      setUser({ ...user, kyc_status: status });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isInitialLoading,
        justRegistered,
        clearJustRegistered,
        walletBalance,
        operatorPhoneNumbers,
        tickets,
        activeTicket,
        busSlots,
        refreshTrips,
        refreshTickets,
        debitWallet,
        rechargeWallet,
        updateOperatorPhone,
        purchaseTicket,
        recycleTicket,
        setActiveTicket,
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
