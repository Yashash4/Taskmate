import { auth } from "./firebase-config.js";
import { doLogout } from "./auth.js";
import { requireAdmin } from "./admin-guard.js";
import { db, doc, setDoc, getDoc, getDocs, collection, serverTimestamp } from "./db.js";
import { $, esc } from "./ui.js";

let profile;

requireAdmin(async (p)=>{
  profile = p;
  $("#logout").onclick = doLogout;
  // show current code if exists
  const org = await getDoc(doc(db,'orgs',profile.orgCode));
  if(org.exists()) $("#code").value = org.data().code || profile.orgCode;
  await loadStats();
});

$("#generate")?.addEventListener("click", async ()=>{
  const code = randomCode();
  await setDoc(doc(db,'orgs',code),{
    code, active:true, createdAt: serverTimestamp(), createdBy: auth.currentUser.uid
  });
  // persist to your profile so other admin pages know which org to read
  await setDoc(doc(db,'users',auth.currentUser.uid), { orgCode: code }, { merge:true });
  $("#code").value = code;
  alert("New organization code: "+code);
});

$("#copy")?.addEventListener("click", ()=>{
  $("#code").select(); document.execCommand('copy');
});

async function loadStats(){
  const code = $("#code").value || profile.orgCode;
  const users = await getDocs(collection(db,'orgs',code,'users'));
  $("#stat-users").textContent = `Users: ${users.size}`;

  const tasks = await getDocs(collection(db,'orgs',code,'tasks'));
  let open=0,done=0; tasks.forEach(d=>{ const s=d.data().status; if(s==='done') done++; else if(s==='open') open++; });
  $("#stat-open").textContent = `Open tasks: ${open}`;
  $("#stat-done").textContent = `Done tasks: ${done}`;

  const reports = await getDocs(collection(db,'orgs',code,'reports'));
  $("#stat-reports").textContent = `Reports: ${reports.size}`;
}

function randomCode(){ return Math.random().toString(36).replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,6); }
