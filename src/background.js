/**
 * Booth Product Edit Page ProTool — background service worker / background script
 *
 * Chrome: Chrome DevTools Protocol (CDP) を使って信頼済みマウスイベントを送信し、
 *         dnd-kit の PointerSensor でドラッグ＆ドロップを実行する。
 * Firefox: CDP が利用できないため、コンテンツスクリプト側で PointerEvent を
 *          直接 dispatch する方式にフォールバックする。
 */

// ─── ブラウザ検出 ─────────────────────────────────────────────────
const IS_FIREFOX = typeof chrome.debugger === 'undefined';

// ─── Chrome: デバッガ管理 ────────────────────────────────────────

const attached = new Set();

async function ensureAttached(tabId) {
  if (IS_FIREFOX) return;
  if (attached.has(tabId)) return;
  await chrome.debugger.attach({ tabId }, '1.3');
  attached.add(tabId);
}

async function detach(tabId) {
  if (IS_FIREFOX) return;
  if (!attached.has(tabId)) return;
  try {
    await chrome.debugger.detach({ tabId });
  } catch { /* already detached */ }
  attached.delete(tabId);
}

if (!IS_FIREFOX) {
  chrome.debugger.onDetach.addListener((source) => {
    attached.delete(source.tabId);
  });
}

// ─── Chrome: CDP マウスイベント送信 ──────────────────────────────

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * マウスドラッグをシミュレートする（Chrome 専用: CDP 経由）。
 * steps パラメータでステップ数を指定可能（長距離ドラッグ対応）。
 */
async function performDragCDP(tabId, fromX, fromY, toX, toY, steps) {
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
    if (IS_FIREFOX) {
      // Firefox ではデバッガ不要 — コンテンツスクリプト側でドラッグを実行
      sendResponse({ ok: true, firefox: true });
      return true;
    }
    ensureAttached(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'detachDebugger') {
    if (IS_FIREFOX) {
      sendResponse({ ok: true });
      return true;
    }
    detach(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'drag') {
    if (IS_FIREFOX) {
      // Firefox: コンテンツスクリプトへ転送して PointerEvent で処理
      chrome.tabs.sendMessage(tabId, {
        action: 'firefoxDrag',
        fromX: msg.fromX, fromY: msg.fromY,
        toX: msg.toX, toY: msg.toY,
        steps: msg.steps,
      }, (res) => sendResponse(res));
      return true;
    }
    ensureAttached(tabId)
      .then(() => performDragCDP(tabId, msg.fromX, msg.fromY, msg.toX, msg.toY, msg.steps))
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
