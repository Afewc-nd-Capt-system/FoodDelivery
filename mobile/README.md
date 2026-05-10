# VibeChops Mobile Apps

React Native mobile applications for VibeChops food delivery platform, built with Expo. This monorepo contains two separate apps:

- **Customer App**: For food ordering, tracking, and account management
- **Driver App**: For delivery riders to manage orders and track earnings

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Setup

### 1. Install Dependencies

Navigate to each app directory and install dependencies:

```bash
# Customer App
cd customer-app
npm install

# Driver App
cd ../driver-app
npm install
```

### 2. Environment Variables

Create a `.env` file in each app directory:

**Customer App (.env):**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v2
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:5000
```

**Driver App (.env):**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v2
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:5000
```

**Note:** `10.0.2.2` is the localhost address for Android emulators. For physical devices or iOS simulators, use your computer's local IP address (e.g., `http://192.168.1.X:5000`).

### 3. Running the Apps

#### Customer App

```bash
cd customer-app
npx expo start
```

Then:
- Press `a` to run on Android emulator
- Press `i` to run on iOS simulator (macOS only)
- Scan QR code with Expo Go app on physical device

#### Driver App

```bash
cd driver-app
npx expo start
```

Same options as above.

## Running on Different Platforms

### Android Emulator

1. Open Android Studio
2. Create an AVD (Android Virtual Device)
3. Start the emulator
4. Run `npx expo start` and press `a`

### iOS Simulator (macOS only)

1. Open Xcode
2. Run `npx expo start` and press `i`

### Physical Device

1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Run `npx expo start`
3. Scan the QR code with Expo Go

## Backend Configuration

Ensure the VibeChops backend is running at the URL specified in your environment variables. The backend should have:

- REST API endpoints at `/api/v2`
- Socket.io server for real-time updates
- CORS enabled for mobile app origins

## App Features

### Customer App

- **Authentication**: Login, registration, password reset, MFA
- **Home**: Browse restaurants, mood categories, featured listings
- **Search**: Filter restaurants by cuisine, rating, price, delivery time
- **Restaurant Details**: View menu, customize orders, add to cart
- **Cart & Checkout**: Manage cart, select delivery address, Paystack payments
- **Order Tracking**: Real-time tracking with map, status updates, rider info
- **Orders**: View active, completed, and cancelled orders
- **Wallet**: View balance, top up, transaction history
- **Profile**: Manage account, loyalty points, referrals, saved restaurants
- **VibePass**: Subscription tiers with exclusive benefits
- **Additional**: Reservations, catering requests, disputes, scheduled orders

### Driver App

- **Authentication**: Rider login with role verification
- **Online/Offline Toggle**: Control availability for orders
- **Order Requests**: Accept or decline new delivery orders
- **Active Delivery**: View route, confirm pickup, confirm delivery
- **Location Tracking**: Real-time location sharing with customers
- **Earnings**: View daily, weekly, monthly earnings with charts
- **History**: View past deliveries with ratings
- **Profile**: Manage account, vehicle info, documents, verification

## Shared Components

The `shared/` directory contains common code used by both apps:

- `theme.ts`: Design system (colors, spacing, shadows)
- `api.ts`: Axios instance with JWT authentication
- `socket.ts`: Socket.io connection hooks

## Push Notifications

Push notifications are configured via `expo-notifications`. To enable:

1. Set up push notification credentials in Expo
2. Update `app.json` with your project credentials
3. Backend stores and sends push tokens for order updates

## Technologies Used

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Styling**: NativeWind (Tailwind CSS)
- **UI Components**: Lucide React Native icons
- **Maps**: React Native Maps
- **Payments**: React Native Paystack Webview
- **Charts**: React Native Chart Kit
- **Storage**: Expo Secure Store, AsyncStorage

## Project Structure

```
mobile/
├── shared/              # Shared code between apps
│   ├── theme.ts        # Design system
│   ├── api.ts          # API client
│   └── socket.ts       # Socket.io hooks
├── customer-app/       # Customer application
│   ├── app/            # Expo Router pages
│   │   ├── (auth)/    # Authentication screens
│   │   ├── (main)/    # Main tab navigation
│   │   ├── restaurant/
│   │   ├── vendor/
│   │   └── ...
│   ├── assets/
│   ├── package.json
│   ├── app.json
│   ├── tailwind.config.js
│   └── tsconfig.json
└── driver-app/         # Driver application
    ├── app/            # Expo Router pages
    │   ├── (auth)/    # Authentication screens
    │   └── (main)/    # Main tab navigation
    ├── assets/
    ├── package.json
    ├── app.json
    ├── tailwind.config.js
    └── tsconfig.json
```

## Troubleshooting

### Metro bundler issues

```bash
npx expo start -c
```

### Clear cache

```bash
npx expo start --clear
```

### Reset native dependencies

```bash
npx expo prebuild --clean
```

### TypeScript errors

Ensure `tsconfig.json` is properly configured and all dependencies are installed.

### Socket.io connection issues

- Verify backend Socket.io server is running
- Check firewall settings
- Ensure correct URL in environment variables

## Development Tips

1. Use Expo DevTools for debugging
2. Test on physical devices for location and camera features
3. Use React Native Debugger for advanced debugging
4. Keep shared components in the `shared/` directory
5. Test different screen sizes and orientations

## Production Build

### Android

```bash
cd customer-app
eas build --platform android
```

### iOS

```bash
cd customer-app
eas build --platform ios
```

## License

Copyright © 2024 VibeChops. All rights reserved.
