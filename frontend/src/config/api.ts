/**
 * Configuration de l'API Backend pour le Frontend Mobile / Web
 */
import { Platform } from 'react-native';

// URL Publique du Tunnel pour l'APK mobile (accessible partout dans le monde) :
export const PUBLIC_TUNNEL_URL = 'https://14bc-2c0f-53c0-618-9c00-db91-3bc3-36df-8940.ngrok-free.app';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8001';
  }
  // Sur mobile Android / iOS (APK autonome), utiliser le tunnel sécurisé distant
  return PUBLIC_TUNNEL_URL;
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

  // Notifications
  NOTIFICATIONS: `${API_V1_URL}/notifications/my-notifications`,
  MARK_NOTIFICATIONS_READ: `${API_V1_URL}/notifications/mark-all-read`,
  CREATE_NOTIFICATION: `${API_V1_URL}/notifications/create`,

  // Paiements & Portefeuille
  PAYMENT_METHODS: `${API_V1_URL}/payments/methods`,
  PAYMENT_HISTORY: `${API_V1_URL}/payments/history`,
  WALLET_RECHARGE: `${API_V1_URL}/payments/wallet/recharge`,

  // Trajets & Billetterie Étudiant
  AVAILABLE_TRIPS: `${API_V1_URL}/trips/available`,
  LIVE_LINES: `${API_V1_URL}/trips/live-lines`,
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
  DRIVER_PROFILE: `${API_V1_URL}/driver/profile`,
  DRIVER_UPLOAD_DOCS: `${API_V1_URL}/kyc/driver/upload`,
  CONTROLLER_UPLOAD_DOCS: `${API_V1_URL}/kyc/controller/upload`,

  // Administration CROUS & SuperAdmin
  ADMIN_AUDIT_FIN: `${API_V1_URL}/admin/audit-fin`,
  ADMIN_USERS: `${API_V1_URL}/admin/users`,
  ADMIN_CREATE_USER: `${API_V1_URL}/admin/users`,
  ADMIN_FLEET: `${API_V1_URL}/admin/fleet`,
  ADMIN_CREATE_BUS: `${API_V1_URL}/admin/fleet/bus`,
  ADMIN_ROUTES: `${API_V1_URL}/admin/routes`,
  ADMIN_CREATE_ROUTE: `${API_V1_URL}/admin/routes`,
  ADMIN_TRIPS: `${API_V1_URL}/admin/trips`,
  ADMIN_CREATE_TRIP: `${API_V1_URL}/admin/trips`,
  ADMIN_KYC_PENDING: `${API_V1_URL}/kyc/pending`,
  ADMIN_KYC_VERIFY: `${API_V1_URL}/kyc/verify`,

  // WebSockets
  WS_STUDENT_TRACKING: (tripId: string) => `${WS_BASE_URL}/ws/student/track/${tripId}`,
  WS_DRIVER_TRACKING: (tripId: string) => `${WS_BASE_URL}/ws/driver/track/${tripId}`,
};
