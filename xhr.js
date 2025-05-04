import { isOnline } from './network.js';
import { fakeResponse } from './utils.js';

export function patchXHR(queue) {
  const OriginalXHR = window.XMLHttpRequest;

  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    let method = 'GET';
    let url = '';

    const open = xhr.open;
    xhr.open = function (_method, _url, ...rest) {
      method = _method;
      url = _url;
      open.call(this, _method, _url, ...rest);
    };

    const send = xhr.send;
    xhr.send = function (body) {
      if (!isOnline() && method !== 'GET') {
        console.log('[OfflineLayer] Queued XHR request:', method, url);
        queue.enqueue([url, { method, body }]);
        this.readyState = 4;
        this.status = 202;
        this.responseText = JSON.stringify({ message: 'Offline. Request queued.' });
        this.onreadystatechange?.();
        this.onload?.();
      } else {
        send.call(this, body);
      }
    };

    return xhr;
  };
}

