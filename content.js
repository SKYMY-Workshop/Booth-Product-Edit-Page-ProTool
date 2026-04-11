// Product Edit Page ProTool for BOOTH - Content Script (Auto Apply + Price Changer)

(function() {
  'use strict';

  // ===== 1. 入力欄拡張機能 =====

  // 固定設定値
  const SETTINGS = {
    width: 100,       // %
    minHeight: 200,   // px
    maxWidth: '720px' // 実際の表示幅
  };

  function enhanceEditor() {
    // 幅の計算式
    const calculatedWidth = `calc(${SETTINGS.width}% / 0.875)`;

    // 見出し入力欄の拡張
    const inputs = document.querySelectorAll('.charcoal-text-field-input, input[type="text"]');
    inputs.forEach(input => {
      // 既に適用済みならスキップ（重複適用防止）
      if (input.dataset.enhanced === 'true') return;

      input.style.cssText += `
        width: ${calculatedWidth} !important;
        max-width: ${SETTINGS.maxWidth} !important;
      `;
      input.dataset.enhanced = 'true';
    });

    // テキストエリアの拡張（自動伸長対応）
    const textareas = document.querySelectorAll('.charcoal-text-area-textarea, textarea');
    textareas.forEach(textarea => {
      if (textarea.dataset.enhanced === 'true') return;

      // CSS field-sizing を適用
      textarea.style.cssText += `
        width: ${calculatedWidth} !important;
        max-width: ${SETTINGS.maxWidth} !important;
        min-height: ${SETTINGS.minHeight}px !important;
        field-sizing: content !important;
        height: auto !important;
        resize: none !important;

        /* フォント調整 */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
      `;

      // 親コンテナの制限を解除
      const container = textarea.closest('.charcoal-text-area-container');
      if (container) {
        container.style.cssText += `
          height: fit-content !important;
          min-height: auto !important;
        `;
      }

      textarea.dataset.enhanced = 'true';
    });
  }

  // 監視と実行（DOMの変化を検知して適用）
  const observer = new MutationObserver((mutations) => {
    let shouldEnhance = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) shouldEnhance = true;
    });
    if (shouldEnhance) enhanceEditor();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 初期実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceEditor);
  } else {
    enhanceEditor();
  }

  // ===== 2. ヘルプテキスト非表示トグル =====

  // 非表示にするヘルプテキストのキーワード（部分一致）
  const HELP_TEXT_KEYWORDS = [
    '1番目の画像が商品一覧のサムネイル',
    'スペック（',
    '埋め込みコンテンツ」で',
    '商品の公開後、一部の決済手段については',
    '二次創作作品のライセンス許諾を受けた販売について',
    '即売会などのイベントで頒布した',
    '海外への販売のため',
    'タグは、検索キーワードとしてだけでなく',
  ];

  const STORAGE_KEY = 'booth-ext-help-hidden';

  function isHelpElement(el) {
    const text = el.textContent;
    return HELP_TEXT_KEYWORDS.some(keyword => text.includes(keyword));
  }

  function getHelpElements() {
    const elements = [];

    // border-l-4 の情報ボックス
    document.querySelectorAll('div.border-l-4').forEach(el => {
      if (isHelpElement(el)) elements.push(el);
    });

    // #description 内の説明テキスト（textarea の前にある .text-14.grid.gap-8）
    const descSection = document.getElementById('description');
    if (descSection) {
      descSection.querySelectorAll(':scope > div.text-14').forEach(el => {
        if (el.classList.contains('grid') && isHelpElement(el)) {
          elements.push(el);
        }
      });
    }

    return elements;
  }

  function applyHelpVisibility(hidden) {
    const elements = getHelpElements();
    elements.forEach(el => {
      el.style.display = hidden ? 'none' : '';
    });
  }

  function createToggleButton() {
    if (document.getElementById('booth-ext-help-toggle')) return;

    const isHidden = localStorage.getItem(STORAGE_KEY) === 'true';

    const btn = document.createElement('button');
    btn.id = 'booth-ext-help-toggle';
    btn.className = 'booth-ext-help-toggle-btn';
    btn.textContent = isHidden ? 'ヘルプ表示' : 'ヘルプ非表示';
    btn.dataset.hidden = isHidden ? 'true' : 'false';

    btn.addEventListener('click', () => {
      const nowHidden = btn.dataset.hidden === 'true';
      const newState = !nowHidden;
      btn.dataset.hidden = String(newState);
      btn.textContent = newState ? 'ヘルプ表示' : 'ヘルプ非表示';
      localStorage.setItem(STORAGE_KEY, String(newState));
      applyHelpVisibility(newState);
    });

    document.body.appendChild(btn);

    // 初期状態を適用
    if (isHidden) {
      applyHelpVisibility(true);
    }
  }

  // MutationObserver のコールバックにヘルプ非表示の再適用を追加
  const helpObserver = new MutationObserver(() => {
    const isHidden = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isHidden) applyHelpVisibility(true);
    createToggleButton();
  });

  helpObserver.observe(document.body, { childList: true, subtree: true });
  createToggleButton();

  // ===== 2b. 限定販売数非表示トグル =====

  const PURCHASE_LIMIT_KEY = 'booth-ext-purchase-limit-hidden';

  function applyPurchaseLimitVisibility(hidden) {
    const el = document.getElementById('purchaseLimit');
    if (el) {
      el.style.display = hidden ? 'none' : '';
    }
  }

  function createPurchaseLimitToggle() {
    if (document.getElementById('booth-ext-purchase-limit-toggle')) return;

    const isHidden = localStorage.getItem(PURCHASE_LIMIT_KEY) === 'true';

    const btn = document.createElement('button');
    btn.id = 'booth-ext-purchase-limit-toggle';
    btn.className = 'booth-ext-help-toggle-btn booth-ext-purchase-limit-toggle-btn';
    btn.textContent = isHidden ? '限定販売数 表示' : '限定販売数 非表示';
    btn.dataset.hidden = isHidden ? 'true' : 'false';

    btn.addEventListener('click', () => {
      const nowHidden = btn.dataset.hidden === 'true';
      const newState = !nowHidden;
      btn.dataset.hidden = String(newState);
      btn.textContent = newState ? '限定販売数 表示' : '限定販売数 非表示';
      localStorage.setItem(PURCHASE_LIMIT_KEY, String(newState));
      applyPurchaseLimitVisibility(newState);
    });

    document.body.appendChild(btn);

    if (isHidden) {
      applyPurchaseLimitVisibility(true);
    }
  }

  const purchaseLimitObserver = new MutationObserver(() => {
    const isHidden = localStorage.getItem(PURCHASE_LIMIT_KEY) === 'true';
    if (isHidden) applyPurchaseLimitVisibility(true);
    createPurchaseLimitToggle();
  });

  purchaseLimitObserver.observe(document.body, { childList: true, subtree: true });
  createPurchaseLimitToggle();

  // ===== 2c. おすすめタグ非表示トグル =====

  const RECOMMEND_TAG_KEY = 'booth-ext-recommend-tag-hidden';

  function getRecommendTagElements() {
    const elements = [];
    document.querySelectorAll('label.text-14.font-bold').forEach(label => {
      if (label.textContent.includes('おすすめタグ')) {
        const parent = label.closest('div.grid.gap-8');
        if (parent) elements.push(parent);
      }
    });
    return elements;
  }

  function applyRecommendTagVisibility(hidden) {
    getRecommendTagElements().forEach(el => {
      el.style.display = hidden ? 'none' : '';
    });
  }

  function createRecommendTagToggle() {
    if (document.getElementById('booth-ext-recommend-tag-toggle')) return;

    const isHidden = localStorage.getItem(RECOMMEND_TAG_KEY) === 'true';

    const btn = document.createElement('button');
    btn.id = 'booth-ext-recommend-tag-toggle';
    btn.className = 'booth-ext-help-toggle-btn booth-ext-recommend-tag-toggle-btn';
    btn.textContent = isHidden ? 'おすすめタグ 表示' : 'おすすめタグ 非表示';
    btn.dataset.hidden = isHidden ? 'true' : 'false';

    btn.addEventListener('click', () => {
      const nowHidden = btn.dataset.hidden === 'true';
      const newState = !nowHidden;
      btn.dataset.hidden = String(newState);
      btn.textContent = newState ? 'おすすめタグ 表示' : 'おすすめタグ 非表示';
      localStorage.setItem(RECOMMEND_TAG_KEY, String(newState));
      applyRecommendTagVisibility(newState);
    });

    document.body.appendChild(btn);

    if (isHidden) {
      applyRecommendTagVisibility(true);
    }
  }

  const recommendTagObserver = new MutationObserver(() => {
    const isHidden = localStorage.getItem(RECOMMEND_TAG_KEY) === 'true';
    if (isHidden) applyRecommendTagVisibility(true);
    createRecommendTagToggle();
  });

  recommendTagObserver.observe(document.body, { childList: true, subtree: true });
  createRecommendTagToggle();

  // ===== 3. セクション折りたたみ機能 =====

  const DEFAULT_COLLAPSE_KEY = 'booth-ext-default-collapse';

  function isDefaultCollapseEnabled() {
    return localStorage.getItem(DEFAULT_COLLAPSE_KEY) === 'true';
  }

  function createCollapseBtn(label) {
    const defaultCollapsed = isDefaultCollapseEnabled();
    const btn = document.createElement('button');
    btn.className = 'booth-ext-collapse-btn';
    btn.textContent = defaultCollapsed ? '▶' : '▼';
    btn.dataset.collapsed = String(defaultCollapsed);
    btn.title = defaultCollapsed ? `${label}を展開` : `${label}を折りたたむ`;
    return btn;
  }

  function toggleCollapse(btn, targets, mode) {
    const collapsed = btn.dataset.collapsed === 'true';
    const newState = !collapsed;
    btn.dataset.collapsed = String(newState);
    btn.textContent = newState ? '▶' : '▼';
    applyCollapse(targets, newState, mode);
  }

  // mode: 'hide' = 完全非表示, 'image-row' = 一行分のみ, 'lines' = 数行のみ
  function applyCollapse(targets, collapsed, mode) {
    targets.forEach(el => {
      if (mode === 'hide') {
        el.style.display = collapsed ? 'none' : '';
      } else if (mode === 'image-row') {
        if (collapsed) {
          el.style.maxHeight = '120px';
          el.style.overflow = 'hidden';
        } else {
          el.style.maxHeight = '';
          el.style.overflow = '';
        }
      } else if (mode === 'lines') {
        if (collapsed) {
          el.style.maxHeight = '4.8em';
          el.style.overflow = 'hidden';
        } else {
          el.style.maxHeight = '';
          el.style.overflow = '';
        }
      }
    });
  }

  function setupCollapseSections() {
    // --- 商品画像セクション ---
    const imageLabels = document.querySelectorAll('label.text-14.font-bold');
    imageLabels.forEach(label => {
      if (label.textContent.trim() !== '商品画像') return;
      if (label.dataset.collapseSetup === 'true') return;
      label.dataset.collapseSetup = 'true';

      const container = label.closest('div.grid.gap-8');
      if (!container) return;

      // ラベルの横にボタンを配置
      const wrapper = document.createElement('div');
      wrapper.className = 'booth-ext-collapse-label-row';
      label.parentNode.insertBefore(wrapper, label);
      wrapper.appendChild(label);
      const btn = createCollapseBtn('商品画像');
      wrapper.appendChild(btn);

      // 画像エリア = label の兄弟要素
      const targets = [];
      let sibling = wrapper.nextElementSibling;
      while (sibling) {
        targets.push(sibling);
        sibling = sibling.nextElementSibling;
      }

      if (isDefaultCollapseEnabled()) applyCollapse(targets, true, 'image-row');

      btn.addEventListener('click', () => toggleCollapse(btn, targets, 'image-row'));
    });

    // --- 商品紹介文セクション ---
    const descSection = document.getElementById('description');
    if (descSection && descSection.dataset.collapseSetup !== 'true') {
      descSection.dataset.collapseSetup = 'true';

      const descLabel = descSection.querySelector(':scope > label.text-14.font-bold');
      if (descLabel) {
        const wrapper = document.createElement('div');
        wrapper.className = 'booth-ext-collapse-label-row';
        descLabel.parentNode.insertBefore(wrapper, descLabel);
        wrapper.appendChild(descLabel);
        const btn = createCollapseBtn('商品紹介文');
        wrapper.appendChild(btn);

        // textareaのルート要素を対象（ヘルプテキストは除外）
        const targets = [];
        const textAreaRoot = descSection.querySelector('.charcoal-text-area-root');
        if (textAreaRoot) targets.push(textAreaRoot);

        if (isDefaultCollapseEnabled()) applyCollapse(targets, true, 'lines');

        btn.addEventListener('click', () => toggleCollapse(btn, targets, 'lines'));
      }
    }

    // --- 段落・ダウンロード商品セクション ---
    // variation-box-head を持つ全ての li を対象にする
    const headButtons = document.querySelectorAll('button.variation-box-head');
    headButtons.forEach((head) => {
      const module = head.closest('li');
      if (!module) return;
      if (module.dataset.collapseSetup === 'true') return;
      module.dataset.collapseSetup = 'true';

      const headDiv = head.querySelector('div.flex');
      if (!headDiv) return;

      const sortableDiv = head.closest('div[role="button"]');
      if (!sortableDiv) return;
      const contentDiv = sortableDiv.querySelector(':scope > div.bg-white');
      if (!contentDiv) return;

      // ヘッダーのラベルテキストを取得（「段落」「ダウンロード商品」など）
      const labelSpan = headDiv.querySelector('span.text-14.font-bold');
      const labelText = labelSpan ? labelSpan.textContent.trim() : '';

      const btn = createCollapseBtn(labelText);
      btn.classList.add('booth-ext-collapse-btn-module');
      headDiv.appendChild(btn);

      // プレビュー用span（段落の場合は見出しテキスト、ダウンロード商品の場合はバリエーション名）
      const preview = document.createElement('span');
      preview.className = 'booth-ext-collapse-preview';
      preview.style.display = 'none';
      headDiv.appendChild(preview);

      function getPreviewText() {
        const titleInput = contentDiv.querySelector('input.charcoal-text-field-input');
        return titleInput ? titleInput.value : '';
      }

      function updatePreview(isCollapsed) {
        if (isCollapsed) {
          preview.textContent = getPreviewText();
          preview.style.display = '';
        } else {
          preview.textContent = '';
          preview.style.display = 'none';
        }
      }

      // ドラッグよりボタンクリックを優先させる
      ['mousedown', 'pointerdown', 'touchstart'].forEach(evtName => {
        btn.addEventListener(evtName, (e) => {
          e.stopPropagation();
        });
      });

      const targets = [contentDiv];

      if (isDefaultCollapseEnabled()) {
        applyCollapse(targets, true, 'hide');
        updatePreview(true);
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleCollapse(btn, targets, 'hide');
        updatePreview(btn.dataset.collapsed === 'true');
      });
    });
  }

  // MutationObserver で動的要素にも対応
  const collapseObserver = new MutationObserver(() => {
    setupCollapseSections();
  });
  collapseObserver.observe(document.body, { childList: true, subtree: true });
  setupCollapseSections();

  // ===== 4. バリエーション価格一括変更機能 =====

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getVariations") {
      const variations = getVariations();
      sendResponse({ variations });
    } else if (request.action === "setPrices") {
      setPrices(request.prices);
      sendResponse({ success: true });
    } else if (request.action === "getHelpHidden") {
      const hidden = localStorage.getItem(STORAGE_KEY) === 'true';
      sendResponse({ hidden });
    } else if (request.action === "setHelpHidden") {
      const hidden = request.hidden;
      localStorage.setItem(STORAGE_KEY, String(hidden));
      applyHelpVisibility(hidden);
      // ページ上のトグルボタンも同期
      const btn = document.getElementById('booth-ext-help-toggle');
      if (btn) {
        btn.dataset.hidden = String(hidden);
        btn.textContent = hidden ? 'ヘルプ表示' : 'ヘルプ非表示';
      }
      sendResponse({ success: true });
    } else if (request.action === "getPurchaseLimitHidden") {
      const hidden = localStorage.getItem(PURCHASE_LIMIT_KEY) === 'true';
      sendResponse({ hidden });
    } else if (request.action === "setPurchaseLimitHidden") {
      const hidden = request.hidden;
      localStorage.setItem(PURCHASE_LIMIT_KEY, String(hidden));
      applyPurchaseLimitVisibility(hidden);
      const btn = document.getElementById('booth-ext-purchase-limit-toggle');
      if (btn) {
        btn.dataset.hidden = String(hidden);
        btn.textContent = hidden ? '限定販売数 表示' : '限定販売数 非表示';
      }
      sendResponse({ success: true });
    } else if (request.action === "getRecommendTagHidden") {
      const hidden = localStorage.getItem(RECOMMEND_TAG_KEY) === 'true';
      sendResponse({ hidden });
    } else if (request.action === "setRecommendTagHidden") {
      const hidden = request.hidden;
      localStorage.setItem(RECOMMEND_TAG_KEY, String(hidden));
      applyRecommendTagVisibility(hidden);
      const btn = document.getElementById('booth-ext-recommend-tag-toggle');
      if (btn) {
        btn.dataset.hidden = String(hidden);
        btn.textContent = hidden ? 'おすすめタグ 表示' : 'おすすめタグ 非表示';
      }
      sendResponse({ success: true });
    } else if (request.action === "getDefaultCollapse") {
      const enabled = localStorage.getItem(DEFAULT_COLLAPSE_KEY) === 'true';
      sendResponse({ enabled });
    } else if (request.action === "setDefaultCollapse") {
      localStorage.setItem(DEFAULT_COLLAPSE_KEY, String(request.enabled));
      sendResponse({ success: true });
    } else if (request.action === "getSortVariations") {
      const ul = getSortVariationList();
      if (!ul) { sendResponse({ names: [] }); return true; }
      sendResponse({ names: getSortItems(ul).map(getSortVariationName) });
    } else if (request.action === "getSortProgress") {
      sendResponse(sortProgress);
    } else if (request.action === "startSort") {
      sortProgress = { message: '⏳ 開始します...', done: false, error: false };
      sortVariations();
      sendResponse({ started: true });
    } else if (request.action === "cancelSort") {
      sortCancelled = true;
      sendResponse({ ok: true });
    }
    return true;
  });

  function getVariations() {
    const variations = [];
    const priceInputs = document.querySelectorAll('div[id^="variationDigitalPrice-"] input.charcoal-text-field-input');

    priceInputs.forEach((priceInput) => {
      const priceDiv = priceInput.closest('div[id^="variationDigitalPrice-"]');
      const variationId = priceDiv.id.replace("variationDigitalPrice-", "");

      const nameInput = document.querySelector(
        `#variationName-${variationId} input.charcoal-text-field-input`
      );
      const name = nameInput ? nameInput.value : `バリエーション ${variationId}`;
      const price = priceInput.value;

      variations.push({ id: variationId, name, price });
    });

    return variations;
  }

  function setPrices(prices) {
    prices.forEach(({ id, price }) => {
      const input = document.querySelector(
        `#variationDigitalPrice-${id} input.charcoal-text-field-input`
      );
      if (!input) return;

      // Reactの内部プロパティを経由して値を設定する
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      ).set;
      nativeInputValueSetter.call(input, price);

      // React が検知できるようにイベントを発火する
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  // ===== 5. バリエーション並び替え機能 =====

  let sortProgress = { message: '待機中', done: false, error: false };
  let sortCancelled = false;

  function sortSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getSortVariationList() {
    const input = document.querySelector('[id^="variationName-"] input[type="text"]');
    return input ? input.closest('ul') : null;
  }

  function getSortItems(ul) {
    if (!ul) return [];
    return [...ul.querySelectorAll(':scope > li')].filter(li =>
      li.querySelector('[id^="variationName-"] input[type="text"]')
    );
  }

  function getSortVariationName(li) {
    const input = li.querySelector('[id^="variationName-"] input[type="text"]');
    return input ? input.value : '';
  }

  function getSortDragHandle(li) {
    return li.querySelector('button.variation-box-head') ||
           li.querySelector('button[class*="cursor-grab"]');
  }

  function extractSortKey(name) {
    const m = name.match(/[A-Za-z][A-Za-z0-9 ]*/);
    return m ? m[0].trim().toLowerCase() : name;
  }

  function sendSortDrag(fromX, fromY, toX, toY, steps) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'drag', fromX, fromY, toX, toY, steps },
        (res) => resolve(res)
      );
    });
  }

  function attachSortDebugger() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'attachDebugger' }, (res) => resolve(res));
    });
  }

  function detachSortDebugger() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'detachDebugger' }, (res) => resolve(res));
    });
  }

  /**
   * items[idx] を1つ上へ swap する（items[idx] と items[idx-1] を入れ替え）。
   */
  async function swapUp(ul, idx) {
    const items = getSortItems(ul);
    const handle      = getSortDragHandle(items[idx]);
    const handleAbove = getSortDragHandle(items[idx - 1]);

    if (!handle || !handleAbove) return false;

    handle.scrollIntoView({ block: 'center', behavior: 'instant' });
    await sortSleep(50);

    const rect      = handle.getBoundingClientRect();
    const rectAbove = handleAbove.getBoundingClientRect();

    const fromX = Math.round(rect.left + rect.width / 2);
    const fromY = Math.round(rect.top  + rect.height / 2);
    const toX   = Math.round(rectAbove.left + rectAbove.width / 2);
    const toY   = Math.round(rectAbove.top  - 5);

    const res = await sendSortDrag(fromX, fromY, toX, toY, 8);
    if (!res?.ok) return false;

    await sortSleep(200);
    return true;
  }

  async function sortVariations() {
    sortCancelled = false;

    const ul = getSortVariationList();
    if (!ul) {
      sortProgress = { message: '❌ バリエーションリストが見つかりません', done: false, error: true };
      return;
    }

    const allItems = getSortItems(ul);
    const totalCount = allItems.length;

    if (totalCount <= 2) {
      sortProgress = { message: '✅ 並び替え不要（ソート対象が1件以下）', done: true, error: false };
      return;
    }

    const currentNames = allItems.map(li => getSortVariationName(li));
    const sortableEntries = currentNames.slice(1).map((name) => ({
      name,
      key: extractSortKey(name),
    }));

    sortableEntries.sort((a, b) => {
      const aIsAlpha = /^[a-z]/.test(a.key);
      const bIsAlpha = /^[a-z]/.test(b.key);
      if (aIsAlpha && !bIsAlpha) return -1;
      if (!aIsAlpha && bIsAlpha) return 1;
      if (!aIsAlpha && !bIsAlpha) return a.key.localeCompare(b.key, 'ja');
      return a.key.localeCompare(b.key, 'en');
    });

    const targetOrder = sortableEntries.map(e => e.name);

    // 必要な swap 回数を事前計算（表示用）
    const currentOrder = currentNames.slice(1);
    let estimatedSwaps = 0;
    const simulated = [...currentOrder];
    for (let i = 0; i < targetOrder.length; i++) {
      if (simulated[i] === targetOrder[i]) continue;
      const j = simulated.indexOf(targetOrder[i], i + 1);
      if (j === -1) continue;
      estimatedSwaps += (j - i);
      const item = simulated.splice(j, 1)[0];
      simulated.splice(i, 0, item);
    }

    if (estimatedSwaps === 0) {
      sortProgress = { message: '✅ すでに正しい順番です', done: true, error: false };
      return;
    }

    sortProgress = {
      message: `📋 目標順序:\n` +
        sortableEntries.map((e, i) => `  ${i + 1}. [${e.key}] ${e.name}`).join('\n') +
        `\n\n推定 ${estimatedSwaps} 回の swap が必要`,
      done: false, error: false,
    };
    await sortSleep(500);

    sortProgress = { message: '⏳ デバッガを接続中...', done: false, error: false };
    const attachRes = await attachSortDebugger();
    if (!attachRes?.ok) {
      sortProgress = {
        message: '❌ デバッガの接続に失敗しました: ' + (attachRes?.error || '不明なエラー'),
        done: false, error: true,
      };
      return;
    }
    await sortSleep(150);

    let swapCount = 0;

    try {
      for (let targetPos = 1; targetPos < totalCount; targetPos++) {
        if (sortCancelled) {
          sortProgress = { message: `⛔ キャンセルしました（${swapCount} 回 swap 済み）`, done: false, error: true };
          return;
        }

        const items = getSortItems(ul);
        if (items.length !== totalCount) {
          sortProgress = { message: '❌ アイテム数が変わりました', done: false, error: true };
          return;
        }

        const targetName = targetOrder[targetPos - 1];
        const targetKey  = sortableEntries[targetPos - 1].key;
        const currentName = getSortVariationName(items[targetPos]);

        if (currentName === targetName) continue;

        // 目的のアイテムが今どこにあるか探す
        let foundAt = -1;
        for (let k = targetPos + 1; k < totalCount; k++) {
          if (getSortVariationName(items[k]) === targetName) {
            foundAt = k;
            break;
          }
        }

        if (foundAt === -1) {
          for (let k = 0; k < totalCount; k++) {
            if (getSortVariationName(items[k]) === targetName) {
              foundAt = k;
              break;
            }
          }
          if (foundAt === -1) {
            sortProgress = { message: `❌ "${targetName}" が見つかりません`, done: false, error: true };
            return;
          }
        }

        // 1つずつ上へ swap して目標位置まで移動
        const MAX_SWAPS = 50;
        let swapsForThis = 0;

        while (swapsForThis < MAX_SWAPS) {
          if (sortCancelled) {
            sortProgress = { message: `⛔ キャンセルしました（${swapCount} 回 swap 済み）`, done: false, error: true };
            return;
          }

          const freshItems = getSortItems(ul);
          let currentPos = -1;
          for (let k = 0; k < freshItems.length; k++) {
            if (getSortVariationName(freshItems[k]) === targetName) {
              currentPos = k;
              break;
            }
          }

          if (currentPos === -1) {
            sortProgress = { message: `❌ "${targetName}" が見つかりません`, done: false, error: true };
            return;
          }

          if (currentPos === targetPos) break;
          if (currentPos <= targetPos) break;

          sortProgress = {
            message: `🔄 [${targetKey}] を ${targetPos}番目へ移動中\n` +
              `現在 ${currentPos}番目（残り ${currentPos - targetPos}, swap ${swapCount}/${estimatedSwaps}）`,
            done: false, error: false,
          };

          const ok = await swapUp(ul, currentPos);
          if (!ok) {
            sortProgress = { message: `❌ swap 失敗 (位置 ${currentPos})`, done: false, error: true };
            return;
          }

          swapCount++;
          swapsForThis++;
        }
      }

      sortProgress = {
        message: `✅ 完了！ ${swapCount} 回の swap で並び替えました`,
        done: true, error: false,
      };
    } finally {
      await detachSortDebugger();
    }
  }
})();