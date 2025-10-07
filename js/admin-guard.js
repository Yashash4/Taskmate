import { requireProfile } from "./auth-guard.js";

export function requireAdmin(cb){
  requireProfile((p)=>{ if(p.role!=='admin') return location.href='user.html'; cb(p); });
}
