import { auth } from "./firebase-config.js";
import { doLogout } from "./auth.js";
import { requireAdmin } from "./admin-guard.js";
import { db, doc, setDoc, getDoc, getDocs, collection, serverTimestamp } from "./db.js";
import { $ } from "./ui.js";
import { sha256Hex } from "./crypto.js";

let profile;

requireAdmin(async (p)=>{
  profile = p;
  $("#logout").onclick = doLogout;

  if (profile.orgCode) {
    const org = await getDoc(doc(db,'orgs',profile.orgCode));
    if(org.exists()) $("#code").value = org.data().code || profile.orgCode;
  }

  await loadStats();
});

$("#generate")?.addEventListener("click", async ()=>{
  const code = randomCode();
  await setDoc(doc(db,'orgs',code),{
    code, active:true, createdAt: serverTimestamp(), createdBy: auth.currentUser.uid
  });
  await setDoc(doc(db,'users',auth.currentUser.uid), { orgCode: code }, { merge:true });
  $("#code").value = code;
  alert("New organization code: "+code);
});

$("#copy")?.addEventListener("click", ()=>{
  const el = $("#code");
  if (!el.value) return alert("No code yet. Generate one first.");
  el.select(); document.execCommand('copy');
  alert("Copied: " + el.value);
});

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

async function loadStats(){
  const code = $("#code").value || profile.orgCode;
  if (!code) return;
  const users = await getDocs(collection(db,'orgs',code,'users'));
  $("#stat-users").textContent = `Users: ${users.size}`;

  const tasks = await getDocs(collection(db,'orgs',code,'tasks'));
  let open=0, done=0; tasks.forEach(d=>{ const s=d.data().status; if(s==='done') done++; else if(s==='open') open++; });
  $("#stat-open").textContent = `Open tasks: ${open}`;
  $("#stat-done").textContent = `Done tasks: ${done}`;

  const reports = await getDocs(collection(db,'orgs',code,'reports'));
  $("#stat-reports").textContent = `Reports: ${reports.size}`;
}

function randomCode(){ return Math.random().toString(36).replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,6); }
