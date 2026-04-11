/**
 * Product Edit Page ProTool for BOOTH — background service worker
 * Chrome DevTools Protocol (CDP) を使って信頼済みマウスイベントを送信し、
 * dnd-kit の PointerSensor でドラッグ＆ドロップを実行する。
 */

const attached = new Set();

// ─── デバッガ管理 ─────────────────────────────────────────────────

async function ensureAttached(tabId) {
  if (attached.has(tabId)) return;
  await chrome.debugger.attach({ tabId }, '1.3');
  attached.add(tabId);
}

async function detach(tabId) {
  if (!attached.has(tabId)) return;
  try {
    await chrome.debugger.detach({ tabId });
  } catch { /* already detached */ }
  attached.delete(tabId);
}

chrome.debugger.onDetach.addListener((source) => {
  attached.delete(source.tabId);
});

// ─── CDP マウスイベント送信 ───────────────────────────────────────

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * マウスドラッグをシミュレートする。
 * steps パラメータでステップ数を指定可能（長距離ドラッグ対応）。
 */
async function performDrag(tabId, fromX, fromY, toX, toY, steps) {
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: fromX, y: fromY,
    button: 'none', buttons: 0,
  });
  await wait(20);

  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: fromX, y: fromY,
    button: 'left', buttons: 1, clickCount: 1,
  });
  await wait(50);

  const STEPS = steps || 8;
  for (let s = 1; s <= STEPS; s++) {
    const x = Math.round(fromX + (toX - fromX) * s / STEPS);
    const y = Math.round(fromY + (toY - fromY) * s / STEPS);
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x, y,
      button: 'left', buttons: 1,
    });
    await wait(10);
  }
  await wait(50);

  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: toX, y: toY,
    button: 'left', buttons: 0, clickCount: 1,
  });
}

// ─── メッセージハンドラ ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = msg.tabId ?? sender.tab?.id;

  if (msg.action === 'attachDebugger') {
    ensureAttached(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'detachDebugger') {
    detach(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'drag') {
    ensureAttached(tabId)
      .then(() => performDrag(tabId, msg.fromX, msg.fromY, msg.toX, msg.toY, msg.steps))
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
