import Constants from 'expo-constants';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.151.4.46:8000';

export interface College {
  id: string;
  name: string;
  short: string;
  department?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  college: College;
  department?: string;
  semester?: number;
  location?: string;
  ecoScore: number;
  carbonSaved: number;
  verified: boolean;
  isDriving: boolean;
  isDriver: boolean;
  homeLocation?: string;
}

export interface PickupPoint {
  id: string;
  name: string;
  landmark?: string;
  estimatedTime: string; // e.g., "8:15 AM"
}

export interface Vehicle {
  make: string;
  model: string;
  year?: string;
  color?: string;
  licensePlate?: string;
}

export interface DriverRoute {
  id: string;
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  direction: string;
  available_seats: number;
  price_per_seat: number;
  amenities: string[];
  pickup_points: PickupPoint[];
  is_active: boolean;
  created_at: string;
  vehicle?: Vehicle;
}

export interface RideRequest {
  id: string;
  rider_id: string;
  rider_name: string;
  driver_id: string;
  driver_name: string;
  route_id: string;
  pickup_location: string;
  pickup_time: string;
  status: string;
  created_at: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  college: College;
  department?: string;
  semester?: number;
  location?: string;
}

export interface CreateRoutePayload {
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  direction: string;
  available_seats: number;
  price_per_seat: number;
  amenities: string[];
  pickup_points: PickupPoint[];
}

export interface CreateRideRequestPayload {
  rider_id: string;
  rider_name: string;
  driver_id: string;
  driver_name: string;
  route_id: string;
  pickup_location: string;
  pickup_time: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API] ${options?.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Error ${response.status}: ${errorText}`);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[API] Response:`, data);
      return data;
    } catch (error) {
      console.error(`[API] Request failed:`, error);
      throw error;
    }
  }

  // User endpoints
  async createUser(payload: CreateUserPayload): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  async updateDrivingStatus(userId: string, isDriving: boolean): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/users/${userId}/driving-status?is_driving=${isDriving}`, {
      method: 'PUT',
    });
  }

  async getActiveDrivers(): Promise<{ drivers: User[] }> {
    return this.request<{ drivers: User[] }>('/users/active-drivers/list');
  }

  // Driver Routes endpoints
  async createDriverRoute(payload: CreateRoutePayload): Promise<DriverRoute> {
    return this.request<DriverRoute>('/driver-routes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getActiveRoutes(): Promise<DriverRoute[]> {
    return this.request<DriverRoute[]>('/driver-routes/active');
  }

  async deactivateRoute(routeId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/driver-routes/${routeId}/deactivate`, {
      method: 'PUT',
    });
  }

  // Ride Request endpoints (Handshake)
  async createRideRequest(payload: CreateRideRequestPayload): Promise<RideRequest> {
    return this.request<RideRequest>('/ride-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDriverRequests(driverId: string): Promise<{ requests: RideRequest[] }> {
    return this.request<{ requests: RideRequest[] }>(`/ride-requests/driver/${driverId}`);
  }

  async acceptRideRequest(requestId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/ride-requests/${requestId}/accept`, {
      method: 'PUT',
    });
  }

  async rejectRideRequest(requestId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/ride-requests/${requestId}/reject`, {
      method: 'PUT',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

export const apiService = new ApiService();
