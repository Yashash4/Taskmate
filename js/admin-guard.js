document.addEventListener('DOMContentLoaded',()=>{
  const who = document.getElementById('whoami');
  const logout = document.getElementById('logoutBtn');

  auth.onAuthStateChanged(async (user)=>{
    if(!user){ location.href='index.html'; return; }
    const snap = await db.collection('users').doc(user.uid).get();
    const data = snap.data() || {};
    const name = data.name || (user.email ? user.email.split('@')[0] : 'User');
    const role = data.role || 'user';

    // show name (not email)
    if(who) who.textContent = `${name} (${role})`;

    // keep in session for quick access
    sessionStorage.setItem('role', role);
    sessionStorage.setItem('email', user.email || '');
    sessionStorage.setItem('name', name);
  });

  logout?.addEventListener('click', async ()=>{
    await auth.signOut(); location.href='index.html';
  });
});
