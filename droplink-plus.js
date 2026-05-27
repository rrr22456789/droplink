/**
 * DropLink Plus - Extension for QR Code & Refresh-Resistant Connections
 * Main HTML script ko bina corrupt kiye background enhancements manage karne ke liye.
 */

// Dynamic QR Code Library Injection
(function injectQRCodeLib() {
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  script.async = true;
  document.head.appendChild(script);
})();

document.addEventListener('DOMContentLoaded', () => {
  // UI me QR code container inject karna (Your Room Code card ke andar)
  setupQRUI();
  
  // Auto Reconnect Check on Refresh
  checkSessionRecovery();
});

// 1. QR CODE LOGIC
function setupQRUI() {
  const cardLabel = document.querySelector('.card-label'); // First card target
  if (!cardLabel) return;

  const card = cardLabel.parentElement;
  const copyRow = card.querySelector('.copy-row');

  // QR Code UI structure build karna
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
  
  // Element ko Copy Row ke upar insert karna
  card.insertBefore(qrWrapper, copyRow);

  // Ek dynamic Toggle QR button copy row me add karna
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

  qrContainer.innerHTML = ""; // Purana QR clear karo

  // Current URL ke sath room code attach karke join link banana
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

// 2. REFRESH & RECOVERY LOGIC (Local Storage)
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
  // Check URL if launched via QR Scan
  const urlParams = new URLSearchParams(window.location.search);
  const scanJoinCode = urlParams.get('join');

  if (scanJoinCode) {
    // Clear URL query parameters subtly
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Auto fill and try connect
    const joinInput = document.getElementById('join-input');
    if (joinInput) {
      joinInput.value = scanJoinCode;
      // Wait for peer init then connect
      setTimeout(() => {
        if (typeof joinPeer === 'function') joinPeer();
      }, 1500);
    }
  } else {
    // Standard recovery from LocalStorage
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

// Global hooks inject karne ke liye custom listeners interceptor
window.addEventListener('load', () => {
  // Override openChatScreen to preserve state on success connection
  if (typeof openChatScreen === 'function') {
    const originalOpenChat = openChatScreen;
    window.openChatScreen = function(peerId, isIncoming) {
      originalOpenChat(peerId, isIncoming);
      saveActiveSession(myId, peerId);
    };
  }

  // Override disconnect to clear session data
  if (typeof disconnectPeer === 'function') {
    const originalDisconnect = disconnectPeer;
    window.disconnectPeer = function() {
      originalDisconnect();
      clearSession();
    };
  }
  
  // Intercept open status to build QR code automatically
  if (peer) {
    peer.on('open', id => {
      generateQRCode(id);
      // Agar active node refresh hua tha to state handle karega
      localStorage.setItem('droplink_my_id', id);
    });
  }
});
