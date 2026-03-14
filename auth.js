(function () {
  'use strict';

  var API_BASE = '';
  var API_PORT = '3000';

  function getApiUrl(path) {
    var base = API_BASE;
    var port = window.location.port;
    var isFile = window.location.protocol === 'file:';
    var needRemote = isFile || !port || port !== API_PORT || !window.location.hostname;
    if (!base && needRemote) {
      base = 'http://localhost:' + API_PORT;
    }
    return (base + '/api' + path).replace(/([^:]\/)\/+/g, '$1');
  }

  function showMessage(msg, isError) {
    var existing = document.querySelector('.auth-message');
    if (existing) existing.remove();
    var el = document.createElement('p');
    el.className = 'auth-message' + (isError ? ' auth-message--error' : ' auth-message--success');
    el.textContent = msg;
    var wrap = document.querySelector('.auth-wrap');
    if (wrap) {
      var card = wrap.querySelector('.auth-card');
      card ? card.insertBefore(el, card.firstChild) : wrap.appendChild(el);
    }
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Please wait...' : (btn.dataset.originalText || 'Submit');
  }

  // Form submit – call backend API
  var form = document.querySelector('.auth-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var action = form.getAttribute('data-action') || 'login';
      var btn = form.querySelector('button[type="submit"]');
      setLoading(btn, true);
      showMessage('', false);

      try {
        if (action === 'login') {
          var email = form.querySelector('input[type="email"]').value;
          var password = form.querySelector('input[type="password"]').value;
          var res = await fetch(getApiUrl('/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          var data = await res.json();
          if (data.success) {
            if (data.token) localStorage.setItem('auth_token', data.token);
            if (data.user) localStorage.setItem('auth_user', JSON.stringify(data.user));
            showMessage(data.message, false);
            var profileUrl = window.location.protocol === 'file:' ? 'profile.html' : (window.location.origin + '/profile.html');
            window.location.replace(profileUrl);
          } else {
            showMessage(data.message || 'Login failed', true);
            setLoading(btn, false);
          }
        } else if (action === 'signup') {
          var signupEmail = form.querySelector('input[type="email"]').value;
          var signupPass = form.querySelector('#signup-password').value;
          var signupRes = await fetch(getApiUrl('/signup'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: signupEmail, password: signupPass }),
          });
          var signupData = await signupRes.json();
          if (signupData.success) {
            if (signupData.token) {
              localStorage.setItem('auth_token', signupData.token);
              localStorage.setItem('auth_user', JSON.stringify(signupData.user));
              showMessage('Account created! Redirecting to profile...', false);
              var profileUrl = window.location.protocol === 'file:' ? 'profile.html' : (window.location.origin + '/profile.html');
              window.location.replace(profileUrl);
            } else {
              showMessage(signupData.message, false);
              setTimeout(function () { window.location.href = 'login.html'; }, 1200);
            }
          } else {
            showMessage(signupData.message || 'Signup failed', true);
            setLoading(btn, false);
          }
        } else if (action === 'forgot') {
          var forgotEmail = form.querySelector('input[type="email"]').value;
          var forgotRes = await fetch(getApiUrl('/forgot-password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail }),
          });
          var forgotData = await forgotRes.json();
          if (forgotData.success) {
            showMessage(forgotData.message, false);
            form.reset();
          } else {
            showMessage(forgotData.message || 'Request failed', true);
          }
          setLoading(btn, false);
        } else if (action === 'reset') {
          var tokenInput = form.querySelector('#reset-token');
          var resetPass = form.querySelector('#reset-password').value;
          var token = tokenInput ? tokenInput.value : '';
          if (!token) {
            showMessage('Invalid reset link. Please request a new one.', true);
            setLoading(btn, false);
            return;
          }
          var resetRes = await fetch(getApiUrl('/reset-password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password: resetPass }),
          });
          var resetData = await resetRes.json();
          if (resetData.success) {
            showMessage(resetData.message, false);
            setTimeout(function () { window.location.href = 'login.html'; }, 1200);
          } else {
            showMessage(resetData.message || 'Reset failed', true);
            setLoading(btn, false);
          }
        }
      } catch (err) {
        console.error(err);
        showMessage('Network error. Make sure the server is running (npm start).', true);
        setLoading(btn, false);
      }
    });
  }

  // Reset form: confirm password match
  var resetForm = document.querySelector('.auth-form[data-action="reset"]');
  if (resetForm) {
    var pass = resetForm.querySelector('#reset-password');
    var confirm = resetForm.querySelector('#reset-confirm');
    function check() {
      if (confirm && confirm.value && pass && pass.value !== confirm.value) {
        confirm.setCustomValidity('Passwords do not match');
      } else if (confirm) {
        confirm.setCustomValidity('');
      }
    }
    if (pass) pass.addEventListener('input', check);
    if (confirm) confirm.addEventListener('input', check);
  }

  // Continue with Google
  var GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
  var REDIRECT_URI = window.location.origin + window.location.pathname;

  function getGoogleAuthUrl() {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
      return 'https://accounts.google.com/';
    }
    var scope = encodeURIComponent('email profile');
    return (
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
      '&response_type=token&scope=' + scope
    );
  }

  var googleBtn = document.querySelector('.auth-google');
  if (googleBtn) {
    googleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var url = getGoogleAuthUrl();
      if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID') {
        window.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    });
  }
})();
