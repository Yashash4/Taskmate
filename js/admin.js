// js/admin.js
import { auth } from "./firebase-config.js";
import { doLogout } from "./auth.js";
import { requireAdmin } from "./admin-guard.js";
import {
  db, doc, setDoc, getDoc, getDocs, collection, serverTimestamp
} from "./db.js";
import { $ } from "./ui.js";
import { sha256Hex } from "./crypto.js";

const showErr = (msg)=>{
  const el = $("#admin-error");
  if (!el) return alert(msg);
  el.style.display = "inline-block";
  el.textContent = msg;
};

let profile;

// Bind listeners after DOM is ready so clicks always hook
document.addEventListener("DOMContentLoaded", () => {
  console.log("[admin] DOM ready");

  // Defensive: still bind button handlers (they don’t require profile immediately)
  $("#generate")?.addEventListener("click", onGenerate);
  $("#copy")?.addEventListener("click", onCopy);
  $("#set-admin-invite")?.addEventListener("click", onSaveAdminCode);

  // Now gate the page to admins and finish boot
  requireAdmin(async (p)=>{
    console.log("[admin] requireAdmin OK", p);
    try {
      profile = p;
      $("#logout").onclick = doLogout;

      // If admin already has an org, display it and ensure membership doc exists
      if (profile.orgCode) {
        const orgRef = doc(db,'orgs',profile.orgCode);
        const org = await getDoc(orgRef);
        if (org.exists()) $("#code").value = org.data().code || profile.orgCode;
        await ensureMembership(profile.orgCode);
      }
      await loadStats();
    } catch (e) {
      console.error("[admin] init error", e);
      showErr(e.message || String(e));
    }
  });
});

async function onGenerate(){
  try{
    console.log("[admin] Generate clicked");
    if (!auth.currentUser) return showErr("You must be logged in.");

    const code = randomCode();
    const uid  = auth.currentUser.uid;

    // Create org
    await setDoc(doc(db,'orgs',code),{
      code, active:true, createdAt: serverTimestamp(), createdBy: uid
    });

    // Save orgCode on the admin’s user doc
    await setDoc(doc(db,'users',uid), { orgCode: code }, { merge:true });

    // Mirror into org users
    const me = await getDoc(doc(db,'users',uid));
    const data = me.exists() ? me.data() : { displayName:"", email:"" };
    await setDoc(doc(db,'orgs',code,'users',uid),{
      displayName: data.displayName || data.email || "Admin",
      email: data.email || "",
      role: "admin",
      joinedAt: serverTimestamp(),
      counters: { open:0, submitted:0, done:0 }
    }, { merge:true });

    // Reflect in UI and stats
    $("#code").value = code;
    profile = { ...profile, orgCode: code };
    await loadStats();

    alert("New organization code: " + code);
  }catch(e){
    console.error("[admin] generate failed", e);
    showErr(e.message || String(e));
  }
}

function onCopy(){
  const el = $("#code");
  if (!el?.value) return showErr("No code yet. Generate one first.");
  el.select(); document.execCommand("copy");
  alert("Copied: " + el.value);
}

async function onSaveAdminCode(){
  try{
    const orgCode = ($("#code").value || (profile && profile.orgCode) || "").trim();
    if (!orgCode) return showErr("Org code not set yet. Generate an org code first.");

    const raw = ($("#admin-invite").value || "").trim();
    if (!raw) return showErr("Enter a non-empty Admin Invite Code.");

    const hash = await sha256Hex(raw);
    await setDoc(doc(db,'orgs',orgCode), { adminSecretHash: hash }, { merge:true });
    $("#admin-invite").value = "";
    alert("Admin Invite Code updated.");
  }catch(e){
    console.error("[admin] save admin code failed", e);
    showErr(e.message || String(e));
  }
}

async function ensureMembership(orgCode){
  try{
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const memberRef = doc(db,'orgs',orgCode,'users',uid);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      const me = await getDoc(doc(db,'users',uid));
      const data = me.exists() ? me.data() : { displayName:'', email:'' };
      await setDoc(memberRef, {
        displayName: data.displayName || data.email || "Admin",
        email: data.email || "",
        role: data.role || 'admin',
        joinedAt: serverTimestamp(),
        counters: { open:0, submitted:0, done:0 }
      }, { merge:true });
      console.log("[admin] membership created under org/users");
    } else {
      console.log("[admin] membership exists");
    }
  }catch(e){
    console.error("[admin] ensureMembership failed", e);
    showErr(e.message || String(e));
  }
}

async function loadStats(){
  try{
    const code = $("#code").value || (profile && profile.orgCode);
    if (!code) { console.log("[admin] no org code yet"); return; }

    const users = await getDocs(collection(db,'orgs',code,'users'));
    $("#stat-users").textContent = `Users: ${users.size}`;

    const tasks = await getDocs(collection(db,'orgs',code,'tasks'));
    let open=0, done=0; tasks.forEach(d=>{
      const s=d.data().status; if(s==='done') done++; else if(s==='open') open++;
    });
    $("#stat-open").textContent = `Open tasks: ${open}`;
    $("#stat-done").textContent = `Done tasks: ${done}`;

    const reports = await getDocs(collection(db,'orgs',code,'reports'));
    $("#stat-reports").textContent = `Reports: ${reports.size}`;
    console.log("[admin] stats loaded");
  }catch(e){
    console.error("[admin] loadStats failed", e);
    showErr(e.message || String(e));
  }
}

function randomCode(){
  return Math.random().toString(36).replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,6);
}
