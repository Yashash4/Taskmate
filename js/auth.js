document.addEventListener('DOMContentLoaded', () => {
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const resetPwd   = document.getElementById('resetPwd');

  // ----- Tabs -----
  const tabs = document.querySelectorAll('.tab');
  const panels = { login: loginForm, signup: signupForm };
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const target = t.dataset.tab;
      Object.keys(panels).forEach(k => panels[k].classList.toggle('hidden', k !== target));
      // focus first input of that panel
      panels[target].querySelector('input')?.focus();
    });
  });

  // ----- Show/Hide password -----
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  // ----- Loading & errors helpers -----
  function setLoading(btn, isLoading, label) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Please wait…' : label;
  }
  function showError(form, msg) {
    const box = form.querySelector('.form-error');
    if (!box) return;
    if (!msg) { box.hidden = true; box.textContent = ''; return; }
    box.hidden = false; box.textContent = msg;
  }

  // ----- Redirect when signed in -----
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const uref = db.collection('users').doc(user.uid);
    const snap = await uref.get();
    if (!snap.exists) {
      await uref.set({ name: user.email.split('@')[0], email: user.email, role: 'user', createdAt: new Date() });
    }
    const role = (await uref.get()).data().role || 'user';
    location.href = role === 'admin' ? 'admin.html' : 'user.html';
  });

  // ----- Login -----
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(loginForm, null);
    const btn = document.getElementById('loginBtn');
    setLoading(btn, true, 'Login');
    try {
      await auth.signInWithEmailAndPassword(
        document.getElementById('loginEmail').value.trim(),
        document.getElementById('loginPassword').value
      );
    } catch (err) {
      showError(loginForm, err.message);
      setLoading(btn, false, 'Login');
    }
  });

  // ----- Password reset -----
  resetPwd?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim() || prompt('Enter your email for a reset link:');
    if (!email) return;
    try { await auth.sendPasswordResetEmail(email); alert('Password reset email sent.'); }
    catch (err) { alert(err.message); }
  });

  // ----- Sign up -----
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(signupForm, null);
    const btn = document.getElementById('signupBtn');
    setLoading(btn, true, 'Sign up');
    try {
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const pwd   = document.getElementById('signupPassword').value;
      const cred  = await auth.createUserWithEmailAndPassword(email, pwd);
      await db.collection('users').doc(cred.user.uid).set({ name, email, role: 'user', createdAt: new Date() });
      // redirect handled by onAuthStateChanged
    } catch (err) {
      showError(signupForm, err.message);
      setLoading(btn, false, 'Sign up');
    }
  });
});
