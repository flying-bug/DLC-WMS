let audioCtx = null;

// Phat 1 tieng "ding" ngan (2 note) khi co thong bao realtime moi, tong hop
// bang Web Audio API thay vi tai file mp3. Bao boc try/catch vi trinh duyet
// co the chan AudioContext neu nguoi dung chua tuong tac gi voi trang.
export function playNotificationSound() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const notes = [
      { freq: 880, start: 0, duration: 0.12 },
      { freq: 1318.5, start: 0.1, duration: 0.18 }
    ];

    notes.forEach(({ freq, start, duration }) => {
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + duration);
    });
  } catch {
    // Bo qua neu trinh duyet chan audio (chua co tuong tac nguoi dung, v.v.)
  }
}
