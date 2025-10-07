import { doLogout } from "./auth.js";
import { requireProfile } from "./auth-guard.js";
import { db, doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc } from "./db.js";
import { $, esc, pill } from "./ui.js";

let orgCode = "", meUid = "";

requireProfile(async (p)=>{
  meUid = p.uid; orgCode = p.orgCode;
  $("#logout").onclick = doLogout;
  await refresh();
});

async function refresh(){
  const q = query(collection(db,'orgs',orgCode,'tasks'), where('assigneeUid','==',meUid), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  const items = snap.docs.map(d=>({id:d.id,...d.data()}));
  render(items);
}

function render(items){
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
  }).join('') || `<tr><td colspan="4">No tasks yet</td></tr>`;

  document.querySelectorAll('[data-s]').forEach(b=>{
    b.onclick = async ()=>{
      await updateDoc(doc(db,'orgs',orgCode,'tasks',b.dataset.id),{ status: b.dataset.s });
      await refresh();
    };
  });
}
