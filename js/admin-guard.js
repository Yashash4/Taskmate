import { requireProfile } from "./auth-guard.js";

export function requireAdmin(cb){
  requireProfile((prof)=>{
    if(prof.role !== "admin") return location.href = "user.html";
    cb(prof);
  });
}
