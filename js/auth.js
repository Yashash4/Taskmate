import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { db, doc, getDoc, setDoc, serverTimestamp } from "./db.js";

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const doLogout = () => signOut(auth);

// Friendlier messages for common Firebase Auth errors
export function authMessage(e) {
  const code = (e?.code || "").toLowerCase();
  const map = {
    "auth/email-already-in-use": "This email is already registered. Log in instead or reset your password.",
    "auth/invalid-email": "That doesn’t look like a valid email.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "We couldn’t find an account with that email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/network-request-failed": "Network error. Check your connection and try again."
  };
  return map[code] || (e?.message || "Authentication error");
}

export async function login(email, pass) {
  const { user } = await signInWithEmailAndPassword(auth, email, pass);
  return user;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
  return true;
}

/**
 * Generic signup:
 * - Users must provide a valid org code (active).
 * - Admins may sign up without a code and create one later on the Admin page.
 *   If an admin supplies a code, we validate it and mirror them into that org.
 */
export async function signup({ name, email, pass, code = "", requestedRole = "user" }) {
  if (requestedRole === "user") {
    if (!code) throw new Error("Organization Code is required for Users.");
    const orgRef = doc(db, "orgs", code);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists() || orgSnap.data().active !== true) {
      throw new Error("Invalid or inactive organization code");
    }
  } else if (code) {
    const orgRef = doc(db, "orgs", code);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists() || orgSnap.data().active !== true) {
      throw new Error("Organization Code is invalid. Leave it blank if you’ll create one after login.");
    }
  }

  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  const displayName = (name || email.split("@")[0]).trim();
  await updateProfile(user, { displayName });

  const finalOrgCode = requestedRole === "admin" ? code || "" : code;

  await setDoc(doc(db, "users", user.uid), {
    displayName,
    email,
    role: requestedRole,      // "admin" or "user"
    orgCode: finalOrgCode,    // may be "" for admins initially
    joinedAt: serverTimestamp()
  });

  if (finalOrgCode) {
    await setDoc(
      doc(db, "orgs", finalOrgCode, "users", user.uid),
      {
        displayName,
        email,
        role: requestedRole,
        joinedAt: serverTimestamp(),
        counters: { open: 0, submitted: 0, done: 0 }
      },
      { merge: true }
    );
  }

  return user;
}
