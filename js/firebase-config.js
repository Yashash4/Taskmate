// Load Firebase app + export a singleton context
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAd8oMQ77jFm3QsVEeNzI68E7H_D4YhHLI",
  authDomain: "taskmate-7b1db.firebaseapp.com",
  projectId: "taskmate-7b1db",
  storageBucket: "taskmate-7b1db.firebasestorage.app",
  messagingSenderId: "63597107829",
  appId: "1:63597107829:web:f0ed0fb53ed6736822b63c"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
