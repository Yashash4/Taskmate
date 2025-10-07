import { doLogout } from "./auth.js";
import { requireProfile } from "./auth-guard.js";
import { db, addDoc, collection, getDocs, query, where, orderBy, serverTimestamp } from "./db.js";
import { $, esc, pill } from "./ui.js";

let orgCode = "", meUid = "", meName = "";

requireProfile(async (p)=>{
  orgCode = p.orgCode; meUid = p.uid; meName = p.displayName;
  $("#logout").onclick = doLogout;
  $("#submit").onclick = submitReport;
  await refresh();
});

async function submitReport(){
  const t = $("#title").value.trim(); if(!t) return alert("Enter a title");
  const d = $("#details").value.trim();
  await addDoc(collection(db,'orgs',orgCode,'reports'),{
    title:t, details:d, status:'new',
    createdAt: serverTimestamp(), createdBy: meUid, createdByName: meName
  });
  $("#title").value = ""; $("#details").value = "";
  await refresh();
}

async function refresh(){
  try{
    const qy = query(collection(db,'orgs',orgCode,'reports'), where('createdBy','==',meUid), orderBy('createdAt','desc'));
    const snap = await getDocs(qy);
    $("#rows").innerHTML = snap.docs.map(d=>{
      const r=d.data(); const dt=r.createdAt?.toDate?r.createdAt.toDate().toLocaleString():'—';
      return `<tr class="tr"><td>${esc(r.title)}</td><td>${dt}</td><td>${pill(r.status)}</td></tr>`;
    }).join('') || `<tr><td colspan="3">No reports yet</td></tr>`;
  }catch(e){
    $("#rows").innerHTML = `<tr><td colspan="3" style="color:#fca5a5">Failed to load: ${esc(e.message||e)}</td></tr>`;
  }
}
