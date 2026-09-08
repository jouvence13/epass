import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  USER: '@epass_user_session',
  TOKEN: '@epass_auth_token',
  TICKETS: '@epass_student_tickets',
  ACTIVE_TICKET: '@epass_active_ticket',
  WALLET: '@epass_wallet_balance',
  PHONE_NUMBERS: '@epass_phone_numbers',
  OFFLINE_CACHE_TIME: '@epass_offline_cache_time',
};

export const StorageService = {
  async saveUser(user: any): Promise<void> {
    try {
      if (!user) {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    } catch (e) {
      console.warn('StorageService.saveUser error:', e);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('StorageService.getUser error:', e);
      return null;
    }
  },

  async saveToken(token: string | null): Promise<void> {
    try {
      if (!token) {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      }
    } catch (e) {
      console.warn('StorageService.saveToken error:', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (e) {
      console.warn('StorageService.getToken error:', e);
      return null;
    }
  },

  async saveTickets(tickets: any[], activeTicket: any | null): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets || []));
      if (activeTicket) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TICKET, JSON.stringify(activeTicket));
      }
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_CACHE_TIME, Date.now().toString());
    } catch (e) {
      console.warn('StorageService.saveTickets error:', e);
    }
  },

  async getTickets(): Promise<{ tickets: any[]; activeTicket: any | null; cachedAt: number | null }> {
    try {
      const ticketsRaw = await AsyncStorage.getItem(STORAGE_KEYS.TICKETS);
      const activeRaw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TICKET);
      const cachedAtRaw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_CACHE_TIME);

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
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET, balance.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(phones));
    } catch (e) {
      console.warn('StorageService.saveWallet error:', e);
    }
  },

  async getWallet(): Promise<{ balance: number; phones: { MTN: string; MOOV: string; CELTIIS: string } | null }> {
    try {
      const bal = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);
      const phonesRaw = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBERS);
      return {
        balance: bal ? parseFloat(bal) : 2300,
        phones: phonesRaw ? JSON.parse(phonesRaw) : null,
      };
    } catch (e) {
      console.warn('StorageService.getWallet error:', e);
      return { balance: 2300, phones: null };
    }
  },

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.TICKETS),
        AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TICKET),
        AsyncStorage.removeItem(STORAGE_KEYS.WALLET),
        AsyncStorage.removeItem(STORAGE_KEYS.PHONE_NUMBERS),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_CACHE_TIME),
      ]);
    } catch (e) {
      console.warn('StorageService.clearAll error:', e);
    }
  },
};
