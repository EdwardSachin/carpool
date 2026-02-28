import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking, Alert } from 'react-native';
import { apiPost, apiGet, apiPut } from '../_constants/api';

type UserMode = 'rider' | 'driver';

interface College {
  id: string;
  name: string;
  short: string;
}

interface Vehicle {
  make: string;
  model: string;
  year?: string;
  color?: string;
  licensePlate?: string;
}

interface EcoStats {
  carbonSavedKg: number;
  timeSavedMinutes: number;
  totalRides: number;
  treesEquivalent: number;
}

interface CampusReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'snacks' | 'books' | 'stationery' | 'other';
  icon: string;
  available: boolean;
}

interface RideBroadcast {
  id: string;
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  vehicle?: Vehicle;
  created_at: string;
  expires_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  college: College | null;
  ecoScore: number;
  verified: boolean;
  isDriver?: boolean;
  driverVerificationStatus?: 'pending' | 'approved' | 'rejected';
  profilePicture?: string;
  vehicle?: Vehicle;
  drivingLicenseUploaded?: boolean;
  drivingLicenseImage?: string;
  ecoStats?: EcoStats;
  campusPoints: number;
}


interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface PublishedRoute {
  id: string;
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  direction: 'to_college' | 'from_college';
  available_seats: number;
  price_per_seat: number;
  amenities: string[];
  pickup_points: Array<{
    id: string;
    name: string;
    landmark: string;
    estimatedTime: string;
  }>;
  is_active: boolean;
  created_at: string;
  vehicle?: Vehicle;
}

interface AppState {
  user: User | null;
  isOnboarded: boolean;
  mode: UserMode;
  publishedRoutes: PublishedRoute[];
  emergencyContacts: EmergencyContact[];
  rideBroadcasts: RideBroadcast[];

  setUser: (user: User) => void;
  setOnboarded: (value: boolean) => void;
  setMode: (mode: UserMode) => void;
  setCollege: (college: College) => void;
  loadPersistedData: () => Promise<void>;
  logout: () => void;

  // Route management
  publishRoute: (route: PublishedRoute) => void;
  removeRoute: (routeId: string) => void;

  // Emergency contacts
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (contactId: string) => void;

  // SOS functions
  callPolice: () => void;
  alertEmergencyContacts: () => void;

  // Auth (API-backed)
  login: (email: string, password: string) => Promise<boolean>;
  updateAccount: (data: Partial<User>) => Promise<void>;

  // Vehicle and license
  setVehicle: (vehicle: Vehicle) => void;
  setDrivingLicenseUploaded: (uploaded: boolean, licenseImage?: string) => void;
  setProfilePicture: (uri: string) => void;
  updateEcoStats: (carbonKg: number, timeMinutes: number) => void;

  // Campus points
  addCampusPoints: (points: number) => void;
  spendCampusPoints: (points: number) => boolean;

  // Ride broadcasts
  broadcastRide: (broadcast: RideBroadcast) => void;
  removeBroadcast: (broadcastId: string) => void;
  clearExpiredBroadcasts: () => void;
}

export type { PublishedRoute, EmergencyContact, Vehicle, EcoStats, CampusReward, RideBroadcast };

const safeSetItem = async (key: string, value: string) => {
  if (Platform.OS !== 'web') {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }
};

const safeGetItem = async (key: string): Promise<string | null> => {
  if (Platform.OS !== 'web') {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('Storage error:', e);
      return null;
    }
  }
  return null;
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isOnboarded: false,
  mode: 'rider',
  publishedRoutes: [],
  rideBroadcasts: [],
  emergencyContacts: [
    { id: '1', name: 'Mom', phone: '+919876543210' },
    { id: '2', name: 'Dad', phone: '+919876543211' },
    { id: '3', name: 'Friend', phone: '+919876543212' },
  ],

  setUser: (user) => {
    set({ user });
    safeSetItem('user', JSON.stringify(user));
  },

  setOnboarded: (value) => {
    set({ isOnboarded: value });
    safeSetItem('isOnboarded', JSON.stringify(value));
  },

  setMode: (mode) => {
    set({ mode });
    safeSetItem('mode', mode);
  },

  setCollege: (college) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, college };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    }
  },

  logout: () => {
    set({ user: null, isOnboarded: false });
    safeSetItem('user', '');
    safeSetItem('isOnboarded', 'false');
  },

  // Auth (API-backed)
  login: async (email: string, password: string) => {
    try {
      const result = await apiPost('/api/auth/login', { email, password });
      const userData = result.user;
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        college: userData.college,
        ecoScore: userData.ecoScore || 0,
        campusPoints: userData.campusPoints || 0,
        verified: true,
      };
      set({ user, isOnboarded: true });
      safeSetItem('user', JSON.stringify(user));
      safeSetItem('isOnboarded', 'true');
      return true;
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
      return false;
    }
  },

  updateAccount: async (data: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    try {
      const result = await apiPut(`/api/account/${currentUser.id}`, data);
      const updatedUser = { ...currentUser, ...result.user };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    } catch (e: any) {
      console.warn('Failed to update account:', e.message);
    }
  },

  // Route management
  publishRoute: (route) => {
    const currentRoutes = get().publishedRoutes;
    const updatedRoutes = [...currentRoutes, route];
    set({ publishedRoutes: updatedRoutes });
    safeSetItem('publishedRoutes', JSON.stringify(updatedRoutes));
  },

  removeRoute: (routeId) => {
    const currentRoutes = get().publishedRoutes;
    const updatedRoutes = currentRoutes.filter(r => r.id !== routeId);
    set({ publishedRoutes: updatedRoutes });
    safeSetItem('publishedRoutes', JSON.stringify(updatedRoutes));
  },

  // Emergency contacts management
  setEmergencyContacts: (contacts) => {
    set({ emergencyContacts: contacts });
    safeSetItem('emergencyContacts', JSON.stringify(contacts));
  },

  addEmergencyContact: (contact) => {
    const currentContacts = get().emergencyContacts;
    if (currentContacts.length < 3) {
      const updatedContacts = [...currentContacts, contact];
      set({ emergencyContacts: updatedContacts });
      safeSetItem('emergencyContacts', JSON.stringify(updatedContacts));
    }
  },

  removeEmergencyContact: (contactId) => {
    const currentContacts = get().emergencyContacts;
    const updatedContacts = currentContacts.filter(c => c.id !== contactId);
    set({ emergencyContacts: updatedContacts });
    safeSetItem('emergencyContacts', JSON.stringify(updatedContacts));
  },

  // SOS functions
  callPolice: () => {
    const policeNumber = 'tel:100';
    Linking.canOpenURL(policeNumber)
      .then((supported) => {
        if (supported) {
          Linking.openURL(policeNumber);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
      })
      .catch((err) => {
        console.error('Error calling police:', err);
        Alert.alert('Error', 'Unable to make phone call');
      });
  },

  alertEmergencyContacts: () => {
    const contacts = get().emergencyContacts;
    const user = get().user;
    const userName = user?.name || 'A user';

    if (contacts.length === 0) {
      Alert.alert('No Emergency Contacts', 'Please add emergency contacts first.');
      return;
    }

    // Compose SMS to all emergency contacts
    const phoneNumbers = contacts.map(c => c.phone).join(',');
    const message = encodeURIComponent(`EMERGENCY SOS from ${userName}! I need help. This is an automated emergency alert from UniGo app.`);
    const smsUrl = Platform.OS === 'ios'
      ? `sms:${phoneNumbers}&body=${message}`
      : `sms:${phoneNumbers}?body=${message}`;

    Linking.canOpenURL(smsUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(smsUrl);
          Alert.alert('SOS Sent', `Emergency alert sent to ${contacts.length} contacts.`);
        } else {
          Alert.alert('Error', 'Unable to send SMS');
        }
      })
      .catch((err) => {
        console.error('Error sending SOS:', err);
        Alert.alert('Error', 'Unable to send emergency alert');
      });
  },

  // Vehicle and license management
  setVehicle: (vehicle) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, vehicle };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    }
  },

  setDrivingLicenseUploaded: (uploaded, licenseImage) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        drivingLicenseUploaded: uploaded,
        drivingLicenseImage: licenseImage,
        isDriver: uploaded,
        driverVerificationStatus: uploaded ? 'pending' : undefined,
      };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    }
  },

  setProfilePicture: (uri) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, profilePicture: uri };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    }
  },

  updateEcoStats: (carbonKg, timeMinutes) => {
    const currentUser = get().user;
    if (currentUser) {
      const currentStats = currentUser.ecoStats || { carbonSavedKg: 0, timeSavedMinutes: 0, totalRides: 0, treesEquivalent: 0 };
      const newStats = {
        carbonSavedKg: currentStats.carbonSavedKg + carbonKg,
        timeSavedMinutes: currentStats.timeSavedMinutes + timeMinutes,
        totalRides: currentStats.totalRides + 1,
        treesEquivalent: Math.floor((currentStats.carbonSavedKg + carbonKg) / 21), // ~21kg CO2 per tree per year
      };
      const updatedUser = { ...currentUser, ecoStats: newStats };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    }
  },

  // Campus points management
  addCampusPoints: (points) => {
    const currentUser = get().user;
    if (currentUser) {
      const newPoints = (currentUser.campusPoints || 0) + points;
      const updatedUser = { ...currentUser, campusPoints: newPoints };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
    }
  },

  spendCampusPoints: (points) => {
    const currentUser = get().user;
    if (currentUser && (currentUser.campusPoints || 0) >= points) {
      const newPoints = (currentUser.campusPoints || 0) - points;
      const updatedUser = { ...currentUser, campusPoints: newPoints };
      set({ user: updatedUser });
      safeSetItem('user', JSON.stringify(updatedUser));
      return true;
    }
    return false;
  },

  // Ride broadcasts management
  broadcastRide: (broadcast) => {
    const currentBroadcasts = get().rideBroadcasts;
    const updatedBroadcasts = [...currentBroadcasts, broadcast];
    set({ rideBroadcasts: updatedBroadcasts });
    safeSetItem('rideBroadcasts', JSON.stringify(updatedBroadcasts));
  },

  removeBroadcast: (broadcastId) => {
    const currentBroadcasts = get().rideBroadcasts;
    const updatedBroadcasts = currentBroadcasts.filter(b => b.id !== broadcastId);
    set({ rideBroadcasts: updatedBroadcasts });
    safeSetItem('rideBroadcasts', JSON.stringify(updatedBroadcasts));
  },

  clearExpiredBroadcasts: () => {
    const currentBroadcasts = get().rideBroadcasts;
    const now = new Date().toISOString();
    const activeBroadcasts = currentBroadcasts.filter(b => b.expires_at > now);
    set({ rideBroadcasts: activeBroadcasts });
    safeSetItem('rideBroadcasts', JSON.stringify(activeBroadcasts));
  },

  loadPersistedData: async () => {
    try {
      const [userStr, onboardedStr, mode, routesStr, contactsStr, broadcastsStr] = await Promise.all([
        safeGetItem('user'),
        safeGetItem('isOnboarded'),
        safeGetItem('mode'),
        safeGetItem('publishedRoutes'),
        safeGetItem('emergencyContacts'),
        safeGetItem('rideBroadcasts'),
      ]);

      if (userStr) set({ user: JSON.parse(userStr) });
      if (onboardedStr) set({ isOnboarded: JSON.parse(onboardedStr) });
      if (mode) set({ mode: mode as UserMode });
      if (routesStr) set({ publishedRoutes: JSON.parse(routesStr) });
      if (contactsStr) set({ emergencyContacts: JSON.parse(contactsStr) });
      if (broadcastsStr) set({ rideBroadcasts: JSON.parse(broadcastsStr) });
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  },
}));