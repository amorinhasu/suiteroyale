const playerName = document.getElementById('playerName');
const suiteCoins = document.getElementById('suiteCoins');
const globalBetMessage = document.getElementById('globalBetMessage');
const fortuneRanking = document.getElementById('fortuneRanking');
const riskRanking = document.getElementById('riskRanking');
const logoutButton = document.getElementById('logoutButton');
const betButtons = document.querySelectorAll('.bet-button');
const gameCards = document.querySelectorAll('.game-card');
const cardBalances = document.querySelectorAll('.card-balance');

const rankingStorageKey = 'suiteRoyaleRankings';
const username = sessionStorage.getItem('username');
const storedBalance = sessionStorage.getItem('suiteCoins');
let balance = Number(storedBalance);
let rankings = loadRankings();

// Protege a página do cassino: sem jogador ou saldo válido, volta para o login.
if (!username || storedBalance === null || !Number.isFinite(balance) || balance < 0) {
  window.location.href = 'index.html';
} else {
  playerName.textContent = username;
  ensurePlayerRanking();
  updateBalance(balance);
  updateBetButtons();
  renderRankings();
}

// Liga todos os botões de aposta aos cards. O tipo de jogo vem do data-game.
betButtons.forEach((button) => {
  button.addEventListener('click', () => placeBet(button));
});

/**
 * Deduz a aposta, executa a lógica automática do jogo escolhido,
 * atualiza o card apostado, persiste saldo e recalcula os rankings.
 */
function placeBet(button) {
  const betAmount = Number(button.dataset.bet);
  const gameKey = button.dataset.game;
  const card = button.closest('.game-card');

  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    showCardResult(card, 'Aposta inválida para este jogo.', 'loss');
    setGlobalBetMessage('Aposta inválida para este jogo.', 'loss');
    return;
  }

  if (balance < betAmount) {
    const message = `Saldo insuficiente. Você precisa de ${betAmount} SC para apostar nesta mesa.`;
    highlightCard(card, 'loss');
    showCardResult(card, message, 'loss');
    setGlobalBetMessage(message, 'loss');
    return;
  }

  const result = playGame(gameKey, betAmount);
  balance -= betAmount;

  if (result.won) {
    balance += result.payout;
  }

  updateRankingAfterBet(betAmount);
  updateBalance(balance);
  updateBetButtons();
  renderRankings();
  highlightCard(card, result.won ? 'win' : 'loss');

  const message = formatResultMessage(result, betAmount);
  showCardResult(card, message, result.won ? 'win' : 'loss');
  setGlobalBetMessage(message, result.won ? 'win' : 'loss');
}

/**
 * Centraliza as regras de cada jogo automatizado.
 * Retorna se ganhou, o prêmio pago e detalhes para exibição ao jogador.
 */
function playGame(gameKey, betAmount) {
  const games = {
    roulette: playRoulette,
    dice: playDice,
    parity: playParity,
    crash: playCrash,
    slots: playSlots,
    bingo: playBingo,
  };

  if (!games[gameKey]) {
    return {
      gameName: 'Jogo indisponível',
      won: false,
      payout: 0,
      detail: 'Esta mesa ainda não está configurada.',
    };
  }

  return games[gameKey](betAmount);
}

// Roleta: escolhe automaticamente um número do jogador e um número sorteado.
function playRoulette() {
  const playerNumber = randomInt(0, 36);
  const drawnNumber = randomInt(0, 36);
  const won = playerNumber === drawnNumber;

  return {
    gameName: 'Roleta Números',
    won,
    payout: won ? 350 : 0,
    detail: `Seu número: ${playerNumber}. Roleta: ${drawnNumber}.`,
  };
}

// Dados: vence quando a soma dos dois dados chega a 8 ou mais.
function playDice() {
  const firstDie = randomInt(1, 6);
  const secondDie = randomInt(1, 6);
  const total = firstDie + secondDie;
  const won = total >= 8;

  return {
    gameName: 'Dados do Destino',
    won,
    payout: won ? 120 : 0,
    detail: `Dados: ${firstDie} + ${secondDie} = ${total}.`,
  };
}

// Par/Ímpar Royale: o palpite automático alterna entre par/ímpar e maior/menor.
function playParity() {
  const number = randomInt(1, 20);
  const mode = Math.random() >= 0.5 ? 'paridade' : 'maior-menor';
  let prediction;
  let actual;

  if (mode === 'paridade') {
    prediction = Math.random() >= 0.5 ? 'par' : 'ímpar';
    actual = number % 2 === 0 ? 'par' : 'ímpar';
  } else {
    prediction = Math.random() >= 0.5 ? 'maior que 10' : 'menor ou igual a 10';
    actual = number > 10 ? 'maior que 10' : 'menor ou igual a 10';
  }

  const won = prediction === actual;

  return {
    gameName: 'Par/Ímpar Royale',
    won,
    payout: won ? 95 : 0,
    detail: `Palpite: ${prediction}. Número: ${number} (${actual}).`,
  };
}

// Crash: cria um multiplicador; ganha se atingir pelo menos 2.00x.
function playCrash(betAmount) {
  const multiplier = Number((1 + Math.random() * 3.5).toFixed(2));
  const won = multiplier >= 2;
  const payout = won ? Math.round(betAmount * multiplier) : 0;

  return {
    gameName: 'Crash',
    won,
    payout,
    detail: `Multiplicador parou em ${multiplier.toFixed(2)}x.`,
  };
}

// Slots: três símbolos; trinca paga alto, dupla paga bônus menor.
function playSlots() {
  const symbols = ['💎', '👑', '🔔', '⭐', '🍒'];
  const spin = [pick(symbols), pick(symbols), pick(symbols)];
  const uniqueSymbols = new Set(spin).size;
  const payout = uniqueSymbols === 1 ? 250 : uniqueSymbols === 2 ? 90 : 0;

  return {
    gameName: 'Slots',
    won: payout > 0,
    payout,
    detail: `Resultado: ${spin.join(' ')}`,
  };
}

// Bingo: compara cartela e números chamados; 3+ acertos vencem.
function playBingo() {
  const cardNumbers = drawUniqueNumbers(5, 1, 30);
  const calledNumbers = drawUniqueNumbers(5, 1, 30);
  const hits = cardNumbers.filter((number) => calledNumbers.includes(number));
  const payout = hits.length >= 4 ? 180 : hits.length === 3 ? 110 : 0;

  return {
    gameName: 'Bingo',
    won: payout > 0,
    payout,
    detail: `Acertos: ${hits.length}. Cartela: ${cardNumbers.join(', ')}. Chamados: ${calledNumbers.join(', ')}.`,
  };
}

// Atualiza o saldo na tela, nos cards e mantém o valor persistido para a sessão atual.
function updateBalance(newBalance) {
  balance = Math.max(0, Math.round(newBalance));
  sessionStorage.setItem('suiteCoins', balance.toString());
  suiteCoins.textContent = balance.toLocaleString('pt-BR');
  cardBalances.forEach((cardBalance) => {
    cardBalance.textContent = `${balance.toLocaleString('pt-BR')} SC`;
  });
  ensurePlayerRanking();
  rankings[username].currentBalance = balance;
  rankings[username].bestBalance = Math.max(rankings[username].bestBalance, balance);
  saveRankings();
}

// Desabilita apostas que custam mais do que o saldo disponível.
function updateBetButtons() {
  betButtons.forEach((button) => {
    const betAmount = Number(button.dataset.bet);
    button.disabled = balance < betAmount;
  });
}

// Mostra feedback geral de vitória/derrota com estilo visual diferente.
function setGlobalBetMessage(text, status) {
  globalBetMessage.textContent = text;
  globalBetMessage.classList.remove('win', 'loss');
  globalBetMessage.classList.add(status);
}

// Mensagem de vitória/derrota exibida diretamente dentro do card apostado.
function showCardResult(card, text, status) {
  if (!card) return;

  const result = card.querySelector('.card-result');
  if (!result) return;

  result.textContent = text;
  result.classList.remove('win', 'loss');
  result.classList.add(status);
}

// Monta a mensagem final da aposta com dedução, prêmio e saldo atualizado.
function formatResultMessage(result, betAmount) {
  const outcome = result.won
    ? `Você ganhou ${result.payout} SC!`
    : `Você perdeu ${betAmount} SC.`;

  return `${result.gameName}: ${outcome} ${result.detail} Saldo atual: ${balance.toLocaleString('pt-BR')} SC.`;
}

// Reinicia a animação do card para destacar o último jogo apostado.
function highlightCard(card, status) {
  if (!card) return;

  gameCards.forEach((gameCard) => {
    gameCard.classList.remove('is-winning', 'is-losing', 'is-betting');
  });

  card.classList.remove('is-winning', 'is-losing', 'is-betting');
  void card.offsetWidth;
  card.classList.add('is-betting', status === 'win' ? 'is-winning' : 'is-losing');
}

// Carrega rankings do sessionStorage, mantendo os dados apenas no navegador/sessão atual.
function loadRankings() {
  const storedRankings = sessionStorage.getItem(rankingStorageKey);

  if (!storedRankings) {
    return {};
  }

  try {
    return JSON.parse(storedRankings);
  } catch {
    return {};
  }
}

// Garante que o jogador atual exista nos rankings antes de qualquer atualização.
function ensurePlayerRanking() {
  if (!rankings[username]) {
    rankings[username] = {
      name: username,
      currentBalance: balance,
      bestBalance: balance,
      totalBets: 0,
      totalWagered: 0,
    };
  }
}

// Atualiza métricas de risco/frequência a cada aposta efetuada.
function updateRankingAfterBet(betAmount) {
  ensurePlayerRanking();
  rankings[username].totalBets += 1;
  rankings[username].totalWagered += betAmount;
  saveRankings();
}

function saveRankings() {
  sessionStorage.setItem(rankingStorageKey, JSON.stringify(rankings));
}

// Renderiza os dois rankings: fortuna por saldo atual e risco por quantidade de apostas.
function renderRankings() {
  renderRankingList(fortuneRanking, getSortedPlayers('fortune'), 'currentBalance', ' SC');
  renderRankingList(riskRanking, getSortedPlayers('risk'), 'totalBets', ' apostas');
}

function getSortedPlayers(type) {
  const players = Object.values(rankings);

  if (type === 'fortune') {
    return players.sort((first, second) => second.currentBalance - first.currentBalance).slice(0, 5);
  }

  return players.sort((first, second) => second.totalBets - first.totalBets).slice(0, 5);
}

function renderRankingList(list, players, metric, suffix) {
  if (!list) return;

  if (players.length === 0) {
    list.innerHTML = '<li>Nenhum jogador ranqueado ainda.</li>';
    return;
  }

  list.innerHTML = players.map((player) => {
    const value = metric === 'currentBalance'
      ? player[metric].toLocaleString('pt-BR')
      : player[metric];

    return `<li><span>${player.name}</span><strong>${value}${suffix}</strong></li>`;
  }).join('');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randomInt(0, items.length - 1)];
}

function drawUniqueNumbers(amount, min, max) {
  const numbers = new Set();

  while (numbers.size < amount) {
    numbers.add(randomInt(min, max));
  }

  return [...numbers].sort((a, b) => a - b);
}

logoutButton.addEventListener('click', () => {
  // Limpa a sessão ativa e preserva apenas os rankings do evento no sessionStorage.
  const savedRankings = sessionStorage.getItem(rankingStorageKey);
  sessionStorage.clear();

  if (savedRankings) {
    sessionStorage.setItem(rankingStorageKey, savedRankings);
  }

  window.location.href = 'index.html';
});
