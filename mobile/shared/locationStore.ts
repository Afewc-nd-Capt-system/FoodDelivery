import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LocationState {
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
  setLocation: (location: Partial<LocationState['location']>) => void;
  clearLocation: () => void;
  setDetectionError: (error: string | null) => void;
  setIsDetecting: (detecting: boolean) => void;
}

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const majorCities = [
  'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Kaduna', 'Port Harcourt', 
  'Benin City', 'Maiduguri', 'Zaria', 'Aba', 'Jos', 'Ilorin',
  'Oyo', 'Enugu', 'Abeokuta', 'Onitsha', 'Uyo', 'Warri', 'Osogbo', 'Ikeja'
];

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      location: {
        lat: null,
        lng: null,
        city: '',
        state: '',
        country: 'Nigeria',
        formattedAddress: '',
      },
      isDetecting: false,
      detectionError: null,
      isLocationEnabled: false,

      reverseGeocode: async (lat: number, lng: number) => {
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
      },

      detectLocation: async () => {
        const { setDetectionError, setIsDetecting, setLocation } = get();
        
        if (!navigator.geolocation) {
          setDetectionError('Geolocation is not supported by your device');
          return;
        }

        setIsDetecting(true);
        setDetectionError(null);

        return new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Reverse geocode to get city and state
              const addressData = await get().reverseGeocode(latitude, longitude);
              
              if (addressData) {
                setLocation({
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
      },

      setLocation: (newLocation) => {
        set((state) => ({
          location: { ...state.location, ...newLocation },
          isLocationEnabled: !!(newLocation.lat && newLocation.lng),
        }));
      },

      clearLocation: () => {
        set({
          location: {
            lat: null,
            lng: null,
            city: '',
            state: '',
            country: 'Nigeria',
            formattedAddress: '',
          },
          isLocationEnabled: false,
          detectionError: null,
        });
      },

      setDetectionError: (error) => {
        set({ detectionError: error });
      },

      setIsDetecting: (detecting) => {
        set({ isDetecting: detecting });
      },

      reverseGeocode: async (lat: number, lng: number) => {
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
      },
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        location: state.location,
        isLocationEnabled: state.isLocationEnabled,
      }),
    }
  )
);

// Helper functions
export const getLocationDisplay = (location: LocationState['location']) => {
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  return location.city || 'Select Location';
};

export const handleLocationSelect = (
  city: string, 
  state?: string, 
  setLocation: LocationState['setLocation']
) => {
  if (state) {
    setLocation({ city, state, country: 'Nigeria' });
  } else {
    // Try to find state for city or use city as both
    const foundState = nigerianStates.find(s => s.toLowerCase() === city.toLowerCase());
    setLocation({ 
      city, 
      state: foundState || city, 
      country: 'Nigeria' 
    });
  }
};

export { nigerianStates, majorCities };
