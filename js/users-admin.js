// js/users-admin.js
import { doLogout } from "./auth.js";
import { requireAdmin } from "./admin-guard.js";
import {
  db, doc, updateDoc, collection, getDocs, query, orderBy, addDoc,
  serverTimestamp
} from "./db.js";
import { $, $$, esc, maskEmail, csvCell, download, pill } from "./ui.js";

let orgCode = "", allUsers = [];

requireAdmin(async (p)=>{
  orgCode = p.orgCode || "";
  $("#logout").onclick = doLogout;

  if (!orgCode) {
    // Admin has not generated/selected an org yet
    $("#rows").innerHTML = `<tr><td colspan="8" style="color:#fca5a5">
      No organization selected. Go to <a href="admin.html">Admin</a> and click <b>Generate</b> to create a code.
    </td></tr>`;
    return;
  }

  await fetchUsers();
  wireUI();
});

async function fetchUsers(){
  try{
    const qy = query(collection(db,'orgs',orgCode,'users'), orderBy('joinedAt','desc'));
    const snap = await getDocs(qy);
    allUsers = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    if (allUsers.length === 0) {
      $("#rows").innerHTML = `<tr><td colspan="8">No users yet. Share your org code and ask teammates to sign up.</td></tr>`;
      return;
    }
    render();
  }catch(e){
    console.error(e);
    $("#rows").innerHTML = `<tr><td colspan="8" style="color:#fca5a5">
      Failed to load users: ${esc(e.message||e)}
    </td></tr>`;
  }
}

function wireUI(){
  $("#search").oninput = render;
  $("#roleFilter").onchange = render;
  $("#export").onclick = exportCSV;
  $("#recount").onclick = recomputeCounters;
}

function render(){
  const term = ($("#search").value || "").toLowerCase();
  const rf = $("#roleFilter").value;
  const data = allUsers.filter(u=>{
    const okRole = !rf || u.role===rf;
    const okTerm = !term || (u.displayName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
    return okRole && okTerm;
  });
  $("#rows").innerHTML = data.map(row).join('') || `<tr><td colspan="8">No users match your filter.</td></tr>`;
  attachHandlers(data);
}

function row(u){
  const j = u.joinedAt?.toDate ? u.joinedAt.toDate().toLocaleDateString() : '—';
  const c = u.counters || { open:0, submitted:0, done:0 };
  return `
    <tr class="tr">
      <td>${esc(u.displayName||'—')}</td>
      <td><span class="badge">${esc(maskEmail(u.email||''))}</span></td>
      <td><span class="pill">${u.role}</span></td>
      <td>${j}</td>
      <td>${c.open}</td>
      <td>${c.submitted}</td>
      <td>${c.done}</td>
      <td class="actions">
        <div class="dropdown">
          <button class="btn secondary dd" data-id="${u.id}">Assign task</button>
          <div class="dropdown-menu">
            <div style="padding:6px 8px">
              <input class="input" data-field="title" placeholder="Task title">
              <input class="input" data-field="desc" placeholder="Description (optional)">
              <input class="input" data-field="due" type="date" placeholder="Due date">
              <button class="btn" data-action="create">Create</button>
            </div>
          </div>
        </div>
        <button class="btn" data-promote="${u.id}">${u.role==='admin'?'Make user':'Make admin'}</button>
        <button class="btn danger" data-remove="${u.id}">Deactivate</button>
      </td>
    </tr>
  `;
}

function attachHandlers(data){
  $$(".dd").forEach(btn=>{
    btn.onclick = (e)=> e.currentTarget.parentElement.classList.toggle('open');
  });

  $$('[data-action="create"]').forEach(btn=>{
    btn.onclick = async (e)=>{
      const wrap = e.currentTarget.closest('.dropdown-menu');
      const id = e.currentTarget.closest('.dropdown').querySelector('.dd').dataset.id;
      const u = data.find(x=>x.id===id); if(!u) return;
      const title = (wrap.querySelector('[data-field="title"]').value || "").trim();
      const desc  = (wrap.querySelector('[data-field="desc"]').value || "").trim();
      const due   = wrap.querySelector('[data-field="due"]').value;
      if(!title) return alert('Enter title');
      await addDoc(collection(db,'orgs',orgCode,'tasks'),{
        title, description: desc, status:'open',
        assigneeUid: u.id, assigneeName: u.displayName || u.email,
        createdAt: serverTimestamp(), dueAt: due?new Date(due):null,
        createdBy: 'admin', createdByUid: u.id
      });
      alert(`Task assigned to ${u.displayName || u.email}`);
    };
  });

  $$('[data-promote]').forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute('data-promote');
      const u = allUsers.find(x=>x.id===id); if(!u) return;
      const newRole = u.role==='admin'?'user':'admin';
      await updateDoc(doc(db,'orgs',orgCode,'users',id),{ role:newRole });
      await updateDoc(doc(db,'users',id),{ role:newRole });
      u.role = newRole; render();
    };
  });

  $$('[data-remove]').forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute('data-remove');
      if(!confirm('Deactivate this user?')) return;
      await updateDoc(doc(db,'orgs',orgCode,'users',id),{ role:'inactive' });
      await updateDoc(doc(db,'users',id),{ role:'inactive' });
      allUsers = allUsers.filter(x=>x.id!==id); render();
    };
  });
}

function exportCSV(){
  const header = ['Name','Email','Role','Joined','Open','Submitted','Done'];
  const lines = allUsers.map(u=>{
    const j = u.joinedAt?.toDate ? u.joinedAt.toDate().toISOString().slice(0,10) : '';
    const c = u.counters||{open:0,submitted:0,done:0};
    return [u.displayName,u.email,u.role,j,c.open,c.submitted,c.done].map(csvCell).join(',');
  });
  download('users.csv',[header.join(','),...lines].join('\n'));
}

async function recomputeCounters(){
  try{
    const ts = await getDocs(collection(db,'orgs',orgCode,'tasks'));
    const agg = {};
    ts.forEach(d=>{
      const t = d.data(); const uid = t.assigneeUid || "_none";
      if(!agg[uid]) agg[uid] = { open:0, submitted:0, done:0 };
      if(t.status==='open') agg[uid].open++;
      else if(t.status==='submitted') agg[uid].submitted++;
      else if(t.status==='done') agg[uid].done++;
    });
    const writes = allUsers.map(u=>{
      const c = agg[u.id] || { open:0, submitted:0, done:0 };
      return updateDoc(doc(db,'orgs',orgCode,'users',u.id),{ counters: c });
    });
    await Promise.all(writes);
    allUsers = allUsers.map(u=>({ ...u, counters: agg[u.id] || { open:0, submitted:0, done:0 } }));
    render();
    alert('Counters recomputed successfully.');
  }catch(e){ console.error(e); alert('Recompute failed: '+e.message); }
}
