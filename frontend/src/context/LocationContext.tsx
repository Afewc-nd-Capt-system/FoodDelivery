'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocationContextType {
  location: {
    lat: number | null;
    lng: number | null;
    city: string;
    state: string;
    country: string;
    formattedAddress: string;
  };
  isDetecting: boolean;
  detectionError: string | null;
  isLocationEnabled: boolean;
  detectLocation: () => Promise<void>;
  setLocation: (location: Partial<LocationContextType['location']>) => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState({
    lat: null as number | null,
    lng: null as number | null,
    city: '',
    state: '',
    country: 'Nigeria',
    formattedAddress: '',
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocationState(parsed);
        setIsLocationEnabled(true);
      } catch (error) {
        console.error('Error parsing saved location:', error);
      }
    }
  }, []);

  // Save location to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.lat && location.lng) {
      localStorage.setItem('userLocation', JSON.stringify(location));
      setIsLocationEnabled(true);
    } else {
      localStorage.removeItem('userLocation');
      setIsLocationEnabled(false);
    }
  }, [location]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        const city = address.city || address.town || address.village || '';
        const state = address.state || '';
        const country = address.country || 'Nigeria';
        
        // Check if it's in Nigeria
        if (country.toLowerCase().includes('nigeria') || nigerianStates.includes(state)) {
          return {
            city,
            state,
            country: 'Nigeria',
            formattedAddress: data.display_name || `${city}, ${state}, Nigeria`
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setDetectionError('Geolocation is not supported by your browser');
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get city and state
          const addressData = await reverseGeocode(latitude, longitude);
          
          if (addressData) {
            setLocationState({
              lat: latitude,
              lng: longitude,
              city: addressData.city,
              state: addressData.state,
              country: addressData.country,
              formattedAddress: addressData.formattedAddress,
            });
            setDetectionError(null);
            resolve();
          } else {
            setDetectionError('Unable to detect your location in Nigeria. Please select your city manually.');
            reject(new Error('Location not in Nigeria'));
          }
          
          setIsDetecting(false);
        },
        (error) => {
          setIsDetecting(false);
          let errorMessage = 'Unable to detect your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access or select your city manually.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please select your city manually.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again or select your city manually.';
              break;
          }
          
          setDetectionError(errorMessage);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const setLocation = (newLocation: Partial<LocationContextType['location']>) => {
    setLocationState(prev => ({ ...prev, ...newLocation }));
  };

  const clearLocation = () => {
    setLocationState({
      lat: null,
      lng: null,
      city: '',
      state: '',
      country: 'Nigeria',
      formattedAddress: '',
    });
    if (typeof window !== 'undefined') localStorage.removeItem('userLocation');
    setIsLocationEnabled(false);
  };

  const value: LocationContextType = {
    location,
    isDetecting,
    detectionError,
    isLocationEnabled,
    detectLocation,
    setLocation,
    clearLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
