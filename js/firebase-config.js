// Firebase compat SDK config (no imports here)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "taskmate-XXXX.firebaseapp.com",
  projectId: "taskmate-XXXX",
  storageBucket: "taskmate-XXXX.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
