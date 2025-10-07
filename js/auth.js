import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { db, doc, getDoc, setDoc, serverTimestamp } from "./db.js";

export const watchAuth = (cb)=>onAuthStateChanged(auth, cb);
export const doLogout = ()=>signOut(auth);

export async function login(email, pass){
  const { user } = await signInWithEmailAndPassword(auth, email, pass);
  return user;
}

/**
 * Generic signup:
 * - If requestedRole === "user": requires `code` of an existing active org, then creates user in that org.
 * - If requestedRole === "admin": no org code required now; create account as admin with orgCode "".
 *   Admin will go to Admin dashboard and click "Generate" to create their org later.
 */
export async function signup({ name, email, pass, requestedRole="user", code="" }){
  let finalRole = (requestedRole === "admin") ? "admin" : "user";
  let orgCode   = "";

  if (finalRole === "user") {
    // Validate org code
    const upper = (code || "").toUpperCase();
    const orgSnap = await getDoc(doc(db,'orgs',upper));
    if(!orgSnap.exists() || orgSnap.data().active !== true) {
      throw new Error("Invalid or inactive organization code");
    }
    orgCode = upper;
  }

  // Create account
  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  const displayName = name || email.split('@')[0];
  await updateProfile(user,{ displayName });

  // Write top-level user profile
  await setDoc(doc(db,'users',user.uid),{
    displayName, email, role: finalRole, orgCode, joinedAt: serverTimestamp()
  });

  // If they already joined an org (user path), mirror into orgs/{code}/users
  if (finalRole === "user") {
    await setDoc(doc(db,'orgs',orgCode,'users',user.uid),{
      displayName, email, role: finalRole, joinedAt: serverTimestamp(),
      counters: { open:0, submitted:0, done:0 }
    }, { merge:true });
  }

  return user;
}
