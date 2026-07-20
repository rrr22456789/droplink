/**
 * DropLink Plus Extension
 * QR auto-pipeline + per-peer persistent chat history + recent chats list
 */

// 1. DYNAMIC QR CODE LIBRARY INJECTION
(function injectQRCodeLib() {
  if (document.getElementById('qr-lib-src')) return;
  const script = document.createElement('script');
  script.id = 'qr-lib-src';
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  script.async = true;
  document.head.appendChild(script);
})();

document.addEventListener('DOMContentLoaded', () => {
  setupQRUI();
  renderRecentChats();
});

// 2. QR MODULE INTERACTION WRAPPER
function setupQRUI() {
  const cardLabel = document.querySelector('.card-label');
  if (!cardLabel) return;

  const card = cardLabel.parentElement;
  const copyRow = card.querySelector('.copy-row');

  const qrWrapper = document.createElement('div');
  qrWrapper.id = 'qr-wrapper';
  qrWrapper.style.cssText = `
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
    padding: 16px;
    background: var(--bg2);
    border: 1px dashed var(--border);
    border-radius: 12px;
    animation: fadeUp 0.4s ease;
  `;

  const qrContainer = document.createElement('div');
  qrContainer.id = 'qrcode';
  qrContainer.style.cssText = `
    padding: 8px;
    background: #fff;
    border-radius: 8px;
    display: inline-block;
  `;

  const qrText = document.createElement('p');
  qrText.textContent = "Scan to connect instantly";
  qrText.style.cssText = "font-size: 0.75rem; color: var(--muted); font-family: 'Space Mono', monospace;";

  qrWrapper.appendChild(qrContainer);
  qrWrapper.appendChild(qrText);

  card.insertBefore(qrWrapper, copyRow);

  if (copyRow) {
    const qrBtn = document.createElement('button');
    qrBtn.className = 'btn btn-ghost btn-sm';
    qrBtn.id = 'toggle-qr-btn';
    qrBtn.innerHTML = '📱 Show QR';
    qrBtn.disabled = true;
    qrBtn.onclick = toggleQRDisplay;
    copyRow.appendChild(qrBtn);
  }
}

function generateQRCode(roomCode) {
  const qrContainer = document.getElementById('qrcode');
  if (!qrContainer) return;

  qrContainer.innerHTML = "";

  const connectionURL = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;

  new QRCode(qrContainer, {
    text: connectionURL,
    width: 140,
    height: 140,
    colorDark: "#080b10",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  const qrBtn = document.getElementById('toggle-qr-btn');
  if (qrBtn) qrBtn.disabled = false;
}

function toggleQRDisplay() {
  const qrWrapper = document.getElementById('qr-wrapper');
  const qrBtn = document.getElementById('toggle-qr-btn');
  if (!qrWrapper) return;

  if (qrWrapper.style.display === 'none') {
    qrWrapper.style.display = 'flex';
    qrBtn.innerHTML = '🙈 Hide QR';
  } else {
    qrWrapper.style.display = 'none';
    qrBtn.innerHTML = '📱 Show QR';
  }
}

// 3. PER-PEER PERSISTENT CHAT HISTORY
// Each conversation is stored under its own key, keyed by the *other* peer's
// code, so History for peer A never leaks into a chat with peer B — and since
// everything lives in this browser's own localStorage, one person can never
// see another person's conversations either.
function chatKey(peerId) { return 'droplink_chat:' + peerId; }

window.addEventListener('messageSaved', (e) => {
  const data = e.detail;
  const peerId = data.peerId;
  if (!peerId) return;

  let history = [];
  try { history = JSON.parse(localStorage.getItem(chatKey(peerId))) || []; } catch (err) { history = []; }
  history.push(data);
  if (history.length > 300) history = history.slice(-300); // keep storage bounded
  localStorage.setItem(chatKey(peerId), JSON.stringify(history));

  updateContact(peerId, data);
});

function loadPersistedChatHistory(peerId) {
  if (!peerId) return;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(chatKey(peerId))) || []; } catch (err) { history = []; }
  if (history.length === 0) return;

  history.forEach(msg => {
    if (msg.type === 'text') {
      if (typeof addTextBubble === 'function') addTextBubble(msg.text, msg.isMine, true);
    } else if (msg.type === 'file') {
      if (typeof addFileBubble === 'function') addFileBubble(msg.id, msg.name, msg.size, msg.isMine, null, true);
    }
  });
}

// 4. RECENT CHATS INDEX (shown on the home screen)
function getContacts() {
  try { return JSON.parse(localStorage.getItem('droplink_contacts')) || {}; } catch (err) { return {}; }
}
function setContacts(contacts) {
  localStorage.setItem('droplink_contacts', JSON.stringify(contacts));
}

function updateContact(peerId, data) {
  const contacts = getContacts();
  const preview = data.type === 'file' ? ('📁 ' + data.name) : data.text;
  contacts[peerId] = {
    peerId,
    preview: (preview || '').slice(0, 60),
    mine: !!data.isMine,
    time: Date.now()
  };
  setContacts(contacts);
  renderRecentChats();
}

function deleteConversation(peerId, evt) {
  if (evt) evt.stopPropagation();
  localStorage.removeItem(chatKey(peerId));
  const contacts = getContacts();
  delete contacts[peerId];
  setContacts(contacts);
  renderRecentChats();
}
window.deleteConversation = deleteConversation;

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return min + 'm';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + 'd';
  return new Date(ts).toLocaleDateString();
}

function renderRecentChats() {
  const section = document.getElementById('recent-section');
  const list = document.getElementById('recent-list');
  if (!section || !list) return;

  const contacts = Object.values(getContacts()).sort((a, b) => b.time - a.time);

  if (contacts.length === 0) {
    section.classList.remove('has-items');
    list.innerHTML = '';
    return;
  }

  section.classList.add('has-items');
  list.innerHTML = contacts.map(c => {
    const shortId = c.peerId.slice(0, 8);
    const prefix = c.mine ? 'You: ' : '';
    return `
      <div class="recent-item" onclick="resumeChat('${c.peerId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" role="button" tabindex="0">
        <div class="recent-avatar">${shortId[0] || '?'}</div>
        <div class="recent-meta">
          <div class="recent-id">${shortId}</div>
          <div class="recent-preview">${escapeHtml(prefix + (c.preview || ''))}</div>
        </div>
        <div class="recent-time">${timeAgo(c.time)}</div>
        <div class="recent-delete" onclick="deleteConversation('${c.peerId}', event)" title="Remove from history" aria-label="Remove conversation">✕</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function resumeChat(peerId) {
  const joinBtn = document.getElementById('join-btn');
  if (joinBtn && joinBtn.disabled) {
    if (typeof showToast === 'function') showToast('Still getting ready — try again in a second', 'error');
    return;
  }
  const joinInput = document.getElementById('join-input');
  if (joinInput) joinInput.value = peerId;
  if (typeof joinPeer === 'function') joinPeer(peerId);
}
window.resumeChat = resumeChat;

// 5. SESSION RECOVERY (auto-reconnect after a refresh)
function saveActiveSession(peerId, targetPeerId) {
  localStorage.setItem('droplink_my_id', peerId);
  if (targetPeerId) {
    localStorage.setItem('droplink_target_id', targetPeerId);
  }
}

function clearSession() {
  // Only clears the "auto-resume on refresh" pointer — conversation history
  // and the recent-chats list are kept so past chats stay browsable from home.
  localStorage.removeItem('droplink_target_id');
}

function runSessionRecoveryPipeline() {
  const urlParams = new URLSearchParams(window.location.search);
  const scanJoinCode = urlParams.get('join');

  if (scanJoinCode) {
    window.history.replaceState({}, document.title, window.location.pathname);

    const joinInput = document.getElementById('join-input');
    if (joinInput) {
      joinInput.value = scanJoinCode;
      if (typeof joinPeer === 'function') joinPeer();
    }
  } else {
    const savedTarget = localStorage.getItem('droplink_target_id');
    if (savedTarget && typeof joinPeer === 'function') {
      const joinInput = document.getElementById('join-input');
      if (joinInput) {
        joinInput.value = savedTarget;
        joinPeer();
      }
    }
  }
}

// 6. INTERCEPTION EVENTS & SYNC LIFECYCLE HOOKS
window.addEventListener('peerReady', (e) => {
  const localizedMyId = e.detail.myId;
  localStorage.setItem('droplink_my_id', localizedMyId);
  generateQRCode(localizedMyId);

  setTimeout(() => {
    runSessionRecoveryPipeline();
  }, 300);
});

// Redraws the transcript from scratch so the panel always matches storage exactly —
// this is what stops duplicate bubbles from piling up every time a peer reconnects
// (each reconnect calls openChatScreen again, which used to just keep appending).
function resetMessagesArea() {
  const area = document.getElementById('messages-area');
  if (!area) return;
  area.innerHTML = '<div class="empty-state" id="empty-state"><div class="empty-icon">💬</div><div>Send a message or drop a file to start</div></div>';
}

window.addEventListener('load', () => {
  if (typeof openChatScreen === 'function') {
    const originalOpenChat = openChatScreen;
    window.openChatScreen = function(peerId, isIncoming) {
      originalOpenChat(peerId, isIncoming);
      if (typeof myId !== 'undefined') {
        saveActiveSession(myId, peerId);
      }
      // Always rebuild the panel from the saved transcript for this peer —
      // never append on top of whatever bubbles are already sitting in the DOM.
      resetMessagesArea();
      loadPersistedChatHistory(peerId);
    };
  }

  if (typeof disconnectPeer === 'function') {
    const originalDisconnect = disconnectPeer;
    window.disconnectPeer = function() {
      clearSession();
      originalDisconnect();
      renderRecentChats();
    };
  }
});
