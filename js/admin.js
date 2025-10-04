document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('taskList');
  const cards = document.getElementById('adminCards');

  const idEl = document.getElementById('taskId');
  const titleEl = document.getElementById('title');
  const deadlineEl = document.getElementById('deadline');
  const priorityEl = document.getElementById('priority');
  const statusEl = document.getElementById('status');
  const assignedToEmailEl = document.getElementById('assignedToEmail');
  const descEl = document.getElementById('description');
  const formTitle = document.getElementById('formTitle');
  const form = document.getElementById('taskForm');
  const resetBtn = document.getElementById('resetBtn');

  const searchEl = document.getElementById('search');
  const fPriEl = document.getElementById('filterPriority');
  const fStatEl = document.getElementById('filterStatus');

  let unsub = null;

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    if (unsub) unsub();
    // No orderBy → avoid composite index or missing-field errors
    unsub = db.collection('tasks').onSnapshot(snap => render(snap), err => alert(err.message));
  });

  function safeDate(d) {
    if (!d) return null;
    if (d.toDate) return d.toDate(); // Firestore Timestamp
    return new Date(d);
  }

  function render(snap) {
    // Normalize data + sort newest first (updatedAt > createdAt > title)
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .map(t => ({
        ...t,
        createdAt: safeDate(t.createdAt),
        updatedAt: safeDate(t.updatedAt),
        deadline : safeDate(t.deadline),
      }))
      .sort((a, b) => {
        const aKey = a.updatedAt || a.createdAt || 0;
        const bKey = b.updatedAt || b.createdAt || 0;
        return (bKey - aKey) || a.title.localeCompare(b.title);
      });

    renderCards(cards, arr);
    paintList(arr);
  }

  function paintList(items) {
    const q = searchEl.value.toLowerCase();
    const fp = fPriEl.value;
    const fs = fStatEl.value;

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
        <button class="checkbox" data-action="toggle">${isDone ? '✓' : ''}</button>
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
          ${isSub ? '<button class="btn" data-action="approve">Approve</button><button class="btn btn-ghost" data-action="reject">Reject</button>' : ''}
          <button class="btn btn-ghost" data-action="edit">Edit</button>
          <button class="btn btn-danger" data-action="delete">Delete</button>
        </div>
      </li>`;
    }).join('');
  }

  [searchEl, fPriEl, fStatEl].forEach(el => el.addEventListener('input', () => auth.currentUser && db.collection('tasks').get().then(()=>{})));

  list.addEventListener('click', async (e) => {
    const li = e.target.closest('li.task'); if (!li) return;
    const id = li.dataset.id;
    const act = e.target.dataset.action;
    const ref = db.collection('tasks').doc(id);
    const snap = await ref.get(); if (!snap.exists) return;
    const t = snap.data();

    if (act === 'toggle') { await ref.update({ status: t.status === 'done' ? 'open' : 'done', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); return; }
    if (act === 'delete') { if (confirm('Delete this task?')) await ref.delete(); return; }
    if (act === 'edit') {
      idEl.value = id;
      titleEl.value = t.title || '';
      deadlineEl.value = toDateInputValue(t.deadline);
      priorityEl.value = t.priority || 'medium';
      statusEl.value = t.status || 'open';
      assignedToEmailEl.value = t.assignedTo || '';
      descEl.value = t.description || '';
      formTitle.textContent = 'Edit Task';
      return;
    }
    if (act === 'approve') { await ref.update({ status: 'done', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); return; }
    if (act === 'reject')  { await ref.update({ status: 'open', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); return; }
  });

  resetBtn.addEventListener('click', () => { idEl.value = ''; form.reset(); formTitle.textContent = 'Create Task'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: titleEl.value.trim(),
      description: (descEl.value || '').trim(),
      priority: priorityEl.value,
      status: statusEl.value,
      assignedTo: assignedToEmailEl.value.trim(),
      // use server timestamps
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const d = deadlineEl.value.trim();
    if (d) payload.deadline = new Date(d).toISOString();

    const id = idEl.value;
    try {
      if (id) { await db.collection('tasks').doc(id).update(payload); }
      else   { await db.collection('tasks').add(payload); }
      form.reset(); idEl.value = ''; formTitle.textContent = 'Create Task';
    } catch (err) { alert(err.message); }
  });
});
