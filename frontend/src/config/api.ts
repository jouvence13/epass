/**
 * Configuration de l'API Backend pour le Frontend Mobile / Web
 */
import { Platform } from 'react-native';

// Adresse de base du Backend :
// - Sur le Web / Navigateur : http://localhost:8000
// - Sur l'émulateur Android : http://10.0.2.2:8000
// - Sur un smartphone physique : Remplacer par l'IP locale de votre machine (ex: http://192.168.1.50:8000)
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8001';
  }
  return 'http://localhost:8001';
};

export const API_BASE_URL = getBaseUrl();
export const API_V1_URL = `${API_BASE_URL}/api/v1`;
export const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export const ENDPOINTS = {
  // Authentification
  LOGIN: `${API_V1_URL}/auth/login`,
  REGISTER: `${API_V1_URL}/auth/register`,
  LOGOUT: `${API_V1_URL}/auth/logout`,
  REFRESH_TOKEN: `${API_V1_URL}/auth/refresh`,
  MY_PROFILE: `${API_V1_URL}/auth/me`,

  // KYC
  UPLOAD_KYC: `${API_V1_URL}/kyc/upload`,
  MY_DOCUMENTS: `${API_V1_URL}/kyc/my-documents`,

  // Trajets & Billetterie Étudiant
  AVAILABLE_TRIPS: `${API_V1_URL}/trips/available`,
  ACTIVE_TICKET: `${API_V1_URL}/trips/student/active-ticket`,
  TICKET_HISTORY: `${API_V1_URL}/trips/student/history`,
  BOOK_TRIP: (tripId: string) => `${API_V1_URL}/trips/${tripId}/book`,
  BOOK_TRIP_INSTANT: (tripId: string) => `${API_V1_URL}/trips/${tripId}/instant-purchase`,
  INSTANT_PURCHASE: `${API_V1_URL}/trips/instant-purchase`,
  RECYCLE_TICKET: `${API_V1_URL}/recycle/execute`,

  // Chauffeur & Contrôle
  DRIVER_ACTIVE_TRIP: `${API_V1_URL}/driver/active-trip`,
  DRIVER_PASSENGERS: `${API_V1_URL}/driver/passengers`,
  DRIVER_VALIDATE: `${API_V1_URL}/driver/validate-ticket`,
  DRIVER_MANUAL_VALIDATE: (ticketId: string) => `${API_V1_URL}/driver/tickets/${ticketId}/manual-validate`,
  DRIVER_REPORT_DELAY: `${API_V1_URL}/driver/report-delay`,
  DRIVER_ALERTS: `${API_V1_URL}/driver/alerts`,

  // WebSockets
  WS_STUDENT_TRACKING: (tripId: string) => `${WS_BASE_URL}/ws/student/track/${tripId}`,
  WS_DRIVER_TRACKING: (tripId: string) => `${WS_BASE_URL}/ws/driver/track/${tripId}`,
};
