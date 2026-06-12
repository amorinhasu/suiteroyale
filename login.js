const senhaCorreta = 'dasusu';
const saldoInicial = 1000;

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const message = document.getElementById('message');

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  login();
});

function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  message.textContent = '';

  if (username === '' || password === '') {
    message.textContent = 'Preencha todos os campos!';
    return;
  }

  if (password !== senhaCorreta) {
    message.textContent = 'Senha incorreta!';
    return;
  }

  sessionStorage.setItem('username', username);
  sessionStorage.setItem('suiteCoins', saldoInicial.toString());
  window.location.href = 'cassino.html';
}
