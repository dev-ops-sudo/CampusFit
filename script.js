(function () {
  'use strict';

  // Show Profile / hide Login-Signup when logged in
  if (localStorage.getItem('auth_token')) {
    var profile = document.getElementById('nav-profile');
    var profileM = document.getElementById('nav-profile-mobile');
    var login = document.getElementById('nav-login');
    var signup = document.getElementById('nav-signup');
    var loginM = document.getElementById('nav-login-mobile');
    var signupM = document.getElementById('nav-signup-mobile');
    if (profile) profile.style.display = '';
    if (profileM) profileM.style.display = '';
    if (login) login.style.display = 'none';
    if (signup) signup.style.display = 'none';
    if (loginM) loginM.style.display = 'none';
    if (signupM) signupM.style.display = 'none';
  }

  // Mobile menu
  var menuBtn = document.querySelector('.menu-btn');
  var navMobile = document.querySelector('.nav-mobile');
  var navLinks = document.querySelectorAll('.nav-mobile a');

  if (menuBtn && navMobile) {
    menuBtn.addEventListener('click', function () {
      navMobile.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', navMobile.classList.contains('is-open'));
      document.body.style.overflow = navMobile.classList.contains('is-open') ? 'hidden' : '';
    });

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        navMobile.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Contact form
  var form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#name').value;
      var email = form.querySelector('#email').value;
      var message = form.querySelector('#message').value;
      // Replace with your own endpoint or mailto
      console.log('Submit:', { name: name, email: email, message: message });
      alert('Thanks for your message! We\'ll get back to you soon.');
      form.reset();
    });
  }

  // Optional: header background on scroll
  var header = document.querySelector('.header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.style.background = window.scrollY > 50
        ? 'rgba(10, 10, 11, 0.95)'
        : 'rgba(10, 10, 11, 0.85)';
    });
  }
})();
