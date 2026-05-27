/**
 * DropLink Plus Extension
 * Implements: Anti-Disconnect Session Persistence & Dynamic Scan-to-Connect QR Code Generation
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
  // Inject QR Elements into layout without structural modification
  setupQRUI();
  
  // Verify and execute state recovery patterns on layout loading
  checkSessionRecovery();
});

// 2. QR MODULE INTERACTION WRAPPER
function setupQRUI() {
  const cardLabel = document.querySelector('.card-label'); 
  if (!cardLabel) return;

  const card = cardLabel.parentElement;
  const copyRow = card.querySelector('.copy-row');

  // Generate container layout wrapper
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

  // Append functional action trigger node inside primary row 
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

  qrContainer.innerHTML = ""; // Flush previous nodes

  // Setup contextual lookup redirect address string
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

// 3. PERSISTENT STATE ARCHITECTURE (ANTI-REFRESH)
function saveActiveSession(peerId, targetPeerId) {
  localStorage.setItem('droplink_my_id', peerId);
  if (targetPeerId) {
    localStorage.setItem('droplink_target_id', targetPeerId);
  }
}

function clearSession() {
  localStorage.removeItem('droplink_target_id');
}

function checkSessionRecovery() {
  const urlParams = new URLSearchParams(window.location.search);
  const scanJoinCode = urlParams.get('join');

  if (scanJoinCode) {
    // URL Cleanup intercept pattern to prevent looping parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    
    const joinInput = document.getElementById('join-input');
    if (joinInput) {
      joinInput.value = scanJoinCode;
      setTimeout(() => {
        if (typeof joinPeer === 'function') joinPeer();
      }, 1500); // Delayed buffer for peer engine stabilization
    }
  } else {
    // LocalStorage checking fallback routing context
    const savedTarget = localStorage.getItem('droplink_target_id');
    if (savedTarget && typeof joinPeer === 'function') {
      const joinInput = document.getElementById('join-input');
      if (joinInput) {
        joinInput.value = savedTarget;
        setTimeout(() => { joinPeer(); }, 1200);
      }
    }
  }
}

// 4. MAIN GLOBAL INTERACTION TRAPS (SAFE INJECTION REWRITING)
window.addEventListener('load', () => {
  // Override primary layout transition trigger to hook memory pipeline
  if (typeof openChatScreen === 'function') {
    const originalOpenChat = openChatScreen;
    window.openChatScreen = function(peerId, isIncoming) {
      originalOpenChat(peerId, isIncoming);
      saveActiveSession(myId, peerId);
    };
  }

  // Intercept disconnect call loop logic
  if (typeof disconnectPeer === 'function') {
    const originalDisconnect = disconnectPeer;
    window.disconnectPeer = function() {
      originalDisconnect();
      clearSession();
    };
  }
  
  // Polling logic pipeline check to bind dynamically once connection object exposes
  const bindInterval = setInterval(() => {
    if (typeof peer !== 'undefined' && peer !== null) {
      peer.on('open', id => {
        generateQRCode(id);
        localStorage.setItem('droplink_my_id', id);
      });
      clearInterval(bindInterval);
    }
  }, 200);
});
