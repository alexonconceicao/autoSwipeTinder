// ==UserScript==
// @name         Auto Liker for Tinder (AutoSwipe)
// @name:pt      Auto Liker para Tinder (AutoSwipe)
// @name:pt-BR   Auto Liker para Tinder (AutoSwipe)

// @description  Auto swipe com filtro por palavras-chave, controle de intervalo e painel visual.
// @description:pt Script de auto like e dislike com filtros, sliders e painel de controle.
// @description:pt-BR Script de auto like e dislike no Tinder com filtros, sliders e painel visual.

// @version      1.13.1
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

  // Última extração do perfil (para reaplicar idioma sem re-extrair do DOM)
  let lastExtractedInfo = null;
  let lastAboutMeText = null;

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

  // Desbloquear fotos na seção "Likes" (unblur)
  let unblurLikesEnabled = localStorage.getItem('unblurLikesEnabled') === 'true' || false;

  // Carregar estado Pausar/Continuar
  isPaused = localStorage.getItem('autoswipePaused') === 'true';

  // Resetar contador ao carregar página (nova rodada)
  likesCount = 0;

  // Idioma da interface (pt/en) e traduções
  let uiLang = localStorage.getItem('autoswipeLang') || 'pt';
  const T = {
    pt: {
      likes: 'Likes',
      dislikes: 'Dislikes',
      likesFormat: 'Likes: {0}',
      likesLimitFormat: 'Likes: {0}/{1}',
      dislikesFormat: 'Dislikes: {0}',
      forbiddenWordsLabel: 'Palavras proibidas (separadas por vírgula)',
      pause: 'Pausar',
      continue: 'Continuar',
      profileWaitLabel: 'Espera ao abrir perfil (segundos)',
      intervalLabel: 'Intervalo entre ações (segundos)',
      likesLimitTitle: 'Limitador de Likes',
      enabled: 'Ativado',
      disabled: 'Desativado',
      resetCounter: 'Resetar Contador',
      limitPlaceholder: 'Limite',
      heightFilterTitle: 'Limitador de Altura',
      heightTooltip: 'Como usar: Ative o limitador e defina a altura em cm. Escolha "Maior que" para dar dislike em pessoas acima da altura, ou "Menor que" para abaixo. Exemplo: Altura 170cm + "Maior que" = dislike em pessoas acima de 170cm.',
      greaterThan: 'Maior que',
      lessThan: 'Menor que',
      heightPlaceholder: 'Altura (cm)',
      name: 'Nome',
      age: 'Idade',
      nameAgeFormat: 'Nome: {0}, Idade: {1}',
      aboutMe: 'Sobre mim',
      notAvailable: 'Não disponível',
      noInfoExtracted: 'Nenhuma informação extraída',
      distance: 'Distância',
      height: 'Altura',
      profession: 'Profissão',
      pronouns: 'Pronomes',
      languages: 'Idiomas',
      lastDislikeTitle: 'Último Dislike Registrado em:',
      reason: 'Motivo',
      nameNotAvailable: 'Nome não disponível',
      notSpecified: 'Não especificado',
      lessThanMinute: 'menos de 1 minuto',
      minuteAgo: '1 minuto',
      minutesAgo: '{0} minutos',
      likeAgo: '1 like',
      likesAgo: '{0} likes',
      ago: 'atrás',
      limitReachedTitle: 'Limite de Likes Atingido!',
      limitReachedMessage: 'O sistema parou pois atingiu o limite de {0} likes.',
      limitReachedInfo: 'Você pode resetar o contador de likes clicando no botão "Resetar Contador" abaixo.',
      ok: 'OK',
      unblurLikesLabel: 'Desbloquear fotos em Likes',
    },
    en: {
      likes: 'Likes',
      dislikes: 'Dislikes',
      likesFormat: 'Likes: {0}',
      likesLimitFormat: 'Likes: {0}/{1}',
      dislikesFormat: 'Dislikes: {0}',
      forbiddenWordsLabel: 'Forbidden words (comma separated)',
      pause: 'Pause',
      continue: 'Continue',
      profileWaitLabel: 'Wait when opening profile (seconds)',
      intervalLabel: 'Interval between actions (seconds)',
      likesLimitTitle: 'Likes limiter',
      enabled: 'Enabled',
      disabled: 'Disabled',
      resetCounter: 'Reset counter',
      limitPlaceholder: 'Limit',
      heightFilterTitle: 'Height limiter',
      heightTooltip: 'How to use: Enable the limiter and set height in cm. Choose "Greater than" to dislike people above that height, or "Less than" for below. Example: Height 170cm + "Greater than" = dislike people above 170cm.',
      greaterThan: 'Greater than',
      lessThan: 'Less than',
      heightPlaceholder: 'Height (cm)',
      name: 'Name',
      age: 'Age',
      nameAgeFormat: 'Name: {0}, Age: {1}',
      aboutMe: 'About me',
      notAvailable: 'Not available',
      noInfoExtracted: 'No information extracted',
      distance: 'Distance',
      height: 'Height',
      profession: 'Profession',
      pronouns: 'Pronouns',
      languages: 'Languages',
      lastDislikeTitle: 'Last dislike recorded at:',
      reason: 'Reason',
      nameNotAvailable: 'Name not available',
      notSpecified: 'Not specified',
      lessThanMinute: 'less than 1 minute',
      minuteAgo: '1 minute',
      minutesAgo: '{0} minutes',
      likeAgo: '1 like',
      likesAgo: '{0} likes',
      ago: 'ago',
      limitReachedTitle: 'Likes limit reached!',
      limitReachedMessage: 'The system stopped because it reached the limit of {0} likes.',
      limitReachedInfo: 'You can reset the likes counter by clicking the "Reset counter" button below.',
      ok: 'OK',
      unblurLikesLabel: 'Unblur Likes photos',
    }
  };
  function t(key) {
    return T[uiLang]?.[key] ?? T.pt[key] ?? key;
  }
  function formatT(key, ...values) {
    let s = t(key);
    values.forEach((v, i) => {
      s = s.replace(`{${i}}`, String(v));
    });
    return s;
  }

  // Criação do painel de controle
  const container = document.createElement('div');
  container.id = 'autoswipe-container';
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.right = '10px';
  container.style.zIndex = '1000';
  container.style.width = '720px';
  container.style.maxHeight = '92vh';
  container.style.background = 'linear-gradient(135deg, rgba(15,15,25,0.97) 0%, rgba(20,18,35,0.97) 100%)';
  container.style.backdropFilter = 'blur(20px)';
  container.style.color = 'white';
  container.style.borderRadius = '16px';
  container.style.fontFamily = "'Segoe UI', system-ui, -apple-system, sans-serif";
  container.style.fontSize = '13px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '0';
  container.style.opacity = '0.15';
  container.style.transition = 'opacity 0.4s ease, box-shadow 0.3s ease';
  container.style.border = '1px solid rgba(255,255,255,0.08)';
  container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  // Estilos globais do painel
  const toggleStyle = document.createElement('style');
  toggleStyle.textContent = `
    #autoswipe-container * { box-sizing: border-box; }

    /* Scrollbar customizada */
    #autoswipe-container ::-webkit-scrollbar { width: 4px; }
    #autoswipe-container ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 2px; }
    #autoswipe-container ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
    #autoswipe-container ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }

    /* Toggles */
    .autoswipe-toggle-wrap { display: inline-flex; align-items: center; cursor: pointer; user-select: none; }
    .autoswipe-toggle-track { width: 42px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.12); position: relative; flex-shrink: 0; transition: background 0.25s ease; }
    .autoswipe-toggle-track.checked { background: linear-gradient(135deg, #4ade80, #22c55e); box-shadow: 0 0 8px rgba(74,222,128,0.35); }
    .autoswipe-toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; left: 2px; top: 2px; transition: transform 0.25s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
    .autoswipe-toggle-track.checked .autoswipe-toggle-knob { transform: translateX(20px); }

    /* Cards de seção */
    .as-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 12px 14px;
      transition: border-color 0.2s, background 0.2s;
    }
    .as-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }

    /* Títulos de seção */
    .as-section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }

    /* Inputs */
    .as-input {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      color: #fff;
      padding: 6px 10px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s, background 0.2s;
    }
    .as-input:focus { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.1); }
    .as-input::placeholder { color: rgba(255,255,255,0.3); }
    .as-input:disabled { opacity: 0.35; cursor: not-allowed; }

    /* Textarea */
    .as-textarea {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #fff;
      padding: 8px 10px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      resize: none;
      line-height: 1.5;
      transition: border-color 0.2s, background 0.2s;
      width: 100%;
    }
    .as-textarea:focus { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.09); }
    .as-textarea::placeholder { color: rgba(255,255,255,0.28); }

    /* Select */
    .as-select {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      color: #fff;
      padding: 6px 10px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      padding-right: 28px;
      transition: border-color 0.2s;
    }
    .as-select:focus { border-color: rgba(255,255,255,0.3); }
    .as-select:disabled { opacity: 0.35; cursor: not-allowed; }
    .as-select option { background: #1a1a2e; color: #fff; }

    /* Botão pause/continue */
    .as-btn-primary {
      padding: 10px 16px;
      border-radius: 10px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      letter-spacing: 0.02em;
      width: 100%;
    }
    .as-btn-primary:active { transform: scale(0.97); }
    .as-btn-running {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      box-shadow: 0 4px 12px rgba(239,68,68,0.3);
    }
    .as-btn-running:hover { box-shadow: 0 6px 16px rgba(239,68,68,0.45); }
    .as-btn-paused {
      background: linear-gradient(135deg, #4ade80, #22c55e);
      color: #000;
      box-shadow: 0 4px 12px rgba(74,222,128,0.3);
    }
    .as-btn-paused:hover { box-shadow: 0 6px 16px rgba(74,222,128,0.45); }

    /* Botão secundário */
    .as-btn-secondary {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.75);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    .as-btn-secondary:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); color: #fff; }
    .as-btn-secondary:active { transform: scale(0.97); }

    /* Slider */
    .as-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.12);
      outline: none;
      cursor: pointer;
    }
    .as-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.2), 0 2px 6px rgba(0,0,0,0.4);
      transition: box-shadow 0.2s;
    }
    .as-slider::-webkit-slider-thumb:hover { box-shadow: 0 0 0 3px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.5); }
    .as-slider::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%; background: #fff; cursor: pointer; border: none;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.2), 0 2px 6px rgba(0,0,0,0.4);
    }

    /* Status dot animado */
    .as-status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      display: inline-block; flex-shrink: 0;
    }
    .as-status-dot.running {
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
      animation: as-pulse 1.8s ease-in-out infinite;
    }
    .as-status-dot.paused { background: #f87171; box-shadow: 0 0 6px #f87171; }
    @keyframes as-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.85); }
    }

    /* Info rows */
    .as-info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      gap: 8px;
    }
    .as-info-row:last-child { border-bottom: none; }
    .as-info-label { color: rgba(255,255,255,0.45); font-size: 11px; font-weight: 500; flex-shrink: 0; }
    .as-info-value { color: rgba(255,255,255,0.88); font-size: 12px; text-align: right; word-break: break-word; }

    /* Contador cards */
    .as-counter-card {
      flex: 1;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .as-counter-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; }
    .as-counter-value { font-size: 22px; font-weight: 700; line-height: 1; }

    /* Header */
    #as-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 16px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }
    #as-header-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: linear-gradient(90deg, #f472b6, #fb923c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    #as-header-spacer { flex: 1; }

    /* Minimize button */
    #as-minimize-btn {
      width: 22px; height: 22px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, color 0.2s;
      padding: 0;
      flex-shrink: 0;
    }
    #as-minimize-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

    /* Body columns */
    #as-body {
      display: flex;
      flex-direction: row;
      gap: 12px;
      padding: 12px 14px 14px;
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }

    /* Tooltip */
    .as-tooltip-wrap { position: relative; display: inline-flex; }
    .as-tooltip-icon {
      width: 16px; height: 16px; border-radius: 50%;
      background: rgba(255,204,0,0.12); border: 1px solid rgba(255,204,0,0.35);
      color: #ffcc00; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      cursor: help; flex-shrink: 0;
    }
    .as-tooltip-popup {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      width: 230px;
      padding: 10px 12px;
      background: rgba(10,10,20,0.97);
      color: rgba(255,255,255,0.85);
      border-radius: 10px;
      border: 1px solid rgba(255,204,0,0.3);
      font-size: 11px;
      line-height: 1.5;
      z-index: 10001;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .as-tooltip-wrap:hover .as-tooltip-popup { opacity: 1; visibility: visible; }

    /* Último dislike card */
    #autoswipe-last-dislike-card {
      background: linear-gradient(135deg, rgba(127,29,29,0.55), rgba(153,27,27,0.4));
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 12px;
      line-height: 1.5;
    }

    /* Status enabled/disabled */
    .as-status-enabled { color: #4ade80; font-weight: 600; font-size: 11px; }
    .as-status-disabled { color: #f87171; font-weight: 600; font-size: 11px; }

    /* Lang button */
    #as-lang-btn {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(255,204,0,0.35);
      background: rgba(255,204,0,0.08);
      color: #ffcc00;
      font-family: inherit;
      transition: background 0.2s, border-color 0.2s;
      letter-spacing: 0.05em;
    }
    #as-lang-btn:hover { background: rgba(255,204,0,0.16); border-color: rgba(255,204,0,0.6); }
  `;
  document.head.appendChild(toggleStyle);

  function createToggle(initialChecked) {
    let checked = !!initialChecked;
    const wrap = document.createElement('span');
    wrap.className = 'autoswipe-toggle-wrap';
    wrap.setAttribute('role', 'switch');
    wrap.setAttribute('aria-checked', checked);
    const track = document.createElement('span');
    track.className = 'autoswipe-toggle-track';
    if (checked) track.classList.add('checked');
    const knob = document.createElement('span');
    knob.className = 'autoswipe-toggle-knob';
    track.appendChild(knob);
    wrap.appendChild(track);
    const changeListeners = [];
    function updateVisual() {
      track.classList.toggle('checked', checked);
      wrap.setAttribute('aria-checked', checked);
    }
    wrap.addEventListener('click', (e) => {
      e.preventDefault();
      checked = !checked;
      updateVisual();
      changeListeners.forEach((fn) => fn());
    });
    const toggle = {
      element: wrap,
      get checked() { return checked; },
      set checked(v) { checked = !!v; updateVisual(); },
      addEventListener(ev, fn) { if (ev === 'change') changeListeners.push(fn); }
    };
    return toggle;
  }

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
    container.style.boxShadow = '0 12px 48px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)';
  });
  container.addEventListener('mouseleave', () => {
    container.style.opacity = '0.15';
    container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)';
  });

  // ── Header ──────────────────────────────────────────────
  const asHeader = document.createElement('div');
  asHeader.id = 'as-header';

  // Ícone de fogo (logo)
  const asLogo = document.createElement('span');
  asLogo.textContent = '🔥';
  asLogo.style.fontSize = '15px';

  const asHeaderTitle = document.createElement('span');
  asHeaderTitle.id = 'as-header-title';
  asHeaderTitle.textContent = 'AutoSwipe';

  // Status dot + texto
  const asStatusWrap = document.createElement('span');
  asStatusWrap.style.display = 'inline-flex';
  asStatusWrap.style.alignItems = 'center';
  asStatusWrap.style.gap = '5px';
  asStatusWrap.style.background = 'rgba(255,255,255,0.05)';
  asStatusWrap.style.border = '1px solid rgba(255,255,255,0.08)';
  asStatusWrap.style.borderRadius = '20px';
  asStatusWrap.style.padding = '3px 9px';

  const asStatusDot = document.createElement('span');
  asStatusDot.className = 'as-status-dot ' + (isPaused ? 'paused' : 'running');

  const asStatusText = document.createElement('span');
  asStatusText.style.fontSize = '11px';
  asStatusText.style.color = 'rgba(255,255,255,0.55)';
  asStatusText.style.fontWeight = '500';
  asStatusText.textContent = isPaused ? '⏸' : '▶';
  asStatusWrap.appendChild(asStatusDot);
  asStatusWrap.appendChild(asStatusText);

  const asHeaderSpacer = document.createElement('span');
  asHeaderSpacer.id = 'as-header-spacer';

  // Lang button no header
  const langButton = document.createElement('button');
  langButton.id = 'as-lang-btn';
  function updateLangButtonLabel() {
    langButton.textContent = uiLang === 'pt' ? 'PT' : 'EN';
    langButton.title = uiLang === 'pt' ? 'Idioma: Português (clique para Inglês)' : 'Language: English (click for Portuguese)';
  }
  updateLangButtonLabel();

  // Minimize button
  const asMinimizeBtn = document.createElement('button');
  asMinimizeBtn.id = 'as-minimize-btn';
  asMinimizeBtn.title = 'Minimizar / Restaurar';
  asMinimizeBtn.textContent = '−';
  let asMinimized = false;
  const asBody = document.createElement('div');
  asBody.id = 'as-body';
  asMinimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    asMinimized = !asMinimized;
    asBody.style.display = asMinimized ? 'none' : 'flex';
    asMinimizeBtn.textContent = asMinimized ? '+' : '−';
    container.style.maxHeight = asMinimized ? 'none' : '92vh';
  });

  asHeader.appendChild(asLogo);
  asHeader.appendChild(asHeaderTitle);
  asHeader.appendChild(asStatusWrap);
  asHeader.appendChild(asHeaderSpacer);
  asHeader.appendChild(langButton);
  asHeader.appendChild(asMinimizeBtn);
  container.appendChild(asHeader);
  container.appendChild(asBody);

  // ── Stats (contadores) ───────────────────────────────────
  const statsContainer = document.createElement('div');
  statsContainer.style.display = 'flex';
  statsContainer.style.gap = '8px';
  statsContainer.style.marginBottom = '2px';

  // Like counter card
  const likeCounterContainer = document.createElement('div');
  likeCounterContainer.className = 'as-counter-card';
  likeCounterContainer.style.background = 'linear-gradient(135deg, rgba(74,222,128,0.1), rgba(34,197,94,0.06))';
  likeCounterContainer.style.border = '1px solid rgba(74,222,128,0.2)';

  const likeCounterLabel = document.createElement('span');
  likeCounterLabel.className = 'as-counter-label';
  likeCounterLabel.style.color = '#4ade80';
  likeCounterLabel.textContent = t('likes');

  const likeCounter = document.createElement('span');
  likeCounter.className = 'as-counter-value';
  likeCounter.style.color = '#4ade80';

  likeCounterContainer.appendChild(likeCounterLabel);
  likeCounterContainer.appendChild(likeCounter);
  statsContainer.appendChild(likeCounterContainer);

  // Dislike counter card
  const dislikeCounterContainer = document.createElement('div');
  dislikeCounterContainer.className = 'as-counter-card';
  dislikeCounterContainer.style.background = 'linear-gradient(135deg, rgba(248,113,113,0.1), rgba(239,68,68,0.06))';
  dislikeCounterContainer.style.border = '1px solid rgba(248,113,113,0.2)';

  const dislikeCounterLabel = document.createElement('span');
  dislikeCounterLabel.className = 'as-counter-label';
  dislikeCounterLabel.style.color = '#f87171';
  dislikeCounterLabel.textContent = t('dislikes');

  const dislikeCounter = document.createElement('span');
  dislikeCounter.className = 'as-counter-value';
  dislikeCounter.style.color = '#f87171';

  dislikeCounterContainer.appendChild(dislikeCounterLabel);
  dislikeCounterContainer.appendChild(dislikeCounter);
  statsContainer.appendChild(dislikeCounterContainer);

  // ── Left column ─────────────────────────────────────────
  const leftColumn = document.createElement('div');
  leftColumn.style.flex = '1';
  leftColumn.style.display = 'flex';
  leftColumn.style.flexDirection = 'column';
  leftColumn.style.gap = '8px';
  leftColumn.style.overflowY = 'auto';
  leftColumn.style.maxHeight = '100%';
  asBody.appendChild(leftColumn);

  leftColumn.appendChild(statsContainer);

  forbiddenWords =
    JSON.parse(localStorage.getItem('forbiddenWords')) || forbiddenWords;

  // ── Pause button ─────────────────────────────────────────
  const pauseButton = document.createElement('button');
  pauseButton.className = 'as-btn-primary ' + (isPaused ? 'as-btn-paused' : 'as-btn-running');
  pauseButton.textContent = isPaused ? t('continue') : t('pause');
  leftColumn.appendChild(pauseButton);

  // ── Forbidden words card ─────────────────────────────────
  const forbiddenWordsCard = document.createElement('div');
  forbiddenWordsCard.className = 'as-card';

  const forbiddenWordsLabel = document.createElement('label');
  forbiddenWordsLabel.setAttribute('data-i18n', 'forbiddenWordsLabel');
  forbiddenWordsLabel.textContent = t('forbiddenWordsLabel');
  forbiddenWordsLabel.style.fontSize = '11px';
  forbiddenWordsLabel.style.color = 'rgba(255,255,255,0.5)';
  forbiddenWordsLabel.style.display = 'block';
  forbiddenWordsLabel.style.marginBottom = '6px';
  forbiddenWordsLabel.style.fontWeight = '600';
  forbiddenWordsLabel.style.letterSpacing = '0.05em';
  forbiddenWordsLabel.style.textTransform = 'uppercase';

  const forbiddenWordsInput = document.createElement('textarea');
  forbiddenWordsInput.value = forbiddenWords.join(', ');
  forbiddenWordsInput.className = 'as-textarea';
  forbiddenWordsInput.style.height = '52px';

  forbiddenWordsCard.appendChild(forbiddenWordsLabel);
  forbiddenWordsCard.appendChild(forbiddenWordsInput);
  leftColumn.appendChild(forbiddenWordsCard);

  forbiddenWordsInput.addEventListener('input', () => {
    forbiddenWords = forbiddenWordsInput.value
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);
    localStorage.setItem('forbiddenWords', JSON.stringify(forbiddenWords));
  });

  // ── Slider factory ────────────────────────────────────────
  const createSlider = (
    labelI18nKey,
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
    sliderContainer.style.gap = '6px';

    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.alignItems = 'center';

    const label = document.createElement('label');
    label.setAttribute('data-i18n', labelI18nKey);
    label.textContent = t(labelI18nKey);
    label.style.fontSize = '11px';
    label.style.color = 'rgba(255,255,255,0.5)';
    label.style.fontWeight = '600';
    label.style.letterSpacing = '0.05em';
    label.style.textTransform = 'uppercase';

    const valueDisplay = document.createElement('span');
    valueDisplay.style.fontSize = '12px';
    valueDisplay.style.color = '#fff';
    valueDisplay.style.fontWeight = '600';
    valueDisplay.style.background = 'rgba(255,255,255,0.08)';
    valueDisplay.style.padding = '2px 8px';
    valueDisplay.style.borderRadius = '20px';
    valueDisplay.textContent = `${(initialValue / 1000).toFixed(1)}s`;

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);
    sliderContainer.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = initialValue;
    slider.className = 'as-slider';
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
    'profileWaitLabel', 100, 10000, 100, profileOpenWait, 'profileOpenWait',
    (value) => { profileOpenWait = value; }
  );
  const profileWaitContainer = document.createElement('div');
  profileWaitContainer.className = 'as-card';
  profileWaitContainer.style.borderColor = 'rgba(59,130,246,0.25)';
  profileWaitContainer.appendChild(profileWaitSlider);
  leftColumn.appendChild(profileWaitContainer);

  const intervalSlider = createSlider(
    'intervalLabel', 100, 10000, 100, interval, 'interval',
    (value) => { interval = value; }
  );
  const intervalContainer = document.createElement('div');
  intervalContainer.className = 'as-card';
  intervalContainer.style.borderColor = 'rgba(59,130,246,0.25)';
  intervalContainer.appendChild(intervalSlider);
  leftColumn.appendChild(intervalContainer);



  // ── Likes limiter card ───────────────────────────────────
  const likesLimitContainer = document.createElement('div');
  likesLimitContainer.className = 'as-card';
  likesLimitContainer.style.borderColor = 'rgba(255,204,0,0.2)';
  likesLimitContainer.style.display = 'flex';
  likesLimitContainer.style.flexDirection = 'column';
  likesLimitContainer.style.gap = '8px';
  leftColumn.appendChild(likesLimitContainer);

  const likesLimitTitle = document.createElement('div');
  likesLimitTitle.className = 'as-section-title';
  likesLimitTitle.setAttribute('data-i18n', 'likesLimitTitle');
  likesLimitTitle.innerHTML = '<span style="color:#ffcc00">⚡</span><span data-i18n="likesLimitTitle" style="color:rgba(255,255,255,0.65)">' + t('likesLimitTitle') + '</span>';
  likesLimitContainer.appendChild(likesLimitTitle);

  const likesLimitRow = document.createElement('div');
  likesLimitRow.style.display = 'flex';
  likesLimitRow.style.alignItems = 'center';
  likesLimitRow.style.gap = '8px';
  likesLimitContainer.appendChild(likesLimitRow);

  const enableLikesLimitToggle = createToggle(likesLimitEnabled);

  const likesLimitStatusText = document.createElement('span');
  likesLimitStatusText.className = likesLimitEnabled ? 'as-status-enabled' : 'as-status-disabled';
  likesLimitStatusText.textContent = likesLimitEnabled ? t('enabled') : t('disabled');

  const likesLimitInput = document.createElement('input');
  likesLimitInput.type = 'number';
  likesLimitInput.min = '1';
  likesLimitInput.step = '1';
  likesLimitInput.value = (likesLimit !== null && likesLimit > 0) ? likesLimit : '';
  likesLimitInput.className = 'as-input';
  likesLimitInput.style.width = '72px';
  likesLimitInput.placeholder = t('limitPlaceholder');

  const resetCounterButton = document.createElement('button');
  resetCounterButton.setAttribute('data-i18n', 'resetCounter');
  resetCounterButton.textContent = t('resetCounter');
  resetCounterButton.className = 'as-btn-secondary';
  resetCounterButton.style.marginLeft = 'auto';

  likesLimitRow.appendChild(enableLikesLimitToggle.element);
  likesLimitRow.appendChild(likesLimitStatusText);
  likesLimitRow.appendChild(likesLimitInput);
  likesLimitRow.appendChild(resetCounterButton);
  likesLimitContainer.appendChild(likesLimitRow);

  // Event listeners para limite de likes
  enableLikesLimitToggle.addEventListener('change', () => {
    likesLimitEnabled = enableLikesLimitToggle.checked;
    localStorage.setItem('likesLimitEnabled', likesLimitEnabled);
    likesLimitInput.disabled = !likesLimitEnabled;

    likesLimitStatusText.textContent = likesLimitEnabled ? t('enabled') : t('disabled');
    likesLimitStatusText.className = likesLimitEnabled ? 'as-status-enabled' : 'as-status-disabled';

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

  // ── Unblur likes card ────────────────────────────────────
  const unblurLikesContainer = document.createElement('div');
  unblurLikesContainer.className = 'as-card';
  unblurLikesContainer.style.borderColor = 'rgba(167,139,250,0.25)';
  leftColumn.appendChild(unblurLikesContainer);

  const unblurLikesToggle = createToggle(unblurLikesEnabled);

  const unblurLikesLabel = document.createElement('label');
  unblurLikesLabel.setAttribute('data-i18n', 'unblurLikesLabel');
  unblurLikesLabel.style.cursor = 'pointer';
  unblurLikesLabel.style.display = 'flex';
  unblurLikesLabel.style.alignItems = 'center';
  unblurLikesLabel.style.gap = '8px';
  unblurLikesLabel.style.fontSize = '12px';
  unblurLikesLabel.style.color = 'rgba(255,255,255,0.75)';

  const unblurIcon = document.createElement('span');
  unblurIcon.textContent = '👁';
  unblurIcon.style.fontSize = '14px';

  const unblurLabelText = document.createElement('span');
  unblurLabelText.setAttribute('data-i18n', 'unblurLikesLabel');
  unblurLabelText.textContent = t('unblurLikesLabel');

  unblurLikesLabel.appendChild(unblurLikesToggle.element);
  unblurLikesLabel.appendChild(unblurIcon);
  unblurLikesLabel.appendChild(unblurLabelText);
  unblurLikesContainer.appendChild(unblurLikesLabel);

  unblurLikesToggle.addEventListener('change', () => {
    unblurLikesEnabled = unblurLikesToggle.checked;
    localStorage.setItem('unblurLikesEnabled', unblurLikesEnabled);
    if (unblurLikesEnabled) unblurLikesCards();
  });

  // ── Height filter card ───────────────────────────────────
  const heightFilterContainer = document.createElement('div');
  heightFilterContainer.className = 'as-card';
  heightFilterContainer.style.borderColor = 'rgba(255,204,0,0.2)';
  heightFilterContainer.style.display = 'flex';
  heightFilterContainer.style.flexDirection = 'column';
  heightFilterContainer.style.gap = '8px';
  leftColumn.appendChild(heightFilterContainer);

  // Título + tooltip
  const heightFilterTitleRow = document.createElement('div');
  heightFilterTitleRow.className = 'as-section-title';

  const heightFilterTitle = document.createElement('span');
  heightFilterTitle.innerHTML = '<span style="color:#ffcc00">📏</span><span data-i18n="heightFilterTitle" style="color:rgba(255,255,255,0.65)">' + t('heightFilterTitle') + '</span>';
  heightFilterTitle.setAttribute('data-i18n-parent', 'heightFilterTitle');

  // Tooltip com nova estrutura CSS
  const tooltipWrap = document.createElement('span');
  tooltipWrap.className = 'as-tooltip-wrap';

  const tooltipIcon = document.createElement('span');
  tooltipIcon.className = 'as-tooltip-icon';
  tooltipIcon.textContent = '?';

  const tooltip = document.createElement('div');
  tooltip.className = 'as-tooltip-popup';
  tooltip.setAttribute('data-i18n', 'heightTooltip');
  tooltip.textContent = t('heightTooltip');

  tooltipWrap.appendChild(tooltipIcon);
  tooltipWrap.appendChild(tooltip);

  heightFilterTitleRow.appendChild(heightFilterTitle);
  heightFilterTitleRow.appendChild(tooltipWrap);
  heightFilterContainer.appendChild(heightFilterTitleRow);

  // Controles de filtro de altura
  const heightFilterRow = document.createElement('div');
  heightFilterRow.style.display = 'flex';
  heightFilterRow.style.alignItems = 'center';
  heightFilterRow.style.gap = '8px';
  heightFilterContainer.appendChild(heightFilterRow);

  const enableHeightFilterToggle = createToggle(heightFilterEnabled);

  const heightFilterStatusText = document.createElement('span');
  heightFilterStatusText.className = heightFilterEnabled ? 'as-status-enabled' : 'as-status-disabled';
  heightFilterStatusText.textContent = heightFilterEnabled ? t('enabled') : t('disabled');

  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.min = '100';
  heightInput.max = '250';
  heightInput.step = '1';
  heightInput.value = heightThreshold;
  heightInput.className = 'as-input';
  heightInput.style.width = '70px';
  heightInput.placeholder = t('heightPlaceholder');

  const heightConditionSelect = document.createElement('select');
  heightConditionSelect.className = 'as-select';
  heightConditionSelect.style.flex = '1';

  const optionGreater = document.createElement('option');
  optionGreater.value = 'greater';
  optionGreater.textContent = t('greaterThan');

  const optionLess = document.createElement('option');
  optionLess.value = 'less';
  optionLess.textContent = t('lessThan');

  heightConditionSelect.appendChild(optionGreater);
  heightConditionSelect.appendChild(optionLess);
  heightConditionSelect.value = heightCondition;

  heightFilterRow.appendChild(enableHeightFilterToggle.element);
  heightFilterRow.appendChild(heightFilterStatusText);
  heightFilterRow.appendChild(heightInput);
  heightFilterRow.appendChild(heightConditionSelect);

  // Event listeners para filtro de altura
  enableHeightFilterToggle.addEventListener('change', () => {
    heightFilterEnabled = enableHeightFilterToggle.checked;
    localStorage.setItem('heightFilterEnabled', heightFilterEnabled);
    heightFilterStatusText.textContent = heightFilterEnabled ? t('enabled') : t('disabled');
    heightFilterStatusText.className = heightFilterEnabled ? 'as-status-enabled' : 'as-status-disabled';
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

  heightInput.disabled = !heightFilterEnabled;
  heightConditionSelect.disabled = !heightFilterEnabled;

  // ── Pause button event ───────────────────────────────────
  pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? t('continue') : t('pause');
    pauseButton.className = 'as-btn-primary ' + (isPaused ? 'as-btn-paused' : 'as-btn-running');
    asStatusDot.className = 'as-status-dot ' + (isPaused ? 'paused' : 'running');
    asStatusText.textContent = isPaused ? '⏸' : '▶';
    pillDot.className = 'as-status-dot ' + (isPaused ? 'paused' : 'running');
    localStorage.setItem('autoswipePaused', String(isPaused));
  });

  // ── Right column ─────────────────────────────────────────
  const rightColumn = document.createElement('div');
  rightColumn.style.flex = '1';
  rightColumn.style.display = 'flex';
  rightColumn.style.flexDirection = 'column';
  rightColumn.style.gap = '8px';
  rightColumn.style.overflowY = 'auto';
  rightColumn.style.maxHeight = '100%';
  asBody.appendChild(rightColumn);

  // ── Name/age card ─────────────────────────────────────────
  const nameAgeContainer = document.createElement('div');
  nameAgeContainer.className = 'as-card';
  nameAgeContainer.style.borderColor = 'rgba(251,146,60,0.25)';

  const initialName = (!currentProfileName || currentProfileName === 'Não disponível') ? t('notAvailable') : currentProfileName;
  const initialAge = (!currentProfileAge || currentProfileAge === 'Não disponível') ? t('notAvailable') : currentProfileAge;

  const nameDisplay = document.createElement('div');
  nameDisplay.id = 'as-name-display';
  nameDisplay.style.fontSize = '15px';
  nameDisplay.style.fontWeight = '700';
  nameDisplay.style.color = '#fff';
  nameDisplay.style.marginBottom = '2px';

  const nameText = document.createElement('span');
  nameText.textContent = initialName;
  const ageBadge = document.createElement('span');
  ageBadge.style.cssText = 'display:inline-block;background:rgba(251,146,60,0.18);border:1px solid rgba(251,146,60,0.32);color:#fb923c;font-size:11px;font-weight:600;padding:1px 7px;border-radius:20px;margin-left:6px;vertical-align:middle;';
  ageBadge.textContent = initialAge;
  nameDisplay.appendChild(nameText);
  nameDisplay.appendChild(ageBadge);
  nameAgeContainer.appendChild(nameDisplay);
  rightColumn.appendChild(nameAgeContainer);

  // ── Profile info card ─────────────────────────────────────
  const profileInfoCard = document.createElement('div');
  profileInfoCard.className = 'as-card';
  profileInfoCard.style.borderColor = 'rgba(251,146,60,0.15)';

  const profileInfoTitle = document.createElement('div');
  profileInfoTitle.className = 'as-section-title';
  profileInfoTitle.style.marginBottom = '8px';
  profileInfoTitle.innerHTML = '<span style="opacity:0.5;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.4)">Profile</span>';
  profileInfoCard.appendChild(profileInfoTitle);

  const profileInfoContainer = document.createElement('div');
  profileInfoContainer.style.display = 'flex';
  profileInfoContainer.style.flexDirection = 'column';
  profileInfoCard.appendChild(profileInfoContainer);
  rightColumn.appendChild(profileInfoCard);

  // ── Função para criar cada linha de informação ────────────
  function createInfoRow(labelKey, value) {
    const row = document.createElement('div');
    row.className = 'as-info-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'as-info-label';
    labelSpan.textContent = t(labelKey);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'as-info-value';
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

  // ── About me element ──────────────────────────────────────
  const profileInfo = document.createElement('div');
  profileInfo.className = 'as-info-row';
  profileInfo.style.borderBottom = 'none';
  profileInfo.style.padding = '6px 0 2px';
  profileInfo.style.flexDirection = 'column';
  profileInfo.style.gap = '3px';

  const profileInfoLabel = document.createElement('span');
  profileInfoLabel.className = 'as-info-label';
  profileInfoLabel.setAttribute('data-i18n-prefix', 'aboutMe');
  profileInfoLabel.textContent = t('aboutMe');

  const profileInfoText = document.createElement('span');
  profileInfoText.style.color = 'rgba(255,255,255,0.7)';
  profileInfoText.style.fontSize = '12px';
  profileInfoText.style.lineHeight = '1.5';
  profileInfoText.style.wordBreak = 'break-word';
  profileInfoText.textContent = t('notAvailable');

  profileInfo.appendChild(profileInfoLabel);
  profileInfo.appendChild(profileInfoText);
  profileInfoCard.appendChild(profileInfo);

  // ── Last dislike card ─────────────────────────────────────
  const lastDislikeCard = document.createElement('div');
  lastDislikeCard.id = 'autoswipe-last-dislike-card';
  lastDislikeCard.style.display = 'none';
  rightColumn.appendChild(lastDislikeCard);

  // ── Floating pill (modo minimizado) ──────────────────────
  const floatingPill = document.createElement('div');
  floatingPill.id = 'as-floating-pill';
  floatingPill.style.cssText = `
    position:fixed; bottom:20px; right:20px; z-index:1001;
    background:linear-gradient(135deg,rgba(15,15,25,0.97),rgba(20,18,35,0.97));
    border:1px solid rgba(255,255,255,0.1); border-radius:40px;
    padding:8px 14px 8px 10px;
    display:none; align-items:center; gap:8px;
    box-shadow:0 4px 20px rgba(0,0,0,0.6);
    cursor:pointer; user-select:none;
    font-family:'Segoe UI',system-ui,sans-serif; font-size:12px; color:#fff;
    transition:box-shadow 0.2s, transform 0.15s;
    backdrop-filter:blur(16px);
  `;
  floatingPill.title = 'Expandir AutoSwipe';

  const pillDot = document.createElement('span');
  pillDot.className = 'as-status-dot ' + (isPaused ? 'paused' : 'running');
  pillDot.style.margin = '0 2px';

  const pillEmoji = document.createElement('span');
  pillEmoji.textContent = '🔥';
  pillEmoji.style.fontSize = '14px';

  const pillText = document.createElement('span');
  pillText.style.fontWeight = '600';
  pillText.style.letterSpacing = '0.02em';
  pillText.textContent = 'AutoSwipe';

  const pillExpand = document.createElement('span');
  pillExpand.style.cssText = 'font-size:10px;opacity:0.5;margin-left:2px;';
  pillExpand.textContent = '⬆';

  floatingPill.appendChild(pillDot);
  floatingPill.appendChild(pillEmoji);
  floatingPill.appendChild(pillText);
  floatingPill.appendChild(pillExpand);
  document.body.appendChild(floatingPill);

  floatingPill.addEventListener('mouseenter', () => {
    floatingPill.style.boxShadow = '0 6px 28px rgba(0,0,0,0.75)';
    floatingPill.style.transform = 'scale(1.04)';
  });
  floatingPill.addEventListener('mouseleave', () => {
    floatingPill.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
    floatingPill.style.transform = 'scale(1)';
  });

  // Drag da pill
  let pillDragging = false, pillDx = 0, pillDy = 0;
  floatingPill.addEventListener('mousedown', (e) => {
    pillDragging = true;
    pillDx = e.clientX - floatingPill.getBoundingClientRect().left;
    pillDy = e.clientY - floatingPill.getBoundingClientRect().top;
    e.stopPropagation();
  });
  document.addEventListener('mousemove', (e) => {
    if (!pillDragging) return;
    floatingPill.style.left = (e.clientX - pillDx) + 'px';
    floatingPill.style.top = (e.clientY - pillDy) + 'px';
    floatingPill.style.right = 'auto';
    floatingPill.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => { pillDragging = false; });

  // Botão esconder no header
  const asHideBtn = document.createElement('button');
  asHideBtn.id = 'as-hide-btn';
  asHideBtn.title = 'Esconder painel';
  asHideBtn.textContent = '✕';
  asHideBtn.style.cssText = `
    width:22px;height:22px;border-radius:50%;border:none;
    background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
    font-size:11px;line-height:1;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:background 0.2s,color 0.2s;padding:0;flex-shrink:0;
  `;
  asHideBtn.addEventListener('mouseenter', () => { asHideBtn.style.background = 'rgba(239,68,68,0.3)'; asHideBtn.style.color = '#fff'; });
  asHideBtn.addEventListener('mouseleave', () => { asHideBtn.style.background = 'rgba(255,255,255,0.08)'; asHideBtn.style.color = 'rgba(255,255,255,0.5)'; });
  asHideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.style.display = 'none';
    floatingPill.style.display = 'flex';
  });
  asHeader.insertBefore(asHideBtn, asMinimizeBtn);

  // Expandir ao clicar na pill
  floatingPill.addEventListener('click', () => {
    if (pillDragging) return;
    container.style.display = 'flex';
    floatingPill.style.display = 'none';
  });

  function updateLikeCounter() {
    if (likesLimitEnabled && likesLimit !== null) {
      likeCounter.textContent = formatT('likesLimitFormat', likesCount, likesLimit);
      if (likesCount >= likesLimit * 0.8) {
        likeCounter.style.color = '#ffcc00';
        likeCounterContainer.style.borderColor = 'rgba(255,204,0,0.35)';
        if (likesCount >= likesLimit) {
          likeCounter.style.color = '#f87171';
          likeCounterContainer.style.borderColor = 'rgba(248,113,113,0.35)';
        }
      } else {
        likeCounter.style.color = '#4ade80';
        likeCounterContainer.style.borderColor = 'rgba(74,222,128,0.2)';
      }
    } else {
      likeCounter.textContent = String(likesCount);
      likeCounter.style.color = '#4ade80';
      likeCounterContainer.style.borderColor = 'rgba(74,222,128,0.2)';
    }
    likeCounterLabel.textContent = (likesLimitEnabled && likesLimit !== null)
      ? `${t('likes')} / ${likesLimit}`
      : t('likes');
  }

  function updateDislikeCounter() {
    dislikeCounter.textContent = String(dislikesCount);
  }

  updateLikeCounter();
  updateDislikeCounter();

  function _renderProfileInfoRows(extractedInfo) {
    profileInfoContainer.innerHTML = '';
    let hasInfo = false;
    if (extractedInfo.distance) { profileInfoContainer.appendChild(createInfoRow('distance', extractedInfo.distance)); hasInfo = true; }
    if (extractedInfo.height) { profileInfoContainer.appendChild(createInfoRow('height', extractedInfo.height)); hasInfo = true; }
    if (extractedInfo.profession) { profileInfoContainer.appendChild(createInfoRow('profession', extractedInfo.profession)); hasInfo = true; }
    if (extractedInfo.genderPronoun) { profileInfoContainer.appendChild(createInfoRow('pronouns', extractedInfo.genderPronoun)); hasInfo = true; }
    if (extractedInfo.languages) { profileInfoContainer.appendChild(createInfoRow('languages', extractedInfo.languages)); hasInfo = true; }
    if (!hasInfo) {
      const noInfo = document.createElement('div');
      noInfo.style.cssText = 'color:rgba(248,113,113,0.8);font-size:11px;padding:4px 0;';
      noInfo.textContent = t('noInfoExtracted');
      profileInfoContainer.appendChild(noInfo);
    }
  }

  function updateProfileInfo(text) {
    const extractedInfo = extractProfileInfo();
    if (!extractedInfo) return;
    lastExtractedInfo = extractedInfo;
    lastAboutMeText = text || t('notAvailable');
    _renderProfileInfoRows(extractedInfo);
    const aboutMeText = text || t('notAvailable');
    profileInfoText.textContent = aboutMeText;
    profileInfoLabel.textContent = t('aboutMe');
    const name = (!currentProfileName || currentProfileName === 'Não disponível') ? t('notAvailable') : currentProfileName;
    const age = (!currentProfileAge || currentProfileAge === 'Não disponível') ? t('notAvailable') : currentProfileAge;
    nameText.textContent = name;
    ageBadge.textContent = age;
  }

  function updateNameAge() {
    const name = (!currentProfileName || currentProfileName === 'Não disponível') ? t('notAvailable') : currentProfileName;
    const age = (!currentProfileAge || currentProfileAge === 'Não disponível') ? t('notAvailable') : currentProfileAge;
    nameText.textContent = name;
    ageBadge.textContent = age;
  }

  function updateLastDislikeCard() {
    let card = document.getElementById('autoswipe-last-dislike-card');
    if (!card) {
      card = lastDislikeCard;
      if (container && !container.contains(card)) rightColumn.appendChild(card);
    }
    if (!lastDislikeTimestamp) { if (card) card.style.display = 'none'; return; }

    const now = new Date();
    const diffMinutes = Math.floor((now - lastDislikeTimestamp) / 60000);
    const minutesText = diffMinutes === 0 ? t('lessThanMinute') :
      diffMinutes === 1 ? t('minuteAgo') : formatT('minutesAgo', diffMinutes);
    const likesSinceDislike = likesCount - lastDislikeLikesCount;
    const likesText = likesSinceDislike === 0 ? '0 likes' :
      likesSinceDislike === 1 ? t('likeAgo') : formatT('likesAgo', likesSinceDislike);
    const nameAgeText = lastDislikeProfileName && lastDislikeProfileAge
      ? `${lastDislikeProfileName}, ${lastDislikeProfileAge}`
      : (lastDislikeProfileName || t('nameNotAvailable'));
    const reasonText = lastDislikeReason || t('notSpecified');

    if (card) {
      card.innerHTML = `
        <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(248,113,113,0.7);margin-bottom:6px">${t('lastDislikeTitle')}</div>
        <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:5px">${nameAgeText}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:4px">${t('reason')}: <span style="color:rgba(255,255,255,0.8)">${reasonText}</span></div>
        <div style="font-size:11px;color:rgba(74,222,128,0.7)">${likesText} ${t('ago')} · ${minutesText} ${t('ago')}</div>
      `;
      card.style.display = 'block';
      card.offsetHeight;
    }
  }

  function applyLanguage() {
    container.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    pauseButton.textContent = isPaused ? t('continue') : t('pause');
    pauseButton.className = 'as-btn-primary ' + (isPaused ? 'as-btn-paused' : 'as-btn-running');
    likesLimitStatusText.textContent = likesLimitEnabled ? t('enabled') : t('disabled');
    likesLimitStatusText.className = likesLimitEnabled ? 'as-status-enabled' : 'as-status-disabled';
    heightFilterStatusText.textContent = heightFilterEnabled ? t('enabled') : t('disabled');
    heightFilterStatusText.className = heightFilterEnabled ? 'as-status-enabled' : 'as-status-disabled';
    likesLimitInput.placeholder = t('limitPlaceholder');
    heightInput.placeholder = t('heightPlaceholder');
    optionGreater.textContent = t('greaterThan');
    optionLess.textContent = t('lessThan');
    profileInfoLabel.textContent = t('aboutMe');
    updateLikeCounter();
    updateDislikeCounter();
    if (lastExtractedInfo) {
      _renderProfileInfoRows(lastExtractedInfo);
      const aboutDisplay = (lastAboutMeText && lastAboutMeText !== 'Não disponível') ? lastAboutMeText : t('notAvailable');
      profileInfoText.textContent = aboutDisplay;
    } else {
      profileInfoText.textContent = t('notAvailable');
    }
    updateNameAge();
    updateLastDislikeCard();
  }

  langButton.addEventListener('click', () => {
    uiLang = uiLang === 'pt' ? 'en' : 'pt';
    localStorage.setItem('autoswipeLang', uiLang);
    applyLanguage();
    updateLangButtonLabel();
  });

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
    title.textContent = t('limitReachedTitle');
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.color = '#ffcc00';
    title.style.marginBottom = '20px';

    const message = document.createElement('div');
    message.textContent = formatT('limitReachedMessage', likesLimit);
    message.style.fontSize = '16px';
    message.style.marginBottom = '20px';
    message.style.lineHeight = '1.5';

    const info = document.createElement('div');
    info.textContent = t('limitReachedInfo');
    info.style.fontSize = '14px';
    info.style.color = '#cccccc';
    info.style.marginBottom = '25px';

    const closeButton = document.createElement('button');
    closeButton.textContent = t('ok');
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
      pauseButton.textContent = t('continue');
      pauseButton.style.backgroundColor = '#4caf50';
      localStorage.setItem('autoswipePaused', 'true');
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
        for (const word of forbiddenWords) {
          if (profileText.toLowerCase().includes(word.toLowerCase())) {
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

  /**
   * Remove o blur dos cards da seção "Quem curtiu você" (Likes) usando a API do Tinder.
   * Só executa em /app/likes-you ou /app/gold-home e quando unblurLikesEnabled estiver ativo.
   * Falha em silêncio (sem alert) em caso de token ausente, 401 ou erro de rede.
   */
  const UNBLUR_LOG = '[AutoSwipe Unblur]';

  async function unblurLikesCards() {
    const path = location.pathname || '';
    const onLikesPage = path.includes('/app/likes-you') || path.includes('/app/gold-home');

    if (!onLikesPage) {
      return; // sem log para não poluir quando estiver em outras abas
    }

    if (!unblurLikesEnabled) {
      console.log(UNBLUR_LOG, 'Página likes detectada, mas opção "Desbloquear fotos em Likes" está desativada.');
      return;
    }

    const token = localStorage.getItem('TinderWeb/APIToken');
    if (!token) {
      console.warn(UNBLUR_LOG, 'Token (TinderWeb/APIToken) não encontrado no localStorage. Faça login no Tinder.');
      return;
    }

    try {
      console.log(UNBLUR_LOG, 'Chamando API fast-match/teasers...');
      const res = await fetch('https://api.gotinder.com/v2/fast-match/teasers', {
        headers: { 'X-Auth-Token': token, platform: 'web' }
      });

      if (!res.ok) {
        console.warn(UNBLUR_LOG, 'API retornou status', res.status, res.statusText);
        return;
      }

      const data = await res.json();
      const teasers = data?.data?.results;
      if (!Array.isArray(teasers) || teasers.length === 0) {
        console.log(UNBLUR_LOG, 'Nenhum teaser retornado pela API (ou formato inesperado).');
        return;
      }

      const allPreBlur = teasers.every((t) => t?.user?.pre_blur === true);
      if (allPreBlur && teasers.length > 0) {
        console.warn(UNBLUR_LOG, 'A API retornou apenas fotos com pre_blur: true. O Tinder pode estar servindo a mesma imagem borrada; o desbloqueio pode não ter efeito.');
      }

      const teaserEls = document.querySelectorAll('.Expand.enterAnimationContainer > div:nth-child(1)');
      const len = Math.min(teasers.length, teaserEls.length);

      console.log(UNBLUR_LOG, 'Teasers da API:', teasers.length, '| Cards no DOM:', teaserEls.length, '| Aplicando em:', len, 'card(s).');

      let applied = 0;
      for (let i = 0; i < len; i++) {
        const photoUrl = teasers[i]?.user?.photos?.[0]?.url;
        if (photoUrl && teaserEls[i]) {
          teaserEls[i].style.backgroundImage = `url(${photoUrl})`;
          applied++;
        }
      }
      if (applied > 0) {
        console.log(UNBLUR_LOG, 'Imagens atualizadas:', applied);
      }
    } catch (err) {
      console.warn(UNBLUR_LOG, 'Erro ao desbloquear fotos:', err?.message || err);
    }
  }

  async function main() {
    console.log('AutoSwipe iniciado');

    unblurLikesCards();

    setInterval(() => {
      if (lastDislikeTimestamp) updateLastDislikeCard();
    }, 10000);

    while (true) {
      if (!isPaused) {
        await autoAction();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  asHeader.addEventListener('mousedown', function (e) {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - container.getBoundingClientRect().left;
    offsetY = e.clientY - container.getBoundingClientRect().top;
    asHeader.style.cursor = 'grabbing';
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
      const rect = container.getBoundingClientRect();
      localStorage.setItem('modalPositionLeft', rect.left.toString());
      localStorage.setItem('modalPositionTop', rect.top.toString());
    }
    isDragging = false;
    asHeader.style.cursor = 'move';
  });

  main();
})();