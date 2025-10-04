document.addEventListener('DOMContentLoaded',()=>{
  auth.onAuthStateChanged(async (user)=>{
    if(!user){ location.href='index.html'; return; }
    const role=(await db.collection('users').doc(user.uid).get()).data()?.role||'user';
    if(role!=='admin'){ alert('Admins only'); location.href='user.html'; }
  });
});
