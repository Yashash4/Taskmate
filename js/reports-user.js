document.addEventListener('DOMContentLoaded',()=>{
  const cards=document.getElementById('cards');
  const overdueList=document.getElementById('overdueList');

  function asDate(d){ if(!d) return null; if(d.toDate) return d.toDate(); return new Date(d); }

  auth.onAuthStateChanged(async (user)=>{
    if(!user) return;
    const me=await db.collection('users').doc(user.uid).get();
    const orgCode=me.data()?.orgCode;
    const snap=await db.collection('tasks').where('orgCode','==',orgCode).where('assignedTo','==',user.email).get();
    const tasks=snap.docs.map(d=>({id:d.id,...d.data()})).map(t=>({...t,deadline:asDate(t.deadline)}));

    renderCards(cards,tasks);

    const today=new Date(); today.setHours(0,0,0,0);
    const overdue=tasks.filter(t=>t.deadline && t.deadline<today && t.status!=='done');
    overdueList.innerHTML = overdue.length ? overdue.map(t=>`
      <li class="task">
        <div class="title">${t.title}</div>
        <div class="meta">Due ${t.deadline.toLocaleDateString()} • <span class="badge ${t.priority?('priority-'+t.priority):''}">${t.priority}</span></div>
      </li>`).join('') : "<li class='muted'>No overdue tasks 🎉</li>";
  });
});
