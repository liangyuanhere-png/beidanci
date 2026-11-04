/* Bundled dictionary recordings first; local device voices cover custom words and sentences. */
window.LumiAudio = (() => {
  const synth = window.speechSynthesis;
  let audio = null;
  let utterance = null;
  let generation = 0;
  let changed = () => {};
  const library = window.LUMI_RECORDINGS || {};

  function voices() {
    try {
      return (synth?.getVoices() || []).filter(voice => /^en(?:[-_]|$)/i.test(voice.lang) && voice.localService !== false
        && !/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Fred|Good News|Jester|Junior|Kathy|Organ|Ralph|Trinoids|Whisper|Wobble|Zarvox)$/i.test(voice.name))
        .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
    } catch { return []; }
  }

  function rank(voice) {
    const name = voice.name || '';
    return (/premium|natural|neural|siri/i.test(name) ? 100 : 0)
      + (/enhanced|高质量|增强|优质/i.test(name) ? 60 : 0)
      + (/ava|samantha|serena|daniel|alex/i.test(name) ? 10 : 0)
      + (/^en[-_]US$/i.test(voice.lang) ? 5 : 0);
  }

  function stop() {
    generation++;
    if (audio) { audio.pause(); audio.src = ''; audio = null; }
    synth?.cancel();
    utterance = null;
  }

  function speakSystem(text, settings, notify, token) {
    if (token !== generation) return;
    if (!synth || !window.SpeechSynthesisUtterance) return notify('当前浏览器不支持系统朗读');
    const available = voices();
    const selected = available.find(voice => voice.voiceURI === settings.voice) || available[0];
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selected?.lang || 'en-US';
    if (selected) utterance.voice = selected;
    utterance.rate = Number(settings.speechRate) || .95;
    utterance.pitch = 1;
    utterance.onend = () => { if (token === generation) utterance = null; };
    utterance.onerror = event => {
      if (token === generation && !['interrupted', 'canceled'].includes(event.error)) {
        notify('系统英语语音暂不可用，请在手机设置中下载英语语音');
      }
    };
    try { synth.resume(); synth.speak(utterance); }
    catch { notify('朗读未能启动，请再次点击发音按钮'); }
  }

  function speak(text, settings, notify = () => {}, force = false) {
    if (!settings.sound && !force) return;
    stop();
    const token = generation;
    const recording = settings.audioSource !== 'system' && library[String(text).toLowerCase()];
    if (!recording) return speakSystem(text, settings, notify, token);
    const player = audio = new Audio(recording.file);
    player.playbackRate = Number(settings.speechRate) || .95;
    let failed = false;
    const fallback = () => {
      if (failed || token !== generation) return;
      failed = true;
      player.pause();
      if (audio === player) audio = null;
      speakSystem(text, settings, notify, token);
    };
    player.onerror = fallback;
    player.onended = () => { if (audio === player) audio = null; };
    try { player.play()?.catch(fallback); }
    catch { fallback(); }
  }

  function description(word) {
    const recording = library[String(word).toLowerCase()];
    return recording ? `词典真人录音 · ${recording.accent}${recording.ipa ? ' · ' + recording.ipa : ''}` : '优选系统英语语音';
  }

  synth?.addEventListener('voiceschanged', () => changed());
  voices();
  return { speak, stop, voices, description, count: Object.keys(library).length,
    onVoicesChanged(callback) { changed = callback; } };
})();
