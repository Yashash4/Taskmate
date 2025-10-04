document.addEventListener('DOMContentLoaded', () => {
  const cards = document.getElementById('cards');
  const overdueList = document.getElementById('overdueList');
  const exportBtn = document.getElementById('exportCsv');

  function asDate(d){ if(!d) return null; if(d.toDate) return d.toDate(); return new Date(d); }

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const snap = await db.collection('tasks').get();
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .map(t => ({ ...t, deadline: asDate(t.deadline), createdAt: asDate(t.createdAt), updatedAt: asDate(t.updatedAt) }));

    renderCards(cards, tasks);

    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = tasks.filter(t => t.deadline && t.deadline < today && t.status !== 'done');
    overdueList.innerHTML = overdue.length ? overdue.map(t => `
      <li class="task">
        <div class="title">${t.title}</div>
        <div class="meta">Due ${t.deadline.toLocaleDateString()} • <span class="badge ${t.priority?('priority-'+t.priority):''}">${t.priority}</span> • ${t.assignedTo||'Unassigned'}</div>
      </li>`).join('') : "<li class='muted'>No overdue tasks 🎉</li>";

    exportBtn?.addEventListener('click', () => {
      const header = ['Title','AssignedTo','Priority','Status','Deadline','CreatedAt','UpdatedAt','Description'];
      const rows = tasks.map(t => [
        t.title || '',
        t.assignedTo || '',
        t.priority || '',
        t.status || '',
        t.deadline ? t.deadline.toISOString().slice(0,10) : '',
        t.createdAt ? t.createdAt.toISOString() : '',
        t.updatedAt ? t.updatedAt.toISOString() : '',
        (t.description || '').replace(/\n/g, ' ')
      ]);
      const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `taskmate-admin-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });
  });
});
