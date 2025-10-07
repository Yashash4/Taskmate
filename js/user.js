import { doLogout } from "./auth.js";
import { requireProfile } from "./auth-guard.js";
import { db, doc, collection, getDocs, query, where, orderBy, updateDoc } from "./db.js";
import { $, esc, pill } from "./ui.js";

let orgCode = "", meUid = "";

requireProfile(async (p)=>{
  meUid = p.uid; orgCode = p.orgCode;
  $("#logout").onclick = doLogout;
  await refresh();
});

async function refresh(){
  try{
    const qy = query(
      collection(db,'orgs',orgCode,'tasks'),
      where('assigneeUid','==',meUid),
      orderBy('createdAt','desc')
    );
    const snap = await getDocs(qy);
    const items = snap.docs.map(d=>({id:d.id,...d.data()}));
    render(items);
  }catch(e){
    console.error(e);
    $("#rows").innerHTML = `<tr><td colspan="4" style="color:#fca5a5">Failed to load tasks: ${esc(e.message||e)}</td></tr>`;
  }
}

function render(items){
  if (!items || items.length === 0) {
    $("#rows").innerHTML = `<tr><td colspan="4">No tasks yet</td></tr>`;
    return;
  }
  $("#rows").innerHTML = items.map(t=>{
    const due = t.dueAt?.toDate ? t.dueAt.toDate().toLocaleDateString() : '—';
    return `<tr class="tr">
      <td>${esc(t.title)}</td>
      <td>${due}</td>
      <td>${pill(t.status)}</td>
      <td class="actions">
        <button class="btn" data-id="${t.id}" data-s="submitted">Submit</button>
        <button class="btn" data-id="${t.id}" data-s="done">Done</button>
      </td>
    </tr>`;
  }).join('');

  document.querySelectorAll('[data-s]').forEach(b=>{
    b.onclick = async ()=>{
      try{
        await updateDoc(doc(db,'orgs',orgCode,'tasks',b.dataset.id),{ status: b.dataset.s });
        await refresh();
      }catch(e){ alert("Update failed: " + (e.message||e)); }
    };
  });
}
