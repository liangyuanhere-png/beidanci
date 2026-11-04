/* Native iOS switch-label adaptation: ios-haptics, MIT (c) 2025 tijn. See THIRD-PARTY-NOTICES.txt. */
window.LumiTouch = (() => {
  const appleTouch = /iP(hone|ad|od)/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const nativeSwitch = appleTouch && 'switch' in document.createElement('input');
  const vibration = typeof navigator.vibrate === 'function';
  let enabled = true;

  function pulse(kind = 'tap') {
    if (!enabled || !vibration) return false;
    try { return navigator.vibrate(kind === 'success' ? [12, 30, 12] : kind === 'error' ? [24, 35, 24] : 10); }
    catch { return false; }
  }

  function sync(value) {
    enabled = value !== false;
    for (const label of document.querySelectorAll('[data-lumi-haptic]')) {
      if (!enabled || !nativeSwitch) label.remove();
    }
    if (!enabled || !nativeSwitch) return;
    for (const button of document.querySelectorAll('button:not(:disabled)')) {
      if (button.querySelector('[data-lumi-haptic]')) continue;
      const label = document.createElement('label');
      label.dataset.lumiHaptic = '';
      label.setAttribute('aria-hidden', 'true');
      Object.assign(label.style, { position: 'absolute', inset: '0', touchAction: 'manipulation' });
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      Object.assign(input.style, { position: 'absolute', width: '1px', height: '1px', margin: '0', visibility: 'hidden' });
      // Let WebKit toggle the native switch before the app replaces its button DOM.
      label.addEventListener('click', event => event.stopPropagation());
      input.addEventListener('click', event => {
        event.stopPropagation();
        if (enabled && button.isConnected && !button.disabled) button.click();
      });
      label.append(input);
      if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
      button.append(label);
    }
  }

  document.addEventListener('click', event => {
    if (event.isTrusted && event.target.closest('button:not(:disabled)')) pulse();
  }, true);
  return { sync, pulse, supported: nativeSwitch || vibration };
})();
