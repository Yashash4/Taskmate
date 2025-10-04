// js/firebase-config.js  (for the provided app)
const firebaseConfig = {
  apiKey: "AIzaSyAd8oMQ77jFm3QsVEeNzI68E7H_D4YhHLI",
  authDomain: "taskmate-7b1db.firebaseapp.com",
  projectId: "taskmate-7b1db",
  storageBucket: "taskmate-7b1db.firebasestorage.app",
  messagingSenderId: "63597107829",
  appId: "1:63597107829:web:f0ed0fb53ed6736822b63c",
  measurementId: "G-M5JETCL185"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
