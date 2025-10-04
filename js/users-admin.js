document.addEventListener('DOMContentLoaded', () => {
  const rows = document.getElementById('userRows');
  const search = document.getElementById('userSearch');
  const roleFilter = document.getElementById('roleFilter');

  let users = [];
  let countsByEmail = {};

  function fmtDate(d){
    if(!d) return '';
    const dt = d.toDate ? d.toDate() : new Date(d);
    return dt.toLocaleDateString();
  }

  function paint(){
    const q = (search.value || '').toLowerCase();
    const rf = roleFilter.value;
    const filtered = users.filter(u => {
      const matchesQ = (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q);
      const matchesR = rf === 'all' || (u.role||'user') === rf;
      return matchesQ && matchesR;
    });

    if(!filtered.length){
      rows.innerHTML = `<tr><td colspan="7" class="muted">No users found.</td></tr>`;
      return;
    }

    rows.innerHTML = filtered.map(u => {
      const c = countsByEmail[u.email] || {open:0,submitted:0,done:0};
      return `
        <tr style="background:var(--panel); border:1px solid var(--border);">
          <td style="padding:.6rem 1rem">${u.name || '—'}</td>
          <td style="padding:.6rem 1rem">${u.email || ''}</td>
          <td style="padding:.6rem 1rem"><span class="badge">${u.role||'user'}</span></td>
          <td style="padding:.6rem 1rem">${fmtDate(u.createdAt) || ''}</td>
          <td style="padding:.6rem 1rem">${c.open}</td>
          <td style="padding:.6rem 1rem">${c.submitted}</td>
          <td style="padding:.6rem 1rem">${c.done}</td>
        </tr>`;
    }).join('');
  }

  [search, roleFilter].forEach(el => el.addEventListener('input', paint));

  auth.onAuthStateChanged(async (user) => {
    if(!user) return;

    // Find my org
    const me = await db.collection('users').doc(user.uid).get();
    const orgCode = me.data()?.orgCode;
    if(!orgCode){
      rows.innerHTML = `<tr><td colspan="7" class="muted">Create an organization first.</td></tr>`;
      return;
    }

    // Users in my org
    const uSnap = await db.collection('users').where('orgCode','==',orgCode).get();
    users = uSnap.docs.map(d => ({ id:d.id, ...d.data() }));

    // Tasks for counts (one query)
    const tSnap = await db.collection('tasks').where('orgCode','==',orgCode).get();
    countsByEmail = {};
    tSnap.docs.forEach(doc => {
      const t = doc.data();
      const email = t.assignedTo || '';
      if(!email) return;
      const c = (countsByEmail[email] ||= {open:0,submitted:0,done:0});
      if(t.status === 'done') c.done++; else if(t.status === 'submitted') c.submitted++; else c.open++;
    });

    paint();
  });
});
