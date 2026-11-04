window.LumiOffline = (() => {
  let text = '正在准备离线词库与发音，请保持联网。';
  let changed = () => {};
  let registration;
  function update(message) { text = message; changed(); }
  function watch(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') worker.postMessage({ type: 'lumi-status' });
      if (worker.state === 'redundant') update('离线资源尚未保存完整，请联网重新打开。');
    });
    if (worker.state === 'activated') worker.postMessage({ type: 'lumi-status' });
  }
  async function start() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) {
      return update('当前打开方式不支持完整离线缓存，请用 Safari 打开网站并添加到主屏幕。');
    }
    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data;
      if (data?.type !== 'lumi-offline') return;
      if (data.ready) update('离线词库与真人发音已准备好，可以断网使用。');
      else if (data.error) update('离线资源未能完整保存，请保持联网后重新打开。');
      else update(`正在保存离线资源 ${data.done} / ${data.total}，请保持联网。`);
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      navigator.serviceWorker.controller?.postMessage({ type: 'lumi-status' });
    });
    try {
      registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      registration.addEventListener('updatefound', () => watch(registration.installing));
      watch(registration.installing || registration.waiting || registration.active);
    } catch { update('离线缓存暂不可用，请保持联网使用并定期备份。'); }
  }
  return { start, message: () => text, onChange(callback) { changed = callback; } };
})();
