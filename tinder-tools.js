// ==UserScript==
// @name         Tinder Tools
// @name:pt      Tinder Tools
// @name:pt-BR   Tinder Tools

// @description  Block button, chat search and pin chat features for Tinder.
// @description:pt Botão de bloqueio rápido, busca de conversa e fixar chats no Tinder.
// @description:pt-BR Botão de bloqueio rápido, busca de conversa e fixar chats no Tinder.

// @version      1.1.0
// @namespace    https://greasyfork.org/users/1416065
// @author       Nox
// @license      MIT

// @match        https://tinder.com/*
// @compatible   chrome
// @compatible   firefox
// @grant        none
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tinder.com
// ==/UserScript==

(function () {
  'use strict';

  // === i18n ===
  let uiLang = localStorage.getItem('tinderToolsLang') || localStorage.getItem('autoswipeLang') || 'pt';

  const T = {
    pt: {
      blockButton: 'Bloquear Usuário',
      blockingUser: 'Bloqueando...',
      blockSuccess: 'bloqueado com sucesso!',
      blockError: 'Erro ao bloquear. Tente novamente.',
      blockNotFound: 'Botão de bloqueio não encontrado.',
      searchChats: 'Buscar conversa...',
      pinChat: 'Fixar no topo',
      unpinChat: 'Desafixar',
      pinnedLabel: 'Fixados',
    },
    en: {
      blockButton: 'Block User',
      blockingUser: 'Blocking...',
      blockSuccess: 'blocked successfully!',
      blockError: 'Error blocking. Try again.',
      blockNotFound: 'Block button not found.',
      searchChats: 'Search chat...',
      pinChat: 'Pin to top',
      unpinChat: 'Unpin',
      pinnedLabel: 'Pinned',
    },
  };

  function t(key) {
    return T[uiLang]?.[key] ?? T.pt[key] ?? key;
  }

  // === Toast ===
  function showToast(message, color) {
    color = color || '#4caf50';
    const toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed',
      'bottom:30px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:99999',
      `background-color:${color}`,
      'color:white',
      'padding:14px 28px',
      'border-radius:8px',
      'font-family:Arial,sans-serif',
      'font-size:14px',
      'font-weight:bold',
      'box-shadow:0 4px 12px rgba(0,0,0,0.5)',
      'transition:opacity 0.5s',
      'opacity:1',
      'pointer-events:none',
      'white-space:nowrap',
    ].join(';');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () {
        if (document.body.contains(toast)) document.body.removeChild(toast);
      }, 500);
    }, 3500);
  }

  // ============================================================
  // === Bloquear Usuário (página /app/messages/:id) ===
  // ============================================================

  function injectBlockButton() {
    if (document.getElementById('tindertools-block-btn')) return;

    const photoContainer = document.querySelector('.react-aspect-ratio-placeholder');
    if (!photoContainer) return;

    const tinderNativeBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
      return /^Bloquear\s+\S/.test(b.textContent.trim());
    });
    const name = tinderNativeBtn
      ? tinderNativeBtn.textContent.trim().replace(/^Bloquear\s+/, '')
      : '';

    const btn = document.createElement('button');
    btn.id = 'tindertools-block-btn';
    btn.textContent = 'Bloquear ' + name;
    btn.style.cssText =
      'display:block;width:100%;padding:14px 24px;background:#b71c1c;color:#fff;border:none;font-weight:bold;font-size:15px;cursor:pointer;font-family:Arial,sans-serif;transition:background 0.2s;';
    btn.addEventListener('mouseenter', function () { btn.style.background = '#d32f2f'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = '#b71c1c'; });
    btn.addEventListener('click', function () { blockCurrentUser(btn); });

    photoContainer.insertAdjacentElement('afterend', btn);
  }

  async function blockCurrentUser(btn) {
    const originalText = btn.textContent;
    btn.textContent = t('blockingUser');
    btn.disabled = true;

    try {
      const tinderBlockBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
        return /^Bloquear\s+\S/.test(b.textContent.trim());
      });

      if (!tinderBlockBtn) {
        showToast(t('blockNotFound'), '#f44336');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      const userName = tinderBlockBtn.textContent.trim().replace(/^Bloquear\s+/, '');
      tinderBlockBtn.click();

      let confirmBtn = null;
      for (let i = 0; i < 20; i++) {
        confirmBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
          return b.textContent.trim().includes('Sim, bloquear');
        });
        if (confirmBtn) break;
        await new Promise(function (r) { setTimeout(r, 150); });
      }

      if (!confirmBtn) {
        showToast(t('blockError'), '#f44336');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      confirmBtn.click();

      let valeuBtn = null;
      for (let i = 0; i < 20; i++) {
        valeuBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
          return b.textContent.trim() === 'Valeu';
        });
        if (valeuBtn) break;
        await new Promise(function (r) { setTimeout(r, 150); });
      }

      if (valeuBtn) valeuBtn.click();

      showToast(userName + ' ' + t('blockSuccess'));
    } catch (err) {
      console.error('[TinderTools] Erro ao bloquear:', err);
      showToast(t('blockError'), '#f44336');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  (function watchForBlockTarget() {
    let lastPath = location.pathname;
    function checkPath() {
      const path = location.pathname;
      if (path !== lastPath) {
        lastPath = path;
        const old = document.getElementById('tindertools-block-btn');
        if (old) old.remove();
      }
      if (path.includes('/app/messages/')) {
        injectBlockButton();
      }
    }
    setInterval(checkPath, 500);
  })();

  // ============================================================
  // === Busca e Fixar Chats (página /app/messages) ===
  // ============================================================

  const PINNED_CHATS_KEY = 'tinderToolsPinnedChats';
  // Migrar pinned chats da chave antiga do autoswipe (se existir)
  let pinnedChats = JSON.parse(localStorage.getItem(PINNED_CHATS_KEY) || '[]');
  if (pinnedChats.length === 0) {
    const legacy = localStorage.getItem('autoswipePinnedChats');
    if (legacy) {
      pinnedChats = JSON.parse(legacy);
      localStorage.setItem(PINNED_CHATS_KEY, JSON.stringify(pinnedChats));
      localStorage.removeItem('autoswipePinnedChats');
    }
  }

  function savePinnedChats() {
    localStorage.setItem(PINNED_CHATS_KEY, JSON.stringify(pinnedChats));
  }

  function getChatId(li) {
    const a = li.querySelector('a[href*="/app/messages/"]');
    if (!a) return null;
    const m = (a.getAttribute('href') || '').match(/\/app\/messages\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function getChatName(li) {
    const span = li.querySelector('.messageListItem__name');
    if (span) return span.textContent.trim();
    const a = li.querySelector('a[aria-label]');
    return a ? (a.getAttribute('aria-label') || '') : '';
  }

  let _chatListObserver = null;

  function applyChatListState(ul, searchValue) {
    if (_chatListObserver) _chatListObserver.disconnect();

    ul.querySelectorAll('.tindertools-chat-sep').forEach(el => el.remove());

    const items = Array.from(ul.querySelectorAll(':scope > li'));
    const pinnedItems = [];
    const unpinnedItems = [];
    items.forEach(li => {
      const id = getChatId(li);
      if (id && pinnedChats.includes(id)) pinnedItems.push(li);
      else unpinnedItems.push(li);
    });

    pinnedItems.sort((a, b) => pinnedChats.indexOf(getChatId(a)) - pinnedChats.indexOf(getChatId(b)));

    const frag = document.createDocumentFragment();
    if (pinnedItems.length > 0) {
      const sep = document.createElement('li');
      sep.className = 'tindertools-chat-sep';
      sep.style.cssText =
        'padding:6px 20px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.08em;pointer-events:none;user-select:none;';
      sep.textContent = t('pinnedLabel');
      frag.appendChild(sep);
      pinnedItems.forEach(li => frag.appendChild(li));
    }
    unpinnedItems.forEach(li => frag.appendChild(li));
    ul.appendChild(frag);

    const query = searchValue.toLowerCase().trim();
    [...pinnedItems, ...unpinnedItems].forEach(li => {
      const name = getChatName(li).toLowerCase();
      li.style.display = !query || name.includes(query) ? '' : 'none';
    });

    if (_chatListObserver) {
      _chatListObserver.observe(ul, { childList: true, subtree: false });
    }
  }

  function addPinButton(li, ul, searchInput) {
    if (li.dataset.tindertoolsPin) return;
    const id = getChatId(li);
    if (!id) return;
    li.dataset.tindertoolsPin = '1';
    li.style.position = 'relative';

    const btn = document.createElement('button');
    btn.style.cssText =
      'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(20,20,20,0.88);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:opacity 0.15s;z-index:10;padding:0;';

    const refresh = () => {
      const pinned = pinnedChats.includes(id);
      btn.textContent = pinned ? '📌' : '📍';
      btn.title = pinned ? t('unpinChat') : t('pinChat');
      btn.style.opacity = pinned ? '1' : '0';
    };
    refresh();

    li.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    li.addEventListener('mouseleave', () => {
      if (!pinnedChats.includes(id)) btn.style.opacity = '0';
    });

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const idx = pinnedChats.indexOf(id);
      if (idx === -1) pinnedChats.unshift(id);
      else pinnedChats.splice(idx, 1);
      savePinnedChats();
      refresh();
      applyChatListState(ul, searchInput.value);
      Array.from(ul.querySelectorAll(':scope > li')).forEach(item =>
        addPinButton(item, ul, searchInput)
      );
    });

    li.appendChild(btn);
  }

  function injectMessageListUI(messageListEl) {
    if (messageListEl.dataset.tindertoolsInit) return;
    messageListEl.dataset.tindertoolsInit = '1';

    const ul = messageListEl.querySelector('ul');
    if (!ul) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'padding:8px 12px;position:sticky;top:0;z-index:100;background:var(--color--background-surface-page,#111);border-bottom:1px solid rgba(255,255,255,0.06);';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = t('searchChats');
    input.style.cssText =
      'width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;color:#fff;padding:8px 16px;font-size:14px;outline:none;font-family:inherit;';
    input.addEventListener('focus', () => { input.style.borderColor = 'rgba(255,255,255,0.4)'; });
    input.addEventListener('blur', () => { input.style.borderColor = 'rgba(255,255,255,0.15)'; });
    input.addEventListener('input', () => applyChatListState(ul, input.value));

    wrapper.appendChild(input);
    messageListEl.insertBefore(wrapper, ul);

    Array.from(ul.querySelectorAll(':scope > li')).forEach(li =>
      addPinButton(li, ul, input)
    );
    applyChatListState(ul, '');

    _chatListObserver = new MutationObserver(() => {
      Array.from(ul.querySelectorAll(':scope > li')).forEach(li =>
        addPinButton(li, ul, input)
      );
      applyChatListState(ul, input.value);
    });
    _chatListObserver.observe(ul, { childList: true, subtree: false });
  }

  function watchForMessageList() {
    const tryInit = () => {
      const el = document.querySelector('.messageList');
      if (el && !el.dataset.tindertoolsInit) injectMessageListUI(el);
    };
    tryInit();
    const obs = new MutationObserver(tryInit);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  watchForMessageList();
  console.log('[TinderTools] iniciado — block button + chat search + pin chat');
})();
