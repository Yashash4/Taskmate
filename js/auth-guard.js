document.addEventListener('DOMContentLoaded',()=>{
  const who=document.getElementById('whoami'); const logout=document.getElementById('logoutBtn');
  auth.onAuthStateChanged(async (user)=>{ if(!user){ location.href='index.html'; return; } const role=(await db.collection('users').doc(user.uid).get()).data()?.role||'user'; sessionStorage.setItem('role',role); sessionStorage.setItem('email',user.email); if(who) who.textContent=`${user.email} (${role})`; });
  logout?.addEventListener('click', async ()=>{ await auth.signOut(); location.href='index.html'; });
});