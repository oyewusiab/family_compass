import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { config } from './config';

let app: any = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (config.mode === 'firebase') {
  try {
    // Basic validation to verify if the config was updated from defaults
    const isPlaceholder = config.firebaseConfig.apiKey.includes("PLACEHOLDER") || config.firebaseConfig.projectId.includes("your-project-id");
    if (!isPlaceholder) {
      app = initializeApp(config.firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      googleProvider = new GoogleAuthProvider();
    } else {
      console.warn("Firebase config contains placeholders. Running in fallback mode. Change config.mode to 'offline' or paste real keys.");
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { app, auth, db, googleProvider };
