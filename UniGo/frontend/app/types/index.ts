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

export interface RideRequest {
  id: string;
  from: string;
  to: string;
  time: string;
  riders: number;
  tokens: number;
}

export interface Rating {
  smoothness: number;
  comfort: number;
  amenities: string[];
}

export default {};