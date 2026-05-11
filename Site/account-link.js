document.addEventListener('DOMContentLoaded', () => {
  const avatarLink = document.getElementById('avatarLink');
  const ribbon = document.getElementById('userNameRibbon');

  if (!avatarLink || !ribbon) return;

  avatarLink.tabIndex = 0;

  const parseUser = () => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch (err) {
      console.warn('Некоректний user у localStorage', err);
      return null;
    }
  };

  const isAuthenticated = (user) => {
    return !!user && (typeof user.user_id === 'number' || typeof user.user_id === 'string' && user.user_id.trim() !== '');
  };

  const handleAccountRedirect = (event) => {
    if (event) {
      event.preventDefault();
    }

    const user = parseUser();
    if (isAuthenticated(user)) {
      window.location.href = 'account.html';
    } else {
      window.location.href = 'register.html';
    }
  };

  avatarLink.addEventListener('click', handleAccountRedirect);

  avatarLink.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleAccountRedirect(event);
    }
  });

  const user = parseUser();
  if (user && user.name) {
    ribbon.textContent = `Привіт, ${user.name}!`;
    ribbon.style.display = 'block';
    avatarLink.setAttribute('aria-label', `Акаунт користувача ${user.name}`);
  } else {
    ribbon.style.display = 'none';
    avatarLink.setAttribute('aria-label', 'Увійти або зареєструватися');
  }
});