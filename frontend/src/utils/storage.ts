import { Platform } from 'react-native';

const STORAGE_KEYS = {
  USER: '@epass_user_session',
  TOKEN: '@epass_auth_token',
  TICKETS: '@epass_student_tickets',
  ACTIVE_TICKET: '@epass_active_ticket',
  WALLET: '@epass_wallet_balance',
  PHONE_NUMBERS: '@epass_phone_numbers',
  OFFLINE_CACHE_TIME: '@epass_offline_cache_time',
  NAV_STATE: '@epass_nav_state',
};


// Universal Storage Adapter: supporte React Native Web (localStorage) & Mobile Native (AsyncStorage)
const getNativeStorage = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    return mod.default || mod;
  } catch (e) {
    return null;
  }
};

const UniversalStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    const native = getNativeStorage();
    if (native) {
      return await native.getItem(key);
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    const native = getNativeStorage();
    if (native) {
      await native.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    const native = getNativeStorage();
    if (native) {
      await native.removeItem(key);
    }
  },
};

export const StorageService = {
  async saveUser(user: any): Promise<void> {
    try {
      if (!user) {
        await UniversalStorage.removeItem(STORAGE_KEYS.USER);
      } else {
        await UniversalStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    } catch (e) {
      console.warn('StorageService.saveUser error:', e);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const data = await UniversalStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('StorageService.getUser error:', e);
      return null;
    }
  },

  async saveToken(token: string | null): Promise<void> {
    try {
      if (!token) {
        await UniversalStorage.removeItem(STORAGE_KEYS.TOKEN);
      } else {
        await UniversalStorage.setItem(STORAGE_KEYS.TOKEN, token);
      }
    } catch (e) {
      console.warn('StorageService.saveToken error:', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await UniversalStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (e) {
      console.warn('StorageService.getToken error:', e);
      return null;
    }
  },

  async saveTickets(tickets: any[], activeTicket: any | null): Promise<void> {
    try {
      await UniversalStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets || []));
      if (activeTicket) {
        await UniversalStorage.setItem(STORAGE_KEYS.ACTIVE_TICKET, JSON.stringify(activeTicket));
      }
      await UniversalStorage.setItem(STORAGE_KEYS.OFFLINE_CACHE_TIME, Date.now().toString());
    } catch (e) {
      console.warn('StorageService.saveTickets error:', e);
    }
  },

  async getTickets(): Promise<{ tickets: any[]; activeTicket: any | null; cachedAt: number | null }> {
    try {
      const ticketsRaw = await UniversalStorage.getItem(STORAGE_KEYS.TICKETS);
      const activeRaw = await UniversalStorage.getItem(STORAGE_KEYS.ACTIVE_TICKET);
      const cachedAtRaw = await UniversalStorage.getItem(STORAGE_KEYS.OFFLINE_CACHE_TIME);

      const tickets = ticketsRaw ? JSON.parse(ticketsRaw) : [];
      const activeTicket = activeRaw ? JSON.parse(activeRaw) : (tickets.find((t: any) => t.status === 'ACTIVE') || null);
      const cachedAt = cachedAtRaw ? parseInt(cachedAtRaw, 10) : null;

      return { tickets, activeTicket, cachedAt };
    } catch (e) {
      console.warn('StorageService.getTickets error:', e);
      return { tickets: [], activeTicket: null, cachedAt: null };
    }
  },

  async saveWallet(balance: number, phones: { MTN: string; MOOV: string; CELTIIS: string }): Promise<void> {
    try {
      await UniversalStorage.setItem(STORAGE_KEYS.WALLET, balance.toString());
      await UniversalStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(phones));
    } catch (e) {
      console.warn('StorageService.saveWallet error:', e);
    }
  },

  async getWallet(): Promise<{ balance: number; phones: { MTN: string; MOOV: string; CELTIIS: string } | null }> {
    try {
      const bal = await UniversalStorage.getItem(STORAGE_KEYS.WALLET);
      const phonesRaw = await UniversalStorage.getItem(STORAGE_KEYS.PHONE_NUMBERS);
      return {
        balance: bal ? parseFloat(bal) : 2300,
        phones: phonesRaw ? JSON.parse(phonesRaw) : null,
      };
    } catch (e) {
      console.warn('StorageService.getWallet error:', e);
      return { balance: 2300, phones: null };
    }
  },

  async saveNavState(state: any): Promise<void> {
    try {
      if (!state) {
        await UniversalStorage.removeItem(STORAGE_KEYS.NAV_STATE);
      } else {
        await UniversalStorage.setItem(STORAGE_KEYS.NAV_STATE, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('StorageService.saveNavState error:', e);
    }
  },

  async getNavState(): Promise<any | null> {
    try {
      const data = await UniversalStorage.getItem(STORAGE_KEYS.NAV_STATE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('StorageService.getNavState error:', e);
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        UniversalStorage.removeItem(STORAGE_KEYS.USER),
        UniversalStorage.removeItem(STORAGE_KEYS.TOKEN),
        UniversalStorage.removeItem(STORAGE_KEYS.TICKETS),
        UniversalStorage.removeItem(STORAGE_KEYS.ACTIVE_TICKET),
        UniversalStorage.removeItem(STORAGE_KEYS.WALLET),
        UniversalStorage.removeItem(STORAGE_KEYS.PHONE_NUMBERS),
        UniversalStorage.removeItem(STORAGE_KEYS.OFFLINE_CACHE_TIME),
        UniversalStorage.removeItem(STORAGE_KEYS.NAV_STATE),
      ]);
    } catch (e) {
      console.warn('StorageService.clearAll error:', e);
    }
  },
};

