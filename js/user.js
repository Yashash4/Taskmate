document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('taskList');
  const cards = document.getElementById('userCards');
  const searchEl = document.getElementById('search');
  const fPriEl = document.getElementById('filterPriority');
  const fStatEl = document.getElementById('filterStatus');

  let unsub = null;

  function safeDate(d){ if(!d) return null; if(d.toDate) return d.toDate(); return new Date(d); }

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    if (unsub) unsub();
    // Listen to only my tasks, no orderBy (sort locally)
    unsub = db.collection('tasks').where('assignedTo', '==', user.email)
      .onSnapshot(snap => render(snap), err => alert(err.message));
  });

  function render(snap) {
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .map(t => ({ ...t, createdAt: safeDate(t.createdAt), updatedAt: safeDate(t.updatedAt), deadline: safeDate(t.deadline) }))
      .sort((a,b) => ((b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)) || a.title.localeCompare(b.title));

    renderCards(cards, arr);
    paintList(arr);
  }

  function paintList(items) {
    const q = searchEl.value.toLowerCase();
    const fp = fPriEl.value; const fs = fStatEl.value;

    const tasks = items.filter(t => {
      const mQ = t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
      const mP = fp === 'all' || t.priority === fp;
      const mS = fs === 'all' || t.status === fs;
      return mQ && mP && mS;
    });

    if (tasks.length === 0) { list.innerHTML = "<li class='muted'>No tasks found.</li>"; return; }

    list.innerHTML = tasks.map(t => {
      const isDone = t.status === 'done';
      const isSub  = t.status === 'submitted';
      const dueStr = t.deadline ? ('Due ' + new Date(t.deadline).toLocaleDateString()) : 'No due date';
      return `
      <li class="task ${isDone ? 'done' : ''}" data-id="${t.id}">
        <button class="checkbox" disabled>${isDone ? '✓' : ''}</button>
        <div class="stack">
          <div class="title">${t.title}</div>
          <div class="meta">
            ${dueStr} •
            <span class="badge ${t.priority ? ('priority-' + t.priority) : ''}">${t.priority || '—'}</span> •
            ${t.assignedTo || 'Unassigned'}
            ${t.deadline ? (t.status!=='done' ? badgeFor(t.deadline, false) : '') : ''}
            ${t.status==='open' ? '<span class="badge status-open">open</span>' : ''}
            ${t.status==='submitted' ? '<span class="badge status-submitted">submitted</span>' : ''}
            ${t.status==='done' ? '<span class="badge status-done">done</span>' : ''}
          </div>
          ${t.description ? `<p class="muted">${t.description}</p>` : ''}
        </div>
        <div class="row">
          ${(!isDone && !isSub) ? '<button class="btn" data-action="submit-done">Mark Finished</button>' : ''}
          ${(isSub) ? '<button class="btn btn-ghost" data-action="undo-submit">Undo Submission</button>' : ''}
        </div>
      </li>`;
    }).join('');
  }

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]'); if (!btn) return;
    const id = btn.closest('li.task').dataset.id;
    const ref = db.collection('tasks').doc(id);
    if (btn.dataset.action === 'submit-done') { await ref.update({ status: 'submitted', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    if (btn.dataset.action === 'undo-submit') { await ref.update({ status: 'open',      updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
  });

  [searchEl, fPriEl, fStatEl].forEach(el => el.addEventListener('input', () => auth.currentUser && db.collection('tasks').get().then(()=>{})));
});
