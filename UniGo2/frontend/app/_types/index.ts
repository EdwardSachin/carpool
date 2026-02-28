export interface College {
  id: string;
  name: string;
  short: string;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  rides: number;
  validity: string;
  features: string[];
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  vehicle: string;
  location: {
    latitude: number;
    longitude: number;
  };
  amenities: string[];
}

export interface PickupPoint {
  id: string;
  name: string;
  landmark?: string;
  estimatedTime: string;
}

export interface RideRequest {
  id: string;
  from: string;
  to: string;
  time: string;
  riders: number;
  tokens: number;
}

export interface AvailableRide {
  id: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  pickupPoints: PickupPoint[];
  amenities: string[];
  rating: number;
  isFemale: boolean;
}

export interface RideRequestData {
  id: string;
  riderId: string;
  riderName: string;
  driverId: string;
  driverName: string;
  routeId: string;
  pickupLocation: string;
  pickupTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}

export interface Rating {
  smoothness: number;
  comfort: number;
  amenities: string[];
}
