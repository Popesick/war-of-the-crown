/*
 * Voice output for in-game texts. Strategy per line:
 *   1. if a recorded file exists  assets/audio/voice/<lang>/<id>.mp3  -> play it
 *   2. else fall back to browser text-to-speech (speechSynthesis)
 * Voice has its own on/off + volume + rate (see settings).
 */
(function () {
  const W = window.WOTC;
  const S = W.settings;
  const synthOk = 'speechSynthesis' in window;
  let currentAudio = null;
  const voice = {
    recorded: {}, // id -> true when assets/audio/voice/<lang>/<id>.mp3 is known to exist (mods may fill this)
    available() { return synthOk ? speechSynthesis.getVoices() : []; },
    voicesForLang(lang) { return voice.available().filter((v) => v.lang.toLowerCase().startsWith(lang)); },
    cancel() {
      if (synthOk) speechSynthesis.cancel();
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    },
    /** speak(text, {id, lang}) */
    speak(text, opts) {
      opts = opts || {};
      const v = S.data.voice;
      if (!v.on || v.vol <= 0 || !text) return;
      voice.cancel();
      const lang = opts.lang || S.data.lang;
      if (opts.id && voice.recorded[opts.id]) {
        const a = new Audio('assets/audio/voice/' + lang + '/' + opts.id + '.mp3');
        a.volume = W.util.clamp(v.vol * S.data.master, 0, 1);
        a.playbackRate = v.rate; currentAudio = a;
        a.play().catch(() => {});
        return;
      }
      if (!synthOk) return;
      const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' ').trim());
      u.lang = lang === 'de' ? 'de-DE' : 'en-GB';
      u.volume = W.util.clamp(v.vol * S.data.master, 0, 1);
      u.rate = v.rate;
      const vs = voice.available();
      const chosen = vs.find((x) => x.voiceURI === v.voiceURI) || vs.find((x) => x.lang.toLowerCase().startsWith(lang));
      if (chosen) u.voice = chosen;
      speechSynthesis.speak(u);
    },
  };
  W.voice = voice;
  W.events.on('settings', (e) => { if (e.path.startsWith('voice') && !S.data.voice.on) voice.cancel(); });
})();
