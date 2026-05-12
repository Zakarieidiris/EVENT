  let eventToken = null;
  let eventData = null;
  let stream = null;
  let scanInterval = null;

  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.tab:${tab === 'admin' ? 'first-child' : 'last-child'}`).classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
  }

  function generateToken(data) {
    const str = JSON.stringify(data) + '::EVENTPASS_SL_SECURE';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'EVSL-' + Math.abs(hash).toString(36).toUpperCase().padStart(8,'0');
  }

  function generateQR() {
    const name = document.getElementById('event-name').value.trim();
    const date = document.getElementById('event-date').value;
    const location = document.getElementById('event-location').value.trim();
    if (!name) { alert('Please enter an event name.'); return; }

    eventData = { name, date, location };
    eventToken = generateToken(eventData);
    localStorage.setItem('eventpass_token', eventToken);
    localStorage.setItem('eventpass_data', JSON.stringify(eventData));

    const payload = JSON.stringify({ token: eventToken, name, date, location });

    document.getElementById('qr-event-name-display').textContent = name;
    document.getElementById('qr-event-detail-display').textContent =
      (date || 'No date set') + ' · ' + (location || 'No location set');
    document.getElementById('token-display').textContent = 'Token: ' + eventToken;
    document.getElementById('event-status-badge').textContent = name.substring(0, 18) + (name.length > 18 ? '...' : '');

    const canvas = document.getElementById('qr-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 200, 200);

    const qrDiv = document.createElement('div');
    qrDiv.style.display = 'none';
    document.body.appendChild(qrDiv);

    new QRCode(qrDiv, {
      text: payload,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
      const img = qrDiv.querySelector('img');
      if (img) {
        const image = new Image();
        image.onload = () => { ctx.drawImage(image, 0, 0, 200, 200); };
        image.src = img.src;
      }
      document.body.removeChild(qrDiv);
    }, 200);

    document.getElementById('qr-output').classList.add('visible');
  }

  function downloadQR() {
    const canvas = document.getElementById('qr-canvas');
    const link = document.createElement('a');
    const name = document.getElementById('event-name').value.trim() || 'event';
    link.download = name.replace(/\s+/g, '-').toLowerCase() + '-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function startScan() {
    const saved = localStorage.getItem('eventpass_token');
    const savedData = localStorage.getItem('eventpass_data');
    if (!saved) {
      alert('No event QR generated yet. Go to Admin tab and create one first.');
      return;
    }
    eventToken = saved;
    if (savedData) eventData = JSON.parse(savedData);

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const video = document.getElementById('video');
      video.srcObject = stream;
      video.play();
      video.classList.add('active');
      document.getElementById('camera-idle').style.display = 'none';
      document.getElementById('scan-overlay').style.display = 'block';
      document.getElementById('btn-scan').style.display = 'none';
      document.getElementById('btn-stop').style.display = 'block';
      document.getElementById('scan-hint').textContent = 'Point camera at the event QR code';

      scanInterval = setInterval(() => decodeFrame(video), 300);
    } catch (err) {
      alert('Camera access denied. Please allow camera access to scan QR codes.\n\n' + err.message);
    }
  }

  function decodeFrame(video) {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    const canvas = document.getElementById('scan-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code) {
      clearInterval(scanInterval);
      validateCode(code.data);
    }
  }

  function validateCode(raw) {
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch(e) {}

    const storedToken = localStorage.getItem('eventpass_token');
    const storedData = localStorage.getItem('eventpass_data');
    const info = storedData ? JSON.parse(storedData) : {};

    const isValid = parsed && parsed.token && parsed.token === storedToken;

    const overlay = document.getElementById('result-overlay');
    const statusEl = document.getElementById('result-status');
    const iconEl = document.getElementById('result-icon');
    const eventNameEl = document.getElementById('result-event-name');
    const pulseEl = document.getElementById('pulse-ring');

    overlay.className = 'result-overlay show';

    if (isValid) {
      overlay.classList.add('valid');
      statusEl.textContent = 'VALID — ENTER';
      statusEl.style.color = '#4ade80';
      iconEl.className = 'ti ti-circle-check';
      iconEl.style.color = '#4ade80';
      pulseEl.className = 'pulse-ring pulse-valid';
      eventNameEl.textContent = (parsed.name || info.name || 'Event') + ' · ' + (parsed.date || info.date || '');
    } else {
      overlay.classList.add('invalid');
      statusEl.textContent = 'INVALID — DENY';
      statusEl.style.color = '#f87171';
      iconEl.className = 'ti ti-ban';
      iconEl.style.color = '#f87171';
      pulseEl.className = 'pulse-ring pulse-invalid';
      eventNameEl.textContent = 'QR code does not match this event';
    }

    if (navigator.vibrate) {
      navigator.vibrate(isValid ? [100, 50, 100] : [300]);
    }
  }

  function dismissResult() {
    document.getElementById('result-overlay').className = 'result-overlay';
    scanInterval = setInterval(() => {
      const video = document.getElementById('video');
      decodeFrame(video);
    }, 300);
  }

  function stopScan() {
    clearInterval(scanInterval);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const video = document.getElementById('video');
    video.classList.remove('active');
    document.getElementById('camera-idle').style.display = 'flex';
    document.getElementById('scan-overlay').style.display = 'none';
    document.getElementById('btn-scan').style.display = 'block';
    document.getElementById('btn-stop').style.display = 'none';
    document.getElementById('scan-hint').textContent = 'Press start to activate the camera';
  }

  const saved = localStorage.getItem('eventpass_data');
  if (saved) {
    const d = JSON.parse(saved);
    document.getElementById('event-status-badge').textContent = d.name.substring(0, 18) + (d.name.length > 18 ? '...' : '');
  }