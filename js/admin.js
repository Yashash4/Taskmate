// js/admin.js
import { auth } from "./firebase-config.js";
import { doLogout } from "./auth.js";
import { requireAdmin } from "./admin-guard.js";
import {
  db, doc, setDoc, getDoc, getDocs, collection, serverTimestamp
} from "./db.js";
import { $ } from "./ui.js";
import { sha256Hex } from "./crypto.js";

let profile;

requireAdmin(async (p)=>{
  profile = p;
  $("#logout").onclick = doLogout;

  // If admin already has an org, show it and ensure a membership doc exists
  if (profile.orgCode) {
    const orgRef = doc(db,'orgs',profile.orgCode);
    const org = await getDoc(orgRef);
    if (org.exists()) $("#code").value = org.data().code || profile.orgCode;
    await ensureMembership(profile.orgCode);   // <-- make sure admin appears under org/users
  }

  await loadStats();
});

// Generate a fresh org code and mirror admin into it
$("#generate")?.addEventListener("click", async ()=>{
  const code = randomCode();
  const uid  = auth.currentUser.uid;

  // Create org doc
  await setDoc(doc(db,'orgs',code),{
    code, active:true, createdAt: serverTimestamp(), createdBy: uid
  });

  // Remember on top-level user doc
  await setDoc(doc(db,'users',uid), { orgCode: code }, { merge:true });

  // Mirror admin into org users so they show up in the Users page
  const me = await getDoc(doc(db,'users',uid));
  const data = me.exists() ? me.data() : { displayName: '', email: '' };
  await setDoc(doc(db,'orgs',code,'users',uid),{
    displayName: data.displayName || data.email,
    email: data.email || '',
    role: 'admin',
    joinedAt: serverTimestamp(),
    counters: { open:0, submitted:0, done:0 }
  }, { merge:true });

  $("#code").value = code;
  alert("New organization code: "+code);
  await loadStats();
});

// Copy org code
$("#copy")?.addEventListener("click", ()=>{
  const el = $("#code");
  if (!el.value) return alert("No code yet. Generate one first.");
  el.select(); document.execCommand('copy');
  alert("Copied: " + el.value);
});

// Set/rotate Admin Invite Code (optional feature)
$("#set-admin-invite")?.addEventListener("click", async ()=>{
  const orgCode = ($("#code").value || (profile && profile.orgCode) || "").trim();
  if (!orgCode) return alert("Org code not set yet. Generate an org code first.");
  const raw = ($("#admin-invite").value || "").trim();
  if (!raw) return alert("Enter a non-empty Admin Invite Code.");
  const hash = await sha256Hex(raw);
  await setDoc(doc(db,'orgs',orgCode), { adminSecretHash: hash }, { merge:true });
  $("#admin-invite").value = "";
  alert("Admin Invite Code updated.");
});

async function ensureMembership(orgCode){
  const uid = auth.currentUser.uid;
  const memberRef = doc(db,'orgs',orgCode,'users',uid);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    const me = await getDoc(doc(db,'users',uid));
    const data = me.exists() ? me.data() : { displayName:'', email:'' };
    await setDoc(memberRef, {
      displayName: data.displayName || data.email,
      email: data.email || '',
      role: data.role || 'admin',
      joinedAt: serverTimestamp(),
      counters: { open:0, submitted:0, done:0 }
    }, { merge:true });
  }
}

async function loadStats(){
  const code = $("#code").value || profile.orgCode;
  if (!code) return;
  const users = await getDocs(collection(db,'orgs',code,'users'));
  $("#stat-users")?.textContent = `Users: ${users.size}`;

  const tasks = await getDocs(collection(db,'orgs',code,'tasks'));
  let open=0, done=0; tasks.forEach(d=>{ const s=d.data().status; if(s==='done') done++; else if(s==='open') open++; });
  $("#stat-open")?.textContent = `Open tasks: ${open}`;
  $("#stat-done")?.textContent = `Done tasks: ${done}`;

  const reports = await getDocs(collection(db,'orgs',code,'reports'));
  $("#stat-reports")?.textContent = `Reports: ${reports.size}`;
}

function randomCode(){
  return Math.random().toString(36).replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,6);
}
