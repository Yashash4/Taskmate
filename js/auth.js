import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { db, doc, getDoc, setDoc, serverTimestamp } from "./db.js";

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const doLogout = () => signOut(auth);

export async function login(email, pass){
  const { user } = await signInWithEmailAndPassword(auth, email, pass);
  return user;
}

export async function signup({ name, email, pass, code }){
  // verify org code exists and active
  const orgSnap = await getDoc(doc(db,'orgs',code));
  if(!orgSnap.exists() || orgSnap.data().active !== true) {
    throw new Error("Invalid or inactive organization code");
  }

  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  const displayName = name || email.split('@')[0];
  await updateProfile(user, { displayName });

  // top-level user profile
  await setDoc(doc(db,'users',user.uid),{
    displayName, email, role:'user', orgCode: code, joinedAt: serverTimestamp()
  });

  // org membership mirror
  await setDoc(doc(db,'orgs',code,'users',user.uid),{
    displayName, email, role:'user', joinedAt: serverTimestamp(),
    counters: { open:0, submitted:0, done:0 }
  }, { merge:true });

  return user;
}
