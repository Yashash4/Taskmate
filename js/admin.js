document.addEventListener('DOMContentLoaded', () => {
  const list=document.getElementById('taskList');
  const cards=document.getElementById('adminCards');

  // form
  const idEl=document.getElementById('taskId');
  const titleEl=document.getElementById('title');
  const deadlineEl=document.getElementById('deadline');
  const priorityEl=document.getElementById('priority');
  const statusEl=document.getElementById('status');
  const assignedToEmailEl=document.getElementById('assignedToEmail');
  const descEl=document.getElementById('description');
  const formTitle=document.getElementById('formTitle');
  const form=document.getElementById('taskForm');
  const resetBtn=document.getElementById('resetBtn');

  // filters
  const searchEl=document.getElementById('search');
  const fPriEl=document.getElementById('filterPriority');
  const fStatEl=document.getElementById('filterStatus');

  // org UI
  const orgInfo=document.getElementById('orgInfo');
  const createOrgBtn=document.getElementById('createOrgBtn');
  const copyOrgBtn=document.getElementById('copyOrgBtn');

  let unsub=null;
  let myOrgCode=null;

  function genCode(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
    let s=''; for(let i=0;i<6;i++) s+=chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  async function setupOrgUI(){
    if(!myOrgCode){
      orgInfo.textContent='No organization yet. Create an invite code to add users to your org.';
      copyOrgBtn.disabled=true;
      createOrgBtn.onclick=async ()=>{
        const code=genCode();
        await db.collection('orgs').doc(code).set({code,createdBy:auth.currentUser.uid,createdAt:new Date(),active:true});
        await db.collection('users').doc(auth.currentUser.uid).update({orgCode:code});
        myOrgCode=code;
        setupOrgUI();
        subscribe();
      };
    }else{
      orgInfo.innerHTML=`Invite code: <b>${myOrgCode}</b> — share this code with your users.`;
      copyOrgBtn.disabled=false;
      copyOrgBtn.onclick=()=>{navigator.clipboard.writeText(myOrgCode); copyOrgBtn.textContent='Copied'; setTimeout(()=>copyOrgBtn.textContent='Copy Code',1200);};
      createOrgBtn.textContent='Create New Code';
    }
  }

  function subscribe(){
    if(!myOrgCode) return;
    if(unsub) unsub();
    unsub=db.collection('tasks').where('orgCode','==',myOrgCode)
      .onSnapshot(snap=>render(snap), err=>alert(err.message));
  }

  function safeDate(d){ if(!d) return null; if(d.toDate) return d.toDate(); return new Date(d); }

  auth.onAuthStateChanged(async (user)=>{
    if(!user) return;
    const me=await db.collection('users').doc(user.uid).get();
    myOrgCode=me.data()?.orgCode || null;
    await setupOrgUI();
    subscribe();
  });

  function render(snap){
    const arr=snap.docs.map(d=>({id:d.id,...d.data()}))
      .map(t=>({...t, createdAt:safeDate(t.createdAt), updatedAt:safeDate(t.updatedAt), deadline:safeDate(t.deadline)}))
      .sort((a,b)=>((b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0))||a.title.localeCompare(b.title));
    renderCards(cards,arr); paintList(arr);
  }

  function paintList(items){
    const q=searchEl.value.toLowerCase(), fp=fPriEl.value, fs=fStatEl.value;
    const tasks=items.filter(t=>{
      const mQ=t.title.toLowerCase().includes(q)||(t.description||'').toLowerCase().includes(q);
      const mP=fp==='all'||t.priority===fp;
      const mS=fs==='all'||t.status===fs;
      return mQ&&mP&&mS;
    });
    if(!tasks.length){ list.innerHTML="<li class='muted'>No tasks found.</li>"; return; }
    list.innerHTML=tasks.map(t=>{
      const isDone=t.status==='done', isSub=t.status==='submitted';
      const dueStr=t.deadline?('Due '+new Date(t.deadline).toLocaleDateString()):'No due date';
      return `<li class="task ${isDone?'done':''}" data-id="${t.id}">
        <button class="checkbox" data-action="toggle">${isDone?'✓':''}</button>
        <div class="stack">
          <div class="title">${t.title}</div>
          <div class="meta">
            ${dueStr} • <span class="badge ${t.priority?('priority-'+t.priority):''}">${t.priority||'—'}</span> •
            ${t.assignedTo||'Unassigned'}
            ${t.deadline && !isDone ? badgeFor(t.deadline,false):''}
            ${t.status==='open' ? '<span class="badge status-open">open</span>':''}
            ${t.status==='submitted' ? '<span class="badge status-submitted">submitted</span>':''}
            ${t.status==='done' ? '<span class="badge status-done">done</span>':''}
          </div>
          ${t.description?`<p class="muted">${t.description}</p>`:''}
        </div>
        <div class="row">
          ${isSub?'<button class="btn" data-action="approve">Approve</button><button class="btn btn-ghost" data-action="reject">Reject</button>':''}
          <button class="btn btn-ghost" data-action="edit">Edit</button>
          <button class="btn btn-danger" data-action="delete">Delete</button>
        </div>
      </li>`;
    }).join('');
  }

  [searchEl,fPriEl,fStatEl].forEach(el=>el.addEventListener('input',()=>auth.currentUser && db.collection('tasks').get().then(()=>{})));

  list.addEventListener('click', async (e)=>{
    const li=e.target.closest('li.task'); if(!li) return;
    const id=li.dataset.id, act=e.target.dataset.action, ref=db.collection('tasks').doc(id);
    const snap=await ref.get(); if(!snap.exists) return; const t=snap.data();
    if(act==='toggle'){ await ref.update({status:t.status==='done'?'open':'done',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}); return; }
    if(act==='delete'){ if(confirm('Delete this task?')) await ref.delete(); return; }
    if(act==='edit'){
      idEl.value=id; titleEl.value=t.title||''; deadlineEl.value=toDateInputValue(t.deadline);
      priorityEl.value=t.priority||'medium'; statusEl.value=t.status||'open';
      assignedToEmailEl.value=t.assignedTo||''; descEl.value=t.description||'';
      formTitle.textContent='Edit Task'; return;
    }
    if(act==='approve'){ await ref.update({status:'done',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}); return; }
    if(act==='reject'){  await ref.update({status:'open',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}); return; }
  });

  resetBtn.addEventListener('click', ()=>{ idEl.value=''; form.reset(); formTitle.textContent='Create Task'; });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!myOrgCode){ alert('Create an organization code first.'); return; }
    const payload={
      title:titleEl.value.trim(),
      description:(descEl.value||'').trim(),
      priority:priorityEl.value,
      status:statusEl.value,
      assignedTo:assignedToEmailEl.value.trim(),
      orgCode: myOrgCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const d=deadlineEl.value.trim(); if(d) payload.deadline=new Date(d).toISOString();
    const id=idEl.value;
    try{
      if(id){ await db.collection('tasks').doc(id).update(payload); }
      else { await db.collection('tasks').add(payload); }
      form.reset(); idEl.value=''; formTitle.textContent='Create Task';
    }catch(err){ alert(err.message); }
  });
});
