import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Vite inlines VITE_* at build time. The literals below keep the existing
// hosted deployment working when no .env is present (same values the vanilla
// build shipped); set the env vars to point at a different Firebase project.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCGttdntn43ZHxoOj6R11HVyeFh5GwmsdQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'goated-auction-2b1d8.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://goated-auction-2b1d8-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'goated-auction-2b1d8',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'goated-auction-2b1d8.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '340389456470',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:340389456470:web:b6af3e6bd6ea9de45029f7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-FDRJZEGYW1'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const database = getDatabase(firebaseApp);
