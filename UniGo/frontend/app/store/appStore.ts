import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type UserMode = 'rider' | 'driver';

interface College {
  id: string;
  name: string;
  short: string;
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
}

interface AppState {
  user: User | null;
  isOnboarded: boolean;
  mode: UserMode;

  setUser: (user: User) => void;
  setOnboarded: (value: boolean) => void;
  setMode: (mode: UserMode) => void;
  setCollege: (college: College) => void;
  loadPersistedData: () => Promise<void>;
  onboardDriver: (collegeEmail: string, vehicleDetails?: string) => Promise<boolean>;
}

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

  loadPersistedData: async () => {
    try {
      const [userStr, onboardedStr, mode] = await Promise.all([
        safeGetItem('user'),
        safeGetItem('isOnboarded'),
        safeGetItem('mode'),
      ]);

      if (userStr) set({ user: JSON.parse(userStr) });
      if (onboardedStr) set({ isOnboarded: JSON.parse(onboardedStr) });
      if (mode) set({ mode: mode as UserMode });
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  },

  onboardDriver: async (collegeEmail, vehicleDetails) => {
    const user = get().user;
    if (!user) return false;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/onboard-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          college: user.college,
          collegeEmail,
          vehicleDetails
        }),
      });

      if (response.ok) {
        const updatedUser = {
          ...user,
          isDriver: true,
          collegeEmail,
          driverVerificationStatus: 'approved' as const
        };
        set({ user: updatedUser });
        safeSetItem('user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Onboarding failed:', error);
      return false;
    }
  },
}));

export default useAppStore;