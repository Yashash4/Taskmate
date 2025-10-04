document.addEventListener('DOMContentLoaded',()=>{
  const loginForm=document.getElementById('loginForm'); const signupForm=document.getElementById('signupForm'); const resetPwd=document.getElementById('resetPwd');
  auth.onAuthStateChanged(async (user)=>{
    if(!user) return;
    const uref=db.collection('users').doc(user.uid); const snap=await uref.get();
    if(!snap.exists){ await uref.set({ name:user.email.split('@')[0], email:user.email, role:'user', createdAt:new Date() }); }
    const role=(await uref.get()).data().role || 'user'; location.href = role==='admin' ? 'admin.html' : 'user.html';
  });
  loginForm?.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPassword').value); }catch(err){ alert(err.message); }});
  resetPwd?.addEventListener('click', async ()=>{ const email=prompt('Enter your email for reset link:'); if(!email) return; try{ await auth.sendPasswordResetEmail(email); alert('Password reset email sent.'); }catch(err){ alert(err.message); }});
  signupForm?.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const name=document.getElementById('signupName').value.trim(); const email=document.getElementById('signupEmail').value.trim(); const password=document.getElementById('signupPassword').value; const cred=await auth.createUserWithEmailAndPassword(email,password); await db.collection('users').doc(cred.user.uid).set({ name, email, role:'user', createdAt:new Date() }); alert('Account created!'); }catch(err){ alert(err.message); }});
});