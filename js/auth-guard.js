import { watchAuth } from "./auth.js";
import { db, doc, getDoc } from "./db.js";

export function requireUser(redirect="index.html"){
  watchAuth(async (u)=>{
    if(!u) return location.href = redirect;
  });
}

export function requireProfile(cb, redirect="index.html"){
  watchAuth(async (u)=>{
    if(!u) return location.href = redirect;
    const snap = await getDoc(doc(db,'users',u.uid));
    if(!snap.exists()) return location.href = redirect;
    cb({ uid:u.uid, ...snap.data() });
  });
}
