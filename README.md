just click https://rrr22456789.github.io/droplink/ and share anything
# ⚡ DropLink — Secure P2P File & Chat Transfer

DropLink is a **zero-server, peer-to-peer file sharing and chat app**. Two people connect directly through a short room code (or a QR scan) and exchange files and messages straight from browser to browser — nothing is ever uploaded to a server, so there's no file-size limit and no waiting on uploads.

**Live demo:** [rrr22456789.github.io/droplink](https://rrr22456789.github.io/droplink/)

---

## ✨ Features

- **Instant P2P transfer** — files move directly between browsers using WebRTC (via [PeerJS](https://peerjs.com/)), not through a server.
- **No size limits, no sign-up** — just open the site, share your code, done.
- **Live chat** alongside file transfer, with per-message copy and delivery/progress indicators.
- **Drag & drop or attach** files from the composer.
- **QR code connect** — scan instead of typing the room code.
- **Session recovery** — reconnects automatically after a refresh, and restores your recent chat history from local storage.
- **Floating pill topbar** — once you're in a chat, the peer info, attach button, theme toggle, and disconnect button live in a single compact, floating pill instead of a bulky header — and it stays fixed in place no matter how far you scroll the conversation.
- **Dark / light mode** — toggle from the pill; your choice is remembered on your next visit.
- **Composer always visible** — the message box is pinned to the bottom of the screen and can never get scrolled or pushed out of view, even on mobile.

---

## 🛠 Tech Stack

- **Vanilla HTML / CSS / JavaScript** — no build step, no framework.
- **[PeerJS](https://peerjs.com/)** — wraps WebRTC for peer discovery and data channels.
- **[qrcodejs](https://davidshimjs.github.io/qrcodejs/)** — generates the connect QR code.
- **`localStorage`** — remembers your peer ID, active session, chat history, and theme preference across refreshes.

---

## 📁 Project Structure

```
droplink/
├── index.html          # App shell: markup, styles, and core connection/chat logic
├── droplink-plus.js     # Extension layer: QR code UI, session recovery, chat history persistence
└── README.md
```

---

## 🚀 Running Locally

DropLink is a static site — no build tools or backend required.

```bash
git clone https://github.com/rrr22456789/droplink.git
cd droplink
# then just open index.html in a browser, or serve it:
python3 -m http.server 8000
```

Open `http://localhost:8000` in two different browser tabs/devices to test a connection between two "peers."

> **Note:** WebRTC connections generally work best over `https://` (or `localhost`). When deploying, use a static host like GitHub Pages, Netlify, or Vercel.

---

## 🔌 How It Works

1. On load, each visitor is assigned a short random **room code** (a PeerJS peer ID), generated client-side and reused across sessions via `localStorage`.
2. To connect, one person shares their code (or QR) and the other pastes it in and hits **Connect**.
3. PeerJS negotiates a direct WebRTC connection between the two browsers.
4. Once connected, text messages and files are sent as binary/JSON chunks straight over that peer-to-peer data channel — the server (PeerJS's signaling broker) is only used to help the two browsers find each other, never to relay content.
5. Files are streamed in chunks with live progress, then reassembled and offered as a downloadable blob on the receiving end.

---

## 🔒 Privacy

Because transfers happen directly between browsers, your files and messages never touch a third-party server or get stored anywhere outside the two devices involved in the session.

---

## 📄 License

No license specified yet — add one if you plan to open this up for contributions or reuse.
