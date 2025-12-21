// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASAsZWWbUbJ1aNbWMRJScOMoEOHo71dlA",
  authDomain: "dixi-vision.firebaseapp.com",
  projectId: "dixi-vision",
  storageBucket: "dixi-vision.firebasestorage.app",
  messagingSenderId: "264602885834",
  appId: "1:264602885834:web:99dc3d8e9f1d07fa76de33",
  measurementId: "G-Z27XJS33MH"
};

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  
  // Only initialize analytics in production (not in dev mode)
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  } else {
    console.log('📊 Firebase Analytics disabled in development mode');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  // Create a minimal app object to prevent crashes
  app = {} as FirebaseApp;
}

export { app, analytics };
export default app;

