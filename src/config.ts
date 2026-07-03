export const config = {
  // Toggle between 'offline' and 'firebase'
  mode: (import.meta.env.VITE_FIREBASE_MODE || 'firebase') as 'offline' | 'firebase',

  // Paste your Firebase Config object here from the Firebase Console (Project Settings -> General -> Web App)
  firebaseConfig: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "PLACEHOLDER_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "family-compass-dd85b.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "family-compass-dd85b",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "family-compass-dd85b.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "450306299657",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "PLACEHOLDER_APP_ID"
  }
};
