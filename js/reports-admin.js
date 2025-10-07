import { doLogout } from "./auth.js";
import { requireAdmin } from "./admin-guard.js";
import { db, doc, collection, getDocs, query, orderBy, updateDoc } from "./db.js";
import { $, esc, pill } from "./ui.js";

let orgCode = "", all=[];

requireAdmin(async (p)=>{
  orgCode = p.orgCode;
  $("#logout").onclick = doLogout;
  await fetchReports();
  $("#status").onchange = render;
});

async function fetchReports(){
  const q = query(collection(db,'orgs',orgCode,'reports'), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  all = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  render();
}

function render(){
  const f = $("#status").value;
  const data = all.filter(x=>!f || x.status===f);
  $("#rows").innerHTML = data.map(r=>{
    const dt = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '—';
    return `<tr class="tr">
      <td>${esc(r.title)}</td>
      <td>${esc(r.createdByName||r.createdBy)}</td>
      <td>${dt}</td>
      <td>${pill(r.status)}</td>
      <td class="actions">
        <button class="btn" data-status="reviewing" data-id="${r.id}">Reviewing</button>
        <button class="btn" data-status="closed" data-id="${r.id}">Close</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5">No reports</td></tr>`;

  document.querySelectorAll('[data-status]').forEach(b=>{
    b.onclick = async ()=>{
      await updateDoc(doc(db,'orgs',orgCode,'reports',b.dataset.id),{ status:b.dataset.status });
      const x = all.find(y=>y.id===b.dataset.id); if(x) x.status=b.dataset.status; render();
    };
  });
}
