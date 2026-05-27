/**
 * DropLink Plus Extension
 * Fixed: Waiting pipeline optimization for stable sync after PeerJS registers online state
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

  // Direct deployment routing link builder
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

// 3. SECURE RECOVERY ENGINE (Ensures own peer is ready before connecting)
function saveActiveSession(peerId, targetPeerId) {
  localStorage.setItem('droplink_my_id', peerId);
  if (targetPeerId) {
    localStorage.setItem('droplink_target_id', targetPeerId);
  }
}

function clearSession() {
  localStorage.removeItem('droplink_target_id');
}

function runSessionRecoveryPipeline() {
  const urlParams = new URLSearchParams(window.location.search);
  const scanJoinCode = urlParams.get('join');

  if (scanJoinCode) {
    // URL parametric stack clean to prevent refresh loops
    window.history.replaceState({}, document.title, window.location.pathname);
    
    const joinInput = document.getElementById('join-input');
    if (joinInput) {
      joinInput.value = scanJoinCode;
      console.log("QR Scan detected, trigger automated pipeline sequence for room:", scanJoinCode);
      if (typeof joinPeer === 'function') joinPeer();
    }
  } else {
    // Local storage persistence recovery path
    const savedTarget = localStorage.getItem('droplink_target_id');
    if (savedTarget && typeof joinPeer === 'function') {
      const joinInput = document.getElementById('join-input');
      if (joinInput) {
        joinInput.value = savedTarget;
        console.log("Persistent context reload matched, auto reconnecting to:", savedTarget);
        joinPeer();
      }
    }
  }
}

// 4. PIPELINE EVENTS LISTENERS INTERCEPTIONS
window.addEventListener('peerReady', (e) => {
  const localizedMyId = e.detail.myId;
  localStorage.setItem('droplink_my_id', localizedMyId);
  generateQRCode(localizedMyId);
  
  // CRITICAL FIX: Jab system completely ready/online bolega, tabhi call execute hoga.
  setTimeout(() => {
    runSessionRecoveryPipeline();
  }, 300);
});

window.addEventListener('load', () => {
  // Hook openChatScreen to preserve state values safely
  if (typeof openChatScreen === 'function') {
    const originalOpenChat = openChatScreen;
    window.openChatScreen = function(peerId, isIncoming) {
      originalOpenChat(peerId, isIncoming);
      if (typeof myId !== 'undefined') {
        saveActiveSession(myId, peerId);
      }
    };
  }

  // Hook disconnect parameters
  if (typeof disconnectPeer === 'function') {
    const originalDisconnect = disconnectPeer;
    window.disconnectPeer = function() {
      originalDisconnect();
      clearSession();
    };
  }
});
