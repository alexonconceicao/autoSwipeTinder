// ==UserScript==
// @name         Auto Liker for Tinder (AutoSwipe)
// @name:pt      Auto Liker para Tinder (AutoSwipe)
// @name:pt-BR   Auto Liker para Tinder (AutoSwipe)

// @description  Auto swipe com filtro por palavras-chave, controle de intervalo e painel visual.
// @description:pt Script de auto like e dislike com filtros, sliders e painel de controle.
// @description:pt-BR Script de auto like e dislike no Tinder com filtros, sliders e painel visual.

// @version      1.8.0
// @namespace    https://greasyfork.org/users/1416065
// @author       Nox
// @license      MIT

// @match        https://tinder.com/*
// @compatible   chrome
// @compatible   firefox
// @grant        none
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tinder.com
// @downloadURL https://update.greasyfork.org/scripts/521871/Auto%20Liker%20para%20Tinder%20%28AutoSwipe%29.user.js
// @updateURL https://update.greasyfork.org/scripts/521871/Auto%20Liker%20para%20Tinder%20%28AutoSwipe%29.meta.js
// ==/UserScript==


(function () {
  'use strict';

  // Configurações iniciais
  let interval = 3000; // Intervalo entre ações (ms)
  let profileOpenWait = 3000; // Tempo de espera ao abrir o perfil (ms)
  let forbiddenWords = ['exemplo', 'louca', 'proibido']; // Palavras proibidas padrão
  let likesCount = 0;
  let dislikesCount = 0;
  let isPaused = false;

  // Configurações de altura
  let heightFilterEnabled = false;
  let heightThreshold = 170; // Valor padrão em cm
  let heightCondition = 'greater'; // 'greater' para maior que, 'less' para menor que

  // Configurações de limite de likes
  let likesLimit = null; // null = desativado, número = limite ativo
  let likesLimitEnabled = false;

  // Rastreamento do último dislike
  let lastDislikeTimestamp = null;
  let lastDislikeProfileName = null;
  let lastDislikeProfileAge = null;
  let lastDislikeReason = null;
  let lastDislikeLikesCount = 0;

  // Nome e idade do perfil atual
  let currentProfileName = null;
  let currentProfileAge = null;

  // Carregar nome e idade do último perfil do localStorage
  currentProfileName = localStorage.getItem('currentProfileName');
  currentProfileAge = localStorage.getItem('currentProfileAge');

  // Carregar nome e idade do último dislike do localStorage
  lastDislikeProfileName = localStorage.getItem('lastDislikeProfileName');
  lastDislikeProfileAge = localStorage.getItem('lastDislikeProfileAge');

  // Carregar valores armazenados no localStorage, se existirem
  interval = parseInt(localStorage.getItem('interval')) || interval;
  profileOpenWait =
    parseInt(localStorage.getItem('profileOpenWait')) || profileOpenWait;

  // Carregar configurações de altura
  heightFilterEnabled = localStorage.getItem('heightFilterEnabled') === 'true' || false;
  heightThreshold = parseInt(localStorage.getItem('heightThreshold')) || heightThreshold;
  heightCondition = localStorage.getItem('heightCondition') || heightCondition;

  // Carregar configurações de limite de likes
  const storedLikesLimit = localStorage.getItem('likesLimit');
  if (storedLikesLimit !== null) {
    likesLimit = parseInt(storedLikesLimit);
    if (isNaN(likesLimit) || likesLimit <= 0) {
      likesLimit = null;
    }
  }
  likesLimitEnabled = localStorage.getItem('likesLimitEnabled') === 'true' || false;

  // Resetar contador ao carregar página (nova rodada)
  likesCount = 0;

  // Criação do painel de controle
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.right = '10px';
  container.style.zIndex = '1000';
  container.style.width = '700px';
  container.style.maxHeight = '90vh';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  container.style.color = 'white';
  container.style.padding = '15px';
  container.style.borderRadius = '10px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '14px';
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.gap = '15px';
  container.style.opacity = '0.2';
  container.style.transition = 'opacity 0.3s';
  document.body.appendChild(container);

  // Carregar posição salva do localStorage, se existir
  const savedLeft = localStorage.getItem('modalPositionLeft');
  const savedTop = localStorage.getItem('modalPositionTop');
  if (savedLeft !== null && savedTop !== null) {
    const left = parseFloat(savedLeft);
    const top = parseFloat(savedTop);
    // Validar que as posições estão dentro dos limites da tela
    if (!isNaN(left) && !isNaN(top) && left >= 0 && top >= 0) {
      container.style.left = left + 'px';
      container.style.top = top + 'px';
      container.style.right = 'auto';
    }
  }

  container.addEventListener('mouseenter', () => {
    container.style.opacity = '1';
  });
  container.addEventListener('mouseleave', () => {
    container.style.opacity = '0.2';
  });

  const statsContainer = document.createElement('div');
  statsContainer.style.display = 'flex';
  statsContainer.style.justifyContent = 'space-between';
  statsContainer.style.marginBottom = '10px';
  statsContainer.style.gap = '10px';

  // Container para likes com contorno verde
  const likeCounterContainer = document.createElement('div');
  likeCounterContainer.style.backgroundColor = '#2a2a2a';
  likeCounterContainer.style.padding = '10px';
  likeCounterContainer.style.borderRadius = '8px';
  likeCounterContainer.style.border = '2px solid #4caf50';
  likeCounterContainer.style.flex = '1';
  likeCounterContainer.style.display = 'flex';
  likeCounterContainer.style.justifyContent = 'center';
  likeCounterContainer.style.alignItems = 'center';

  const likeCounter = document.createElement('div');
  likeCounter.textContent = `Likes: ${likesCount}`;
  likeCounter.style.color = '#4caf50';
  likeCounter.style.fontWeight = 'bold';
  likeCounterContainer.appendChild(likeCounter);
  statsContainer.appendChild(likeCounterContainer);

  // Container para dislikes com contorno vermelho
  const dislikeCounterContainer = document.createElement('div');
  dislikeCounterContainer.style.backgroundColor = '#2a2a2a';
  dislikeCounterContainer.style.padding = '10px';
  dislikeCounterContainer.style.borderRadius = '8px';
  dislikeCounterContainer.style.border = '2px solid #f44336';
  dislikeCounterContainer.style.flex = '1';
  dislikeCounterContainer.style.display = 'flex';
  dislikeCounterContainer.style.justifyContent = 'center';
  dislikeCounterContainer.style.alignItems = 'center';

  const dislikeCounter = document.createElement('div');
  dislikeCounter.textContent = `Dislikes: ${dislikesCount}`;
  dislikeCounter.style.color = '#f44336';
  dislikeCounter.style.fontWeight = 'bold';
  dislikeCounterContainer.appendChild(dislikeCounter);
  statsContainer.appendChild(dislikeCounterContainer);

  // Criar container para filtros (lado esquerdo)
  const leftColumn = document.createElement('div');
  leftColumn.style.flex = '1';
  leftColumn.style.display = 'flex';
  leftColumn.style.flexDirection = 'column';
  leftColumn.style.gap = '10px';
  leftColumn.style.overflowY = 'auto';
  leftColumn.style.maxHeight = '100%';
  container.appendChild(leftColumn);

  leftColumn.appendChild(statsContainer);

  forbiddenWords =
    JSON.parse(localStorage.getItem('forbiddenWords')) || forbiddenWords;

  const forbiddenWordsInput = document.createElement('textarea');
  forbiddenWordsInput.value = forbiddenWords.join(', ');
  forbiddenWordsInput.style.width = '100%';
  forbiddenWordsInput.style.height = '50px';
  forbiddenWordsInput.style.borderRadius = '8px';
  forbiddenWordsInput.style.padding = '5px';
  forbiddenWordsInput.style.marginTop = '5px';

  const forbiddenWordsLabel = document.createElement('label');
  forbiddenWordsLabel.textContent =
    'Palavras proibidas (separadas por vírgula)';
  leftColumn.appendChild(forbiddenWordsLabel);
  leftColumn.appendChild(forbiddenWordsInput);

  forbiddenWordsInput.addEventListener('input', () => {
    forbiddenWords = forbiddenWordsInput.value
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);
    localStorage.setItem('forbiddenWords', JSON.stringify(forbiddenWords)); // Salvar no localStorage
  });

  const pauseButton = document.createElement('button');
  pauseButton.textContent = 'Pausar';
  pauseButton.style.padding = '10px';
  pauseButton.style.borderRadius = '8px';
  pauseButton.style.cursor = 'pointer';
  pauseButton.style.backgroundColor = '#f44336';
  pauseButton.style.color = 'white';
  pauseButton.style.border = 'none';
  pauseButton.style.fontWeight = 'bold';
  pauseButton.style.transition = 'background-color 0.3s';
  leftColumn.appendChild(pauseButton);

  const createSlider = (
    labelText,
    min,
    max,
    step,
    initialValue,
    nameInterval,
    onChange
  ) => {
    const sliderContainer = document.createElement('div');
    sliderContainer.style.display = 'flex';
    sliderContainer.style.flexDirection = 'column';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.marginBottom = '5px';
    sliderContainer.appendChild(label);

    const valueDisplay = document.createElement('div');
    valueDisplay.style.textAlign = 'right';
    valueDisplay.textContent = `${(initialValue / 1000).toFixed(1)}s`;
    sliderContainer.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = initialValue;
    slider.style.width = '100%';
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = `${(value / 1000).toFixed(1)}s`;
      onChange(value);
      localStorage.setItem(nameInterval, value);
    });

    sliderContainer.appendChild(slider);
    return sliderContainer;
  };


  const profileWaitSlider = createSlider(
    'Espera ao abrir perfil (segundos)',
    100,
    10000,
    100,
    profileOpenWait,
    'profileOpenWait',
    (value) => {
      profileOpenWait = value;
    }
  );

  // Container com contorno para espera ao abrir perfil
  const profileWaitContainer = document.createElement('div');
  profileWaitContainer.style.backgroundColor = '#2a2a2a';
  profileWaitContainer.style.padding = '10px';
  profileWaitContainer.style.borderRadius = '8px';
  profileWaitContainer.style.border = '2px solid #2196f3';
  profileWaitContainer.style.marginTop = '10px';
  profileWaitContainer.style.display = 'flex';
  profileWaitContainer.style.flexDirection = 'column';
  profileWaitContainer.style.gap = '10px';
  profileWaitContainer.appendChild(profileWaitSlider);
  leftColumn.appendChild(profileWaitContainer);

  const intervalSlider = createSlider(
    'Intervalo entre ações (segundos)',
    100,
    10000,
    100,
    interval,
    'interval',
    (value) => {
      interval = value;
    }
  );

  // Container com contorno para intervalo entre ações
  const intervalContainer = document.createElement('div');
  intervalContainer.style.backgroundColor = '#2a2a2a';
  intervalContainer.style.padding = '10px';
  intervalContainer.style.borderRadius = '8px';
  intervalContainer.style.border = '2px solid #2196f3';
  intervalContainer.style.marginTop = '10px';
  intervalContainer.style.display = 'flex';
  intervalContainer.style.flexDirection = 'column';
  intervalContainer.style.gap = '10px';
  intervalContainer.appendChild(intervalSlider);
  leftColumn.appendChild(intervalContainer);



  // Seção de limite de likes
  const likesLimitContainer = document.createElement('div');
  likesLimitContainer.style.backgroundColor = '#2a2a2a';
  likesLimitContainer.style.padding = '10px';
  likesLimitContainer.style.borderRadius = '8px';
  likesLimitContainer.style.border = '2px solid #ffcc00';
  likesLimitContainer.style.marginTop = '10px';
  likesLimitContainer.style.display = 'flex';
  likesLimitContainer.style.flexDirection = 'column';
  likesLimitContainer.style.gap = '10px';
  leftColumn.appendChild(likesLimitContainer);

  const likesLimitTitle = document.createElement('div');
  likesLimitTitle.textContent = 'Limitador de Likes';
  likesLimitTitle.style.fontWeight = 'bold';
  likesLimitTitle.style.color = '#ffcc00';
  likesLimitTitle.style.marginBottom = '5px';
  likesLimitContainer.appendChild(likesLimitTitle);

  // Container para checkbox e input na mesma linha
  const likesLimitRow = document.createElement('div');
  likesLimitRow.style.display = 'flex';
  likesLimitRow.style.alignItems = 'center';
  likesLimitRow.style.gap = '10px';
  likesLimitContainer.appendChild(likesLimitRow);

  const enableLikesLimitCheckbox = document.createElement('input');
  enableLikesLimitCheckbox.type = 'checkbox';
  enableLikesLimitCheckbox.checked = likesLimitEnabled;

  // Texto dinâmico para o checkbox de limitador de likes
  const likesLimitStatusText = document.createElement('span');
  likesLimitStatusText.textContent = likesLimitEnabled ? 'Ativado' : 'Desativado';
  likesLimitStatusText.style.color = likesLimitEnabled ? '#4caf50' : '#f44336';
  likesLimitStatusText.style.fontWeight = 'bold';
  likesLimitStatusText.style.marginLeft = '5px';

  const likesLimitInput = document.createElement('input');
  likesLimitInput.type = 'number';
  likesLimitInput.min = '1';
  likesLimitInput.step = '1';
  likesLimitInput.value = (likesLimit !== null && likesLimit > 0) ? likesLimit : '';
  likesLimitInput.style.padding = '5px';
  likesLimitInput.style.borderRadius = '5px';
  likesLimitInput.style.border = '2px solid #ffcc00';
  likesLimitInput.style.boxSizing = 'border-box';
  likesLimitInput.style.width = '80px';
  likesLimitInput.placeholder = 'Limite';

  likesLimitRow.appendChild(enableLikesLimitCheckbox);
  likesLimitRow.appendChild(likesLimitStatusText);
  likesLimitRow.appendChild(likesLimitInput);

  // Botão para resetar contador
  const resetCounterButton = document.createElement('button');
  resetCounterButton.textContent = 'Resetar Contador';
  resetCounterButton.style.padding = '8px';
  resetCounterButton.style.borderRadius = '5px';
  resetCounterButton.style.cursor = 'pointer';
  resetCounterButton.style.backgroundColor = '#4a4a4a';
  resetCounterButton.style.color = 'white';
  resetCounterButton.style.border = 'none';
  likesLimitContainer.appendChild(resetCounterButton);

  // Event listeners para limite de likes
  enableLikesLimitCheckbox.addEventListener('change', () => {
    likesLimitEnabled = enableLikesLimitCheckbox.checked;
    localStorage.setItem('likesLimitEnabled', likesLimitEnabled);
    likesLimitInput.disabled = !likesLimitEnabled;

    // Atualizar texto dinâmico
    likesLimitStatusText.textContent = likesLimitEnabled ? 'Ativado' : 'Desativado';
    likesLimitStatusText.style.color = likesLimitEnabled ? '#4caf50' : '#f44336';

    if (likesLimitEnabled) {
      if (likesLimitInput.value) {
        likesLimit = parseInt(likesLimitInput.value);
        if (!isNaN(likesLimit) && likesLimit > 0) {
          localStorage.setItem('likesLimit', likesLimit);
        } else {
          likesLimit = null;
        }
      } else if (likesLimit !== null) {
        // Manter o limite já carregado se o input estiver vazio
        localStorage.setItem('likesLimit', likesLimit);
      }
    } else {
      // Não remover o limite do localStorage, apenas desativar
      // Isso permite reativar com o mesmo valor
    }
    updateLikeCounter();
  });

  likesLimitInput.addEventListener('input', () => {
    const value = parseInt(likesLimitInput.value);
    if (!isNaN(value) && value > 0) {
      likesLimit = value;
      if (likesLimitEnabled) {
        localStorage.setItem('likesLimit', likesLimit);
      }
    } else {
      likesLimit = null;
      if (likesLimitEnabled) {
        localStorage.removeItem('likesLimit');
      }
    }
    updateLikeCounter();
  });

  resetCounterButton.addEventListener('click', () => {
    likesCount = 0;
    updateLikeCounter();
    console.log('Contador resetado');
  });

  // Inicializar estado do input
  likesLimitInput.disabled = !likesLimitEnabled;

  // Seção de filtro por altura
  const heightFilterContainer = document.createElement('div');
  heightFilterContainer.style.backgroundColor = '#2a2a2a';
  heightFilterContainer.style.padding = '10px';
  heightFilterContainer.style.borderRadius = '8px';
  heightFilterContainer.style.border = '2px solid #ffcc00';
  heightFilterContainer.style.marginTop = '10px';
  heightFilterContainer.style.display = 'flex';
  heightFilterContainer.style.flexDirection = 'column';
  heightFilterContainer.style.gap = '10px';
  leftColumn.appendChild(heightFilterContainer);

  // Container para título e tooltip
  const heightFilterTitleRow = document.createElement('div');
  heightFilterTitleRow.style.display = 'flex';
  heightFilterTitleRow.style.alignItems = 'center';
  heightFilterTitleRow.style.gap = '8px';
  heightFilterTitleRow.style.marginBottom = '5px';

  const heightFilterTitle = document.createElement('div');
  heightFilterTitle.textContent = 'Limitador de Altura';
  heightFilterTitle.style.fontWeight = 'bold';
  heightFilterTitle.style.color = '#ffcc00';
  heightFilterTitleRow.appendChild(heightFilterTitle);

  // Ícone de interrogação para tooltip
  const tooltipIcon = document.createElement('div');
  tooltipIcon.textContent = '?';
  tooltipIcon.style.width = '20px';
  tooltipIcon.style.height = '20px';
  tooltipIcon.style.borderRadius = '50%';
  tooltipIcon.style.backgroundColor = '#ffcc00';
  tooltipIcon.style.color = '#000';
  tooltipIcon.style.display = 'flex';
  tooltipIcon.style.alignItems = 'center';
  tooltipIcon.style.justifyContent = 'center';
  tooltipIcon.style.fontSize = '12px';
  tooltipIcon.style.fontWeight = 'bold';
  tooltipIcon.style.cursor = 'help';
  tooltipIcon.style.position = 'relative';

  // Tooltip customizado
  const tooltip = document.createElement('div');
  tooltip.textContent = 'Como usar: Ative o limitador e defina a altura em cm. Escolha "Maior que" para dar dislike em pessoas acima da altura, ou "Menor que" para abaixo. Exemplo: Altura 170cm + "Maior que" = dislike em pessoas acima de 170cm.';
  tooltip.style.position = 'absolute';
  tooltip.style.bottom = '100%';
  tooltip.style.left = '50%';
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.width = '250px';
  tooltip.style.padding = '10px';
  tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
  tooltip.style.color = 'white';
  tooltip.style.borderRadius = '8px';
  tooltip.style.border = '2px solid #ffcc00';
  tooltip.style.fontSize = '12px';
  tooltip.style.lineHeight = '1.4';
  tooltip.style.zIndex = '10001';
  tooltip.style.opacity = '0';
  tooltip.style.visibility = 'hidden';
  tooltip.style.transition = 'opacity 0.3s, visibility 0.3s';
  tooltip.style.marginBottom = '5px';
  tooltip.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';

  // Seta do tooltip
  const tooltipArrow = document.createElement('div');
  tooltipArrow.style.position = 'absolute';
  tooltipArrow.style.bottom = '-8px';
  tooltipArrow.style.left = '50%';
  tooltipArrow.style.transform = 'translateX(-50%)';
  tooltipArrow.style.width = '0';
  tooltipArrow.style.height = '0';
  tooltipArrow.style.borderLeft = '8px solid transparent';
  tooltipArrow.style.borderRight = '8px solid transparent';
  tooltipArrow.style.borderTop = '8px solid #ffcc00';
  tooltip.appendChild(tooltipArrow);

  tooltipIcon.appendChild(tooltip);

  // Event listeners para mostrar/esconder tooltip
  tooltipIcon.addEventListener('mouseenter', () => {
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
  });

  tooltipIcon.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
  });

  heightFilterTitleRow.appendChild(tooltipIcon);
  heightFilterContainer.appendChild(heightFilterTitleRow);

  // Container para checkbox, input e select na mesma linha
  const heightFilterRow = document.createElement('div');
  heightFilterRow.style.display = 'flex';
  heightFilterRow.style.alignItems = 'center';
  heightFilterRow.style.gap = '10px';
  heightFilterContainer.appendChild(heightFilterRow);

  const enableHeightFilterCheckbox = document.createElement('input');
  enableHeightFilterCheckbox.type = 'checkbox';
  enableHeightFilterCheckbox.checked = heightFilterEnabled;

  // Texto dinâmico para o checkbox de limitador de altura
  const heightFilterStatusText = document.createElement('span');
  heightFilterStatusText.textContent = heightFilterEnabled ? 'Ativado' : 'Desativado';
  heightFilterStatusText.style.color = heightFilterEnabled ? '#4caf50' : '#f44336';
  heightFilterStatusText.style.fontWeight = 'bold';
  heightFilterStatusText.style.marginLeft = '5px';

  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.min = '100';
  heightInput.max = '250';
  heightInput.step = '1';
  heightInput.value = heightThreshold;
  heightInput.style.padding = '5px';
  heightInput.style.borderRadius = '5px';
  heightInput.style.border = '2px solid #ffcc00';
  heightInput.style.boxSizing = 'border-box';
  heightInput.style.width = '80px';
  heightInput.placeholder = 'Altura (cm)';

  const heightConditionSelect = document.createElement('select');
  heightConditionSelect.style.padding = '5px';
  heightConditionSelect.style.borderRadius = '5px';
  heightConditionSelect.style.width = '100px';

  const optionGreater = document.createElement('option');
  optionGreater.value = 'greater';
  optionGreater.textContent = 'Maior que';

  const optionLess = document.createElement('option');
  optionLess.value = 'less';
  optionLess.textContent = 'Menor que';

  heightConditionSelect.appendChild(optionGreater);
  heightConditionSelect.appendChild(optionLess);
  heightConditionSelect.value = heightCondition;

  heightFilterRow.appendChild(enableHeightFilterCheckbox);
  heightFilterRow.appendChild(heightFilterStatusText);
  heightFilterRow.appendChild(heightInput);
  heightFilterRow.appendChild(heightConditionSelect);

  // Event listeners para filtro de altura
  enableHeightFilterCheckbox.addEventListener('change', () => {
    heightFilterEnabled = enableHeightFilterCheckbox.checked;
    localStorage.setItem('heightFilterEnabled', heightFilterEnabled);

    // Atualizar texto dinâmico
    heightFilterStatusText.textContent = heightFilterEnabled ? 'Ativado' : 'Desativado';
    heightFilterStatusText.style.color = heightFilterEnabled ? '#4caf50' : '#f44336';

    // Ativar/desativar inputs
    heightInput.disabled = !heightFilterEnabled;
    heightConditionSelect.disabled = !heightFilterEnabled;
  });

  heightInput.addEventListener('input', () => {
    heightThreshold = parseInt(heightInput.value);
    localStorage.setItem('heightThreshold', heightThreshold);
  });

  heightConditionSelect.addEventListener('change', () => {
    heightCondition = heightConditionSelect.value;
    localStorage.setItem('heightCondition', heightCondition);
  });

  // Inicializar estado dos inputs
  heightInput.disabled = !heightFilterEnabled;
  heightConditionSelect.disabled = !heightFilterEnabled;

  pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Continuar' : 'Pausar';
    // Mudar cor dinamicamente: verde quando ativo, vermelho quando pausado
    if (isPaused) {
      pauseButton.style.backgroundColor = '#4caf50';
    } else {
      pauseButton.style.backgroundColor = '#f44336';
    }
  });

  // Criar container para informações (lado direito)
  const rightColumn = document.createElement('div');
  rightColumn.style.flex = '1';
  rightColumn.style.display = 'flex';
  rightColumn.style.flexDirection = 'column';
  rightColumn.style.gap = '10px';
  rightColumn.style.overflowY = 'auto';
  rightColumn.style.maxHeight = '100%';
  container.appendChild(rightColumn);

  // Container de Nome e Idade
  const nameAgeContainer = document.createElement('div');
  nameAgeContainer.style.padding = '10px';
  nameAgeContainer.style.backgroundColor = '#1c1c1c';
  nameAgeContainer.style.borderRadius = '8px';
  nameAgeContainer.style.color = '#ffcc00';
  nameAgeContainer.style.marginTop = '10px';
  nameAgeContainer.style.display = 'flex';
  nameAgeContainer.style.flexDirection = 'column';
  nameAgeContainer.style.gap = '5px';
  // Inicializar com valores do localStorage se existirem
  const initialName = currentProfileName || 'Não disponível';
  const initialAge = currentProfileAge || 'Não disponível';
  nameAgeContainer.textContent = `Nome: ${initialName}, Idade: ${initialAge}`;
  rightColumn.appendChild(nameAgeContainer);

  // Criação do contêiner de informações do perfil
  const profileInfoContainer = document.createElement('div');
  profileInfoContainer.style.padding = '10px';
  profileInfoContainer.style.backgroundColor = '#1c1c1c';
  profileInfoContainer.style.borderRadius = '8px';
  profileInfoContainer.style.color = '#ffcc00';
  profileInfoContainer.style.marginTop = '10px';
  profileInfoContainer.style.display = 'flex';
  profileInfoContainer.style.flexDirection = 'column';
  profileInfoContainer.style.gap = '5px';
  rightColumn.appendChild(profileInfoContainer);

  // Função para criar cada linha de informação
  function createInfoRow(label, value) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label + ':';
    labelSpan.style.fontWeight = 'bold';

    const valueSpan = document.createElement('span');
    valueSpan.textContent = value;

    row.appendChild(labelSpan);
    row.appendChild(valueSpan);

    return row;
  }

  // Função de extração das informações
  function extractProfileInfo() {
    const profileContainer = document.querySelector(
      '.Bgc\\(--color--background-sparks-profile\\)'
    );

    if (!profileContainer) {
      return null;
    }

    const profileInfo = {};

    // Método 1: Procurar por todos os itens de informação básica
    const infoSection = profileContainer.querySelector('section[aria-labelledby]');
    if (infoSection) {
      const listItems = infoSection.querySelectorAll('li');
      listItems.forEach((item, index) => {
        const svg = item.querySelector('svg');
        const textDiv = item.querySelector('.Typs\\(body-1-regular\\)');

        if (svg && textDiv) {
          const svgPath = svg.querySelector('path');
          if (svgPath) {
            const pathD = svgPath.getAttribute('d') || '';
            const text = textDiv.textContent.trim();

            // Identificar pelo caminho do SVG
            if (pathD.includes('M12.301')) {
              // Ícone de localização/distância
              if (text.includes('quilômetros') || text.includes('km')) {
                profileInfo.distance = text;
              }
            } else if (pathD.includes('M16.95')) {
              // Ícone de altura (o que você mostrou)
              profileInfo.height = text;
            } else if (pathD.includes('M16.995')) {
              // Ícone de profissão
              profileInfo.profession = text;
            } else if (pathD.includes('M12.225')) {
              // Ícone de pronomes
              profileInfo.genderPronoun = text;
            } else if (pathD.includes('M22.757')) {
              // Ícone de idiomas
              profileInfo.languages = text;
            }
          }
        }
      });
    }

    // Método 2: Procurar texto "cm" em qualquer lugar
    if (!profileInfo.height) {
      const allElements = profileContainer.querySelectorAll('*');
      for (const element of allElements) {
        const text = element.textContent.trim();
        if (text && text.includes('cm') && text.match(/\d+\s*cm/)) {
          // Encontrar o padrão "158 cm"
          const heightMatch = text.match(/(\d+)\s*cm/);
          if (heightMatch) {
            profileInfo.height = heightMatch[0]; // "158 cm"
            break;
          }
        }
      }
    }

    // Método 3: Procurar por divs específicas que contêm altura
    if (!profileInfo.height) {
      const allDivs = profileContainer.querySelectorAll('div');
      for (const div of allDivs) {
        const text = div.textContent.trim();
        // Procurar por padrões de altura
        if (text.match(/^\d+\s*cm$/)) {
          profileInfo.height = text;
          break;
        }
      }
    }

    // Método 4: Procurar por todas as informações básicas em linhas
    const allSpans = profileContainer.querySelectorAll('span');
    for (const span of allSpans) {
      const parentText = span.parentElement?.textContent || '';
      if (parentText.includes('Altura') || parentText.includes('altura')) {
        const heightMatch = parentText.match(/(\d+)\s*cm/);
        if (heightMatch) {
          profileInfo.height = heightMatch[0];
          break;
        }
      }
    }

    // Extrair outras informações se necessário
    if (!profileInfo.distance) {
      const distanceElements = profileContainer.querySelectorAll('*');
      for (const element of distanceElements) {
        const text = element.textContent.trim();
        if (text.includes('quilômetros') || text.includes('km')) {
          profileInfo.distance = text;
          break;
        }
      }
    }

    // Extrair profissão se disponível
    if (!profileInfo.profession) {
      const professionElements = profileContainer.querySelectorAll('*');
      for (const element of professionElements) {
        const text = element.textContent.trim();
        if (text.toLowerCase().includes('profiss') && text.length < 100) {
          profileInfo.profession = text;
          break;
        }
      }
    }

    return profileInfo;
  }

  // Função para extrair nome e idade do perfil
  function extractNameAndAge() {
    let name = 'Não disponível';
    let age = 'Não disponível';

    // Método 1 (PRIMÁRIO): Buscar usando itemprop="name" e itemprop="age"
    // Buscar no card principal da tela (antes de abrir o perfil)
    // Tentar múltiplos seletores para garantir que encontre
    const nameElement = document.querySelector('span[itemprop="name"]') ||
                        document.querySelector('[itemprop="name"]') ||
                        document.querySelector('span.Typs\\(display-1-strong\\)[itemprop="name"]');
    const ageElement = document.querySelector('span[itemprop="age"]') ||
                       document.querySelector('[itemprop="age"]') ||
                       document.querySelector('span[itemprop="age"].As\\(b\\)');

    if (nameElement) {
      name = nameElement.textContent.trim();
    }
    if (ageElement) {
      age = ageElement.textContent.trim();
    }

    // Se não encontrou no card principal, buscar no perfil aberto
    if (name === 'Não disponível' || age === 'Não disponível') {
      const profileContainer = document.querySelector(
        '.Bgc\\(--color--background-sparks-profile\\)'
      );

      if (profileContainer) {
        const profileNameElement = profileContainer.querySelector('span[itemprop="name"], [itemprop="name"]');
        const profileAgeElement = profileContainer.querySelector('span[itemprop="age"], [itemprop="age"]');

        if (profileNameElement && name === 'Não disponível') {
          name = profileNameElement.textContent.trim();
        }
        if (profileAgeElement && age === 'Não disponível') {
          age = profileAgeElement.textContent.trim();
        }
      }
    }

    // Método 2 (FALLBACK): Procurar por h1 ou h2 que contém nome e idade
    if (name === 'Não disponível' || age === 'Não disponível') {
      const profileContainer = document.querySelector(
        '.Bgc\\(--color--background-sparks-profile\\)'
      );

      if (profileContainer) {
        const headers = profileContainer.querySelectorAll('h1, h2');
        for (const header of headers) {
          const text = header.textContent.trim();
          // Padrão comum: "Nome, Idade" ou "Nome Idade"
          const nameAgeMatch = text.match(/^(.+?),\s*(\d+)$/);
          if (nameAgeMatch) {
            if (name === 'Não disponível') name = nameAgeMatch[1].trim();
            if (age === 'Não disponível') age = nameAgeMatch[2].trim();
            break;
          }
          // Padrão alternativo: "Nome Idade" (sem vírgula)
          const nameAgeMatch2 = text.match(/^(.+?)\s+(\d+)$/);
          if (nameAgeMatch2 && nameAgeMatch2[2].length <= 3) {
            if (name === 'Não disponível') name = nameAgeMatch2[1].trim();
            if (age === 'Não disponível') age = nameAgeMatch2[2].trim();
            break;
          }
        }
      }
    }

    // Método 3 (FALLBACK): Buscar no card principal usando padrões de texto
    if (name === 'Não disponível' || age === 'Não disponível') {
      const cardElements = document.querySelectorAll('h1, h2, [class*="card"]');
      for (const element of cardElements) {
        const text = element.textContent.trim();
        const nameAgeMatch = text.match(/^(.+?),\s*(\d+)$/);
        if (nameAgeMatch && nameAgeMatch[1].length > 1 && nameAgeMatch[1].length < 50) {
          if (name === 'Não disponível') name = nameAgeMatch[1].trim();
          if (age === 'Não disponível') age = nameAgeMatch[2].trim();
          break;
        }
      }
    }

    return { name, age };
  }

  // Função para extrair nome e idade APENAS do perfil aberto (ignora card principal)
  function extractNameAndAgeFromOpenProfile() {
    let name = 'Não disponível';
    let age = 'Não disponível';

    // Buscar APENAS no perfil aberto (profileContainer)
    const profileContainer = document.querySelector(
      '.Bgc\\(--color--background-sparks-profile\\)'
    );

    // Método 1 (PRIORITÁRIO): Buscar pelo padrão específico do perfil aberto
    // h1 com aria-label="Nome X anos" ou spans dentro do h1
    let h1WithAriaLabel = null;

    // Primeiro tentar buscar dentro do profileContainer
    if (profileContainer) {
      h1WithAriaLabel = profileContainer.querySelector('h1[aria-label]');
    }

    // Se não encontrou no container, buscar diretamente no documento
    // (pode acontecer se o container não for encontrado ou o h1 estiver fora dele)
    if (!h1WithAriaLabel) {
      h1WithAriaLabel = document.querySelector('h1[aria-label]');
    }

    if (h1WithAriaLabel) {
      // Sempre tentar extrair dos spans primeiro (mais confiável)
      const spansInH1 = h1WithAriaLabel.querySelectorAll('span');
      if (spansInH1.length >= 2) {
        // Primeiro span geralmente tem o nome
        const nameSpan = spansInH1[0];
        const nameText = nameSpan ? nameSpan.textContent.trim() : '';
        if (nameText && nameText.length > 0 && name === 'Não disponível') {
          name = nameText;
        }
        // Segundo span geralmente tem a idade
        const ageSpan = spansInH1[1];
        const ageText = ageSpan ? ageSpan.textContent.trim() : '';
        if (ageText && ageText.length > 0 && /^\d+$/.test(ageText) && age === 'Não disponível') {
          age = ageText;
        }
      }

      // Se ainda não encontrou, tentar pelo aria-label
      if (name === 'Não disponível' || age === 'Não disponível') {
        const ariaLabel = h1WithAriaLabel.getAttribute('aria-label');
        if (ariaLabel) {
          // Padrão: "Nome X anos" ou "Nome X anos" (com "anos")
          const ariaMatch = ariaLabel.match(/^(.+?)\s+(\d+)\s+anos?$/i);
          if (ariaMatch) {
            if (name === 'Não disponível') name = ariaMatch[1].trim();
            if (age === 'Não disponível') age = ariaMatch[2].trim();
          } else {
            // Tentar extrair do aria-label sem "anos": "Nome X"
            const ariaMatch2 = ariaLabel.match(/^(.+?)\s+(\d+)$/);
            if (ariaMatch2) {
              if (name === 'Não disponível') name = ariaMatch2[1].trim();
              if (age === 'Não disponível') age = ariaMatch2[2].trim();
            }
          }
        }
      }
    }

    // Método 2: Buscar usando itemprop="name" e itemprop="age" dentro do profileContainer
    if ((name === 'Não disponível' || age === 'Não disponível') && profileContainer) {
      const profileNameElement = profileContainer.querySelector('span[itemprop="name"], [itemprop="name"]');
      const profileAgeElement = profileContainer.querySelector('span[itemprop="age"], [itemprop="age"]');

      if (profileNameElement && name === 'Não disponível') {
        name = profileNameElement.textContent.trim();
      }
      if (profileAgeElement && age === 'Não disponível') {
        age = profileAgeElement.textContent.trim();
      }
    }

    // Método 3: Procurar por h1 ou h2 que contém nome e idade dentro do profileContainer
    if ((name === 'Não disponível' || age === 'Não disponível') && profileContainer) {
      const headers = profileContainer.querySelectorAll('h1, h2');
      for (const header of headers) {
        const text = header.textContent.trim();
        // Padrão comum: "Nome, Idade" ou "Nome Idade"
        const nameAgeMatch = text.match(/^(.+?),\s*(\d+)$/);
        if (nameAgeMatch) {
          if (name === 'Não disponível') name = nameAgeMatch[1].trim();
          if (age === 'Não disponível') age = nameAgeMatch[2].trim();
          break;
        }
        // Padrão alternativo: "Nome Idade" (sem vírgula)
        const nameAgeMatch2 = text.match(/^(.+?)\s+(\d+)$/);
        if (nameAgeMatch2 && nameAgeMatch2[2].length <= 3) {
          if (name === 'Não disponível') name = nameAgeMatch2[1].trim();
          if (age === 'Não disponível') age = nameAgeMatch2[2].trim();
          break;
        }
      }
    }

    // Método 4: Buscar em spans dentro do profileContainer
    if (name === 'Não disponível' || age === 'Não disponível') {
      const allSpans = profileContainer.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent.trim();
        const nameAgeMatch = text.match(/^(.+?),\s*(\d+)$/);
        if (nameAgeMatch && nameAgeMatch[1].length > 1 && nameAgeMatch[1].length < 50) {
          if (name === 'Não disponível') name = nameAgeMatch[1].trim();
          if (age === 'Não disponível') age = nameAgeMatch[2].trim();
          break;
        }
      }
    }

    return { name, age };
  }

  // Função helper para capturar nome e idade do perfil aberto atual
  function getCurrentProfileNameAndAge() {
    try {
      const nameAndAge = extractNameAndAge();
      return {
        name: nameAndAge?.name || 'Não disponível',
        age: nameAndAge?.age || 'Não disponível'
      };
    } catch (error) {
      console.error('Erro ao capturar nome e idade do perfil:', error);
      return {
        name: 'Não disponível',
        age: 'Não disponível'
      };
    }
  }

  // Função para converter altura para cm (aceita "1,70 m" e "188 cm")
  function convertHeightToCm(heightString) {
    if (!heightString || heightString === 'Não informado') {
      return null;
    }

    try {
      // Limpar espaços extras e converter para minúsculas
      const cleaned = heightString.trim().toLowerCase();

      // Se já estiver em cm (ex: "188 cm")
      if (cleaned.includes('cm')) {
        const cmMatch = cleaned.match(/(\d+)\s*cm/);
        if (cmMatch && cmMatch[1]) {
          const result = parseInt(cmMatch[1]);
          return result;
        }
      }

      // Se estiver em metros (ex: "1,70 m" ou "1.70 m")
      if (cleaned.includes('m') && (cleaned.includes(',') || cleaned.includes('.'))) {
        // Remover "m" e substituir vírgula por ponto
        const metersStr = cleaned.replace('m', '').replace(',', '.').trim();
        const meters = parseFloat(metersStr);

        if (!isNaN(meters)) {
          // Converter para cm
          const result = Math.round(meters * 100);
          return result;
        }
      }

      // Se tiver apenas número
      const numberMatch = cleaned.match(/(\d+)/);
      if (numberMatch && numberMatch[1]) {
        const num = parseInt(numberMatch[1]);
        // Se o número for maior que 100, provavelmente já está em cm
        // Se for menor que 3, provavelmente está em metros
        if (num > 100) {
          return num; // Já está em cm
        } else if (num < 3) {
          const result = Math.round(num * 100);
          return result; // Converte metros para cm
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao converter altura:', error);
      return null;
    }
  }

  // Função para verificar filtro de altura
  function checkHeightFilter(profileHeight) {
    if (!heightFilterEnabled || !profileHeight) {
      return { shouldDislike: false, reason: null };
    }

    const heightInCm = convertHeightToCm(profileHeight);

    if (heightInCm === null) {
      return { shouldDislike: false, reason: null };
    }

    let shouldDislike = false;
    let reason = '';

    if (heightCondition === 'greater') {
      if (heightInCm > heightThreshold) {
        shouldDislike = true;
        reason = `Altura maior que ${heightThreshold}cm (${profileHeight})`;
      }
    } else if (heightCondition === 'less') {
      if (heightInCm < heightThreshold) {
        shouldDislike = true;
        reason = `Altura menor que ${heightThreshold}cm (${profileHeight})`;
      }
    }

    return { shouldDislike, reason };
  }

  const profileInfo = document.createElement('div');
  profileInfo.style.padding = '10px';
  profileInfo.style.backgroundColor = '#1c1c1c';
  profileInfo.style.borderRadius = '8px';
  profileInfo.style.color = '#ffcc00';
  profileInfo.textContent = 'Sobre mim: Não disponível';
  rightColumn.appendChild(profileInfo);

  // Card de último dislike dentro do modal
  const lastDislikeCard = document.createElement('div');
  lastDislikeCard.id = 'autoswipe-last-dislike-card';
  lastDislikeCard.style.width = '100%';
  lastDislikeCard.style.backgroundColor = 'rgba(139, 0, 0, 0.95)';
  lastDislikeCard.style.color = 'white';
  lastDislikeCard.style.padding = '15px';
  lastDislikeCard.style.borderRadius = '8px';
  lastDislikeCard.style.fontFamily = 'Arial, sans-serif';
  lastDislikeCard.style.fontSize = '13px';
  lastDislikeCard.style.display = 'none';
  lastDislikeCard.style.border = '2px solid #f44336';
  lastDislikeCard.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
  lastDislikeCard.style.marginTop = '10px';
  rightColumn.appendChild(lastDislikeCard);

  function updateLikeCounter() {
    if (likesLimitEnabled && likesLimit !== null) {
      likeCounter.textContent = `Likes: ${likesCount}/${likesLimit}`;
      // Destacar quando próximo do limite (80% ou mais)
      if (likesCount >= likesLimit * 0.8) {
        likeCounter.style.color = '#ffcc00';
        if (likesCount >= likesLimit) {
          likeCounter.style.color = '#ff6b6b';
        }
      } else {
        likeCounter.style.color = '#4caf50';
      }
    } else {
      likeCounter.textContent = `Likes: ${likesCount}`;
      likeCounter.style.color = '#4caf50';
    }
  }

  function updateDislikeCounter() {
    dislikeCounter.textContent = `Dislikes: ${dislikesCount}`;
    dislikeCounter.style.color = '#f44336';
  }

  function updateProfileInfo(text) {
    const extractedInfo = extractProfileInfo();

    if (!extractedInfo) {
      return;
    }

    // Limpa o contêiner antes de atualizar
    profileInfoContainer.innerHTML = '';

    // Adiciona as informações capturadas
    let hasInfo = false;

    if (extractedInfo.distance) {
      profileInfoContainer.appendChild(createInfoRow('Distância', extractedInfo.distance));
      hasInfo = true;
    }
    if (extractedInfo.height) {
      profileInfoContainer.appendChild(createInfoRow('Altura', extractedInfo.height));
      hasInfo = true;
    }
    if (extractedInfo.profession) {
      profileInfoContainer.appendChild(createInfoRow('Profissão', extractedInfo.profession));
      hasInfo = true;
    }
    if (extractedInfo.genderPronoun) {
      profileInfoContainer.appendChild(createInfoRow('Pronomes', extractedInfo.genderPronoun));
      hasInfo = true;
    }
    if (extractedInfo.languages) {
      profileInfoContainer.appendChild(createInfoRow('Idiomas', extractedInfo.languages));
      hasInfo = true;
    }

    // Se nenhuma informação foi encontrada, mostrar mensagem
    if (!hasInfo) {
      const noInfo = document.createElement('div');
      noInfo.textContent = 'Nenhuma informação extraída';
      noInfo.style.color = '#ff6b6b';
      profileInfoContainer.appendChild(noInfo);
    }

    // Atualiza a seção "Sobre mim"
    const aboutMeText = text || 'Não disponível';
    profileInfo.textContent = `Sobre mim: ${aboutMeText}`;

    // Destacar se é muito curto
    if (aboutMeText.length < 10 && aboutMeText !== 'Não disponível') {
      profileInfo.style.color = '#ff6b6b';
    } else {
      profileInfo.style.color = '#ffcc00';
    }

    // Atualizar container de Nome e Idade
    const name = currentProfileName || 'Não disponível';
    const age = currentProfileAge || 'Não disponível';
    nameAgeContainer.textContent = `Nome: ${name}, Idade: ${age}`;
  }

  // Função para atualizar apenas o nome e idade
  function updateNameAge() {
    const name = currentProfileName || 'Não disponível';
    const age = currentProfileAge || 'Não disponível';
    nameAgeContainer.textContent = `Nome: ${name}, Idade: ${age}`;
  }

  function updateLastDislikeCard() {
    // Garantir que o card esteja no DOM (dentro do container)
    let card = document.getElementById('autoswipe-last-dislike-card');
    if (!card) {
      // Se o card não existir, usar a referência global
      card = lastDislikeCard;
      // Se o card não estiver no container, adicioná-lo
      if (container && !container.contains(card)) {
        container.appendChild(card);
      }
    }

    if (!lastDislikeTimestamp) {
      if (card) {
        card.style.display = 'none';
      }
      return;
    }

    // Log de debug
    console.log('Atualizando card de último dislike:', {
      timestamp: lastDislikeTimestamp,
      name: lastDislikeProfileName,
      age: lastDislikeProfileAge,
      reason: lastDislikeReason,
      likesCount: lastDislikeLikesCount,
      currentLikes: likesCount
    });

    // Calcular minutos atrás
    const now = new Date();
    const diffMs = now - lastDislikeTimestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    const minutesText = diffMinutes === 0 ? 'menos de 1 minuto' :
                        diffMinutes === 1 ? '1 minuto' :
                        `${diffMinutes} minutos`;

    // Calcular likes atrás
    const likesSinceDislike = likesCount - lastDislikeLikesCount;
    const likesText = likesSinceDislike === 0 ? '0 likes' :
                      likesSinceDislike === 1 ? '1 like' :
                      `${likesSinceDislike} likes`;

    // Montar conteúdo do card
    const nameAgeText = lastDislikeProfileName && lastDislikeProfileAge ?
                       `${lastDislikeProfileName}, ${lastDislikeProfileAge}` :
                       (lastDislikeProfileName || 'Nome não disponível');

    const reasonText = lastDislikeReason || 'Não especificado';

    // Atualizar conteúdo do card
    if (card) {
      card.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px; color: #ffcc00; font-size: 14px;">
          Último Dislike Registrado em:
        </div>
        <div style="margin-bottom: 8px; font-weight: bold; font-size: 15px;">
          ${nameAgeText}
        </div>
        <div style="margin-bottom: 8px;">
          Motivo: ${reasonText}
        </div>
        <div style="margin-bottom: 5px; color: #4caf50;">
          ${likesText} atrás
        </div>
        <div style="color: #4caf50;">
          ${minutesText} atrás
        </div>
      `;

      // Garantir que o card seja exibido
      card.style.display = 'block';
      card.style.visibility = 'visible';
      card.style.opacity = '1';

      // Forçar reflow para garantir que o estilo seja aplicado
      card.offsetHeight;

      console.log('Card de último dislike atualizado e exibido');
    } else {
      console.error('Card de último dislike não encontrado no DOM');
      // Tentar recriar o card dentro do container se não estiver no DOM
      if (container) {
        const newCard = document.createElement('div');
        newCard.id = 'autoswipe-last-dislike-card';
        newCard.style.width = '100%';
        newCard.style.backgroundColor = 'rgba(139, 0, 0, 0.95)';
        newCard.style.color = 'white';
        newCard.style.padding = '15px';
        newCard.style.borderRadius = '8px';
        newCard.style.fontFamily = 'Arial, sans-serif';
        newCard.style.fontSize = '13px';
        newCard.style.border = '2px solid #f44336';
        newCard.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        newCard.style.marginTop = '10px';
        container.appendChild(newCard);
        // Atualizar novamente com o novo card
        setTimeout(() => updateLastDislikeCard(), 50);
      }
    }
  }

  function showLimitReachedPopup() {
    // Criar popup
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '10000';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    popup.style.color = 'white';
    popup.style.padding = '30px';
    popup.style.borderRadius = '15px';
    popup.style.border = '3px solid #ffcc00';
    popup.style.boxShadow = '0 0 30px rgba(255, 204, 0, 0.5)';
    popup.style.fontFamily = 'Arial, sans-serif';
    popup.style.textAlign = 'center';
    popup.style.minWidth = '300px';
    popup.style.maxWidth = '500px';

    const title = document.createElement('div');
    title.textContent = 'Limite de Likes Atingido!';
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.color = '#ffcc00';
    title.style.marginBottom = '20px';

    const message = document.createElement('div');
    message.textContent = `O sistema parou pois atingiu o limite de ${likesLimit} likes.`;
    message.style.fontSize = '16px';
    message.style.marginBottom = '20px';
    message.style.lineHeight = '1.5';

    const info = document.createElement('div');
    info.textContent = `Você pode resetar o contador de likes clicando no botão "Resetar Contador" abaixo.`;
    info.style.fontSize = '14px';
    info.style.color = '#cccccc';
    info.style.marginBottom = '25px';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.style.padding = '12px 30px';
    closeButton.style.borderRadius = '8px';
    closeButton.style.backgroundColor = '#ffcc00';
    closeButton.style.color = 'black';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.fontWeight = 'bold';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(popup);
    });

    popup.appendChild(title);
    popup.appendChild(message);
    popup.appendChild(info);
    popup.appendChild(closeButton);

    document.body.appendChild(popup);

    // Fechar automaticamente após 10 segundos
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 10000);
  }

  function findLikeButton() {
    return document.querySelector(
      '.gamepad-button-wrapper .button.Bgc\\(\\$c-ds-background-gamepad-sparks-like-default\\)'
    );
  }

  function findDislikeButton() {
    return document.querySelector(
      '.gamepad-button-wrapper .button.Bgc\\(\\$c-ds-background-gamepad-sparks-nope-default\\)'
    );
  }

  function findProfileButton() {
    // Tentar múltiplos seletores para encontrar o botão de abrir perfil
    const selectors = [
      'div.P\\(0\\).Trsdu\\(\\$normal\\).Sq\\(28px\\)',
      'div[class*="Sq(28px)"]',
      'div[class*="P(0)"]',
      'div[class*="Trsdu($normal)"]',
      'div.Sq\\(28px\\)'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    // Tentar encontrar pelo texto "Abrir perfil" no span
    const spans = Array.from(document.querySelectorAll('span'));
    const profileSpan = spans.find(span => span.textContent.includes('Abrir perfil'));

    if (profileSpan) {
      // Subir até o elemento pai que é o div clicável
      let parent = profileSpan.parentElement;
      while (parent && !parent.classList.contains('Sq(28px)')) {
        parent = parent.parentElement;
      }
      return parent;
    }

    return null;
  }

  function findProfileInfo() {
    // Método 1: Buscar pelo título "Sobre mim" em h2
    const headers = Array.from(document.querySelectorAll('h2'));
    for (const header of headers) {
      if (header.textContent.includes('Sobre mim')) {
        // Encontrar o conteúdo após o h2
        let currentElement = header.parentElement;
        while (currentElement && !currentElement.querySelector('.Typs\\(body-1-regular\\)')) {
          currentElement = currentElement.nextElementSibling || currentElement.parentElement.nextElementSibling;
        }

        if (currentElement) {
          const contentDiv = currentElement.querySelector('.Typs\\(body-1-regular\\)');
          if (contentDiv) {
            return contentDiv.textContent.trim();
          }
        }
      }
    }

    // Método 2: Buscar por qualquer div com classe Typs(body-1-regular) que esteja perto de um h2 "Sobre mim"
    const allContentDivs = document.querySelectorAll('.Typs\\(body-1-regular\\)');
    for (const contentDiv of allContentDivs) {
      // Verificar se há um h2 "Sobre mim" próximo
      let parent = contentDiv.parentElement;
      while (parent) {
        const h2 = parent.querySelector('h2');
        if (h2 && h2.textContent.includes('Sobre mim')) {
          return contentDiv.textContent.trim();
        }
        parent = parent.parentElement;
      }
    }

    return 'Não disponível';
  }

  async function autoAction() {
    if (isPaused) return;

    // VERIFICAR LIMITE DE LIKES ANTES DE ABRIR PERFIL
    if (likesLimitEnabled && likesLimit !== null && likesCount >= likesLimit) {
      isPaused = true;
      pauseButton.textContent = 'Continuar';
      pauseButton.style.backgroundColor = '#4caf50';
      showLimitReachedPopup();
      console.log(`Limite de likes atingido: ${likesCount}/${likesLimit}`);
      return;
    }

    const profileButton = findProfileButton();

    // Capturar nome e idade do card principal ANTES de abrir o perfil (apenas se houver perfil)
    if (profileButton) {
      try {
        const nameAndAge = extractNameAndAge();
        if (nameAndAge && nameAndAge.name !== 'Não disponível') {
          currentProfileName = nameAndAge.name;
          localStorage.setItem('currentProfileName', currentProfileName);
        }
        if (nameAndAge && nameAndAge.age !== 'Não disponível') {
          currentProfileAge = nameAndAge.age;
          localStorage.setItem('currentProfileAge', currentProfileAge);
        }
      } catch (error) {
        console.error('Erro ao capturar nome e idade:', error);
      }
    }

    if (profileButton) {
      try {
        // 1. Clicar para abrir o perfil
        profileButton.click();

        // 2. Esperar o perfil carregar
        await new Promise((resolve) => setTimeout(resolve, profileOpenWait));
        if (isPaused) return;

        // 3. Se não capturou nome/idade antes, tentar capturar agora do perfil aberto
        if (!currentProfileName || !currentProfileAge || currentProfileName === 'Não disponível' || currentProfileAge === 'Não disponível') {
          try {
            const nameAndAgeFromProfile = extractNameAndAge();
            if (nameAndAgeFromProfile && nameAndAgeFromProfile.name !== 'Não disponível') {
              currentProfileName = nameAndAgeFromProfile.name;
              localStorage.setItem('currentProfileName', currentProfileName);
              updateNameAge();
            }
            if (nameAndAgeFromProfile && nameAndAgeFromProfile.age !== 'Não disponível') {
              currentProfileAge = nameAndAgeFromProfile.age;
              localStorage.setItem('currentProfileAge', currentProfileAge);
              updateNameAge();
            }
          } catch (error) {
            console.error('Erro ao capturar nome e idade do perfil:', error);
          }
        }

        // 4. Extrair informações do perfil
        const aboutText = findProfileInfo();

        // 4. Atualizar informações no painel
        updateProfileInfo(aboutText);

        // 5. Extrair todas as informações do perfil para filtros
        const profileContainer = document.querySelector(
          '.Bgc\\(--color--background-sparks-profile\\)'
        );

        let profileText = '';
        if (profileContainer) {
          profileText = Array.from(profileContainer.querySelectorAll('*'))
            .map((element) => element.textContent.trim())
            .filter((text) => text.length > 0)
            .join('\n');
        }

        const profileInfo = extractProfileInfo();

        // 6. VERIFICAR PALAVRAS PROIBIDAS
        let forbiddenWordFound = false;
        for (const word of forbiddenWords) {
          if (profileText.toLowerCase().includes(word.toLowerCase())) {
            forbiddenWordFound = true;
            const dislikeButton = findDislikeButton();
            if (dislikeButton) {
              // Capturar nome e idade DIRETAMENTE do perfil aberto no último momento, antes de dar o dislike
              const nameAndAgeFromOpenProfile = extractNameAndAgeFromOpenProfile();
              lastDislikeProfileName = nameAndAgeFromOpenProfile.name !== 'Não disponível' ? String(nameAndAgeFromOpenProfile.name) : 'Não disponível';
              lastDislikeProfileAge = nameAndAgeFromOpenProfile.age !== 'Não disponível' ? String(nameAndAgeFromOpenProfile.age) : 'Não disponível';
              localStorage.setItem('lastDislikeProfileName', lastDislikeProfileName);
              localStorage.setItem('lastDislikeProfileAge', lastDislikeProfileAge);
              lastDislikeReason = `Palavra proibida: "${word}"`;
              lastDislikeTimestamp = new Date();
              lastDislikeLikesCount = likesCount;

              // Agora dar o dislike
              dislikeButton.click();
              dislikesCount++;
              updateDislikeCounter();

              console.log('Dislike registrado:', {
                timestamp: lastDislikeTimestamp,
                name: lastDislikeProfileName,
                age: lastDislikeProfileAge,
                reason: lastDislikeReason,
                likesCount: lastDislikeLikesCount
              });

              // Atualizar card de último dislike (com pequeno delay para garantir DOM)
              setTimeout(() => {
                updateLastDislikeCard();
              }, 100);

              console.log(`Dislike: ${word} - ${lastDislikeProfileName}, ${lastDislikeProfileAge} anos`);
              // Esperar antes de continuar
              await new Promise((resolve) => setTimeout(resolve, interval));
              if (isPaused) return;
              return;
            }
          }
        }

        // 7. VERIFICAR FILTRO DE ALTURA
        if (profileInfo && profileInfo.height) {
          const heightCheck = checkHeightFilter(profileInfo.height);

          if (heightCheck.shouldDislike) {
            const dislikeButton = findDislikeButton();
            if (dislikeButton) {
              // Capturar nome e idade DIRETAMENTE do perfil aberto no último momento, antes de dar o dislike
              const nameAndAgeFromOpenProfile = extractNameAndAgeFromOpenProfile();
              lastDislikeProfileName = nameAndAgeFromOpenProfile.name !== 'Não disponível' ? String(nameAndAgeFromOpenProfile.name) : 'Não disponível';
              lastDislikeProfileAge = nameAndAgeFromOpenProfile.age !== 'Não disponível' ? String(nameAndAgeFromOpenProfile.age) : 'Não disponível';
              localStorage.setItem('lastDislikeProfileName', lastDislikeProfileName);
              localStorage.setItem('lastDislikeProfileAge', lastDislikeProfileAge);
              lastDislikeReason = heightCheck.reason;
              lastDislikeTimestamp = new Date();
              lastDislikeLikesCount = likesCount;

              // Agora dar o dislike
              dislikeButton.click();
              dislikesCount++;
              updateDislikeCounter();

              console.log('Dislike registrado:', {
                timestamp: lastDislikeTimestamp,
                name: lastDislikeProfileName,
                age: lastDislikeProfileAge,
                reason: lastDislikeReason,
                likesCount: lastDislikeLikesCount
              });

              // Atualizar card de último dislike (com pequeno delay para garantir DOM)
              setTimeout(() => {
                updateLastDislikeCard();
              }, 100);

              console.log(`Dislike: ${heightCheck.reason} - ${lastDislikeProfileName}, ${lastDislikeProfileAge} anos`);
              const delay = interval;
              await new Promise((resolve) => setTimeout(resolve, delay));
              if (isPaused) return;
              return;
            }
          }
        }

        // 8. SE NÃO HOUVE FILTROS, DAR LIKE
        const likeButton = findLikeButton();
        if (likeButton) {
          likeButton.click();
          likesCount++;
          updateLikeCounter();
          console.log(`Like: ${likesCount}${likesLimitEnabled && likesLimit !== null ? `/${likesLimit}` : ''}`);
        }

        // 10. Esperar o intervalo antes de próxima ação
        await new Promise((resolve) => setTimeout(resolve, interval));

      } catch (error) {
        console.error('Erro ao processar perfil:', error);
      }
    } else {
      // Tentar like mesmo sem abrir perfil (se configurado)
      const likeButton = findLikeButton();
      if (likeButton) {
        likeButton.click();
        likesCount++;
        updateLikeCounter();
        console.log(`Like: ${likesCount}${likesLimitEnabled && likesLimit !== null ? `/${likesLimit}` : ''}`);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  async function main() {
    console.log('AutoSwipe iniciado');

    // Atualizar card de último dislike a cada 10 segundos
    setInterval(() => {
      if (lastDislikeTimestamp) {
        updateLastDislikeCard();
      }
    }, 10000);

    while (true) {
      if (!isPaused) {
        await autoAction();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Aguardar brevemente enquanto pausado
      }
    }
  }

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  container.addEventListener('mousedown', function (e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    isDragging = true;
    offsetX = e.clientX - container.getBoundingClientRect().left;
    offsetY = e.clientY - container.getBoundingClientRect().top;
    container.style.cursor = 'move';
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    container.style.left = (e.clientX - offsetX) + 'px';
    container.style.top = (e.clientY - offsetY) + 'px';
    container.style.right = 'auto';
    container.style.position = 'fixed';
  });

  document.addEventListener('mouseup', function () {
    if (isDragging) {
      // Salvar posição atual do modal no localStorage
      const rect = container.getBoundingClientRect();
      localStorage.setItem('modalPositionLeft', rect.left.toString());
      localStorage.setItem('modalPositionTop', rect.top.toString());
    }
    isDragging = false;
    container.style.cursor = 'default';
  });

  main();
})();