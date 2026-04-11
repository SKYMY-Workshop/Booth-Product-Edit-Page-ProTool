document.addEventListener("DOMContentLoaded", async () => {
  const errorEl = document.getElementById("error");
  const helpToggleSection = document.getElementById("help-toggle-section");
  const helpToggleBtn = document.getElementById("helpToggleBtn");
  const priceSection = document.getElementById("price-section");
  const loadingEl = document.getElementById("loading");
  const variationsEl = document.getElementById("variations");
  const actionsEl = document.getElementById("actions");
  const noVariationsEl = document.getElementById("no-variations");
  const applyBtn = document.getElementById("applyBtn");

  let activeTab = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;

    if (!tab.url || !tab.url.match(/^https:\/\/manage\.booth\.pm\/items\/\d+\/edit/)) {
      errorEl.classList.remove("hidden");
      return;
    }

    // ===== ヘルプトグルセクション =====
    helpToggleSection.classList.remove("hidden");

    // 現在の状態を取得
    const helpState = await chrome.tabs.sendMessage(tab.id, { action: "getHelpHidden" });
    const isHidden = helpState && helpState.hidden;
    helpToggleBtn.dataset.active = isHidden ? "true" : "false";

    helpToggleBtn.addEventListener("click", async () => {
      const currentlyActive = helpToggleBtn.dataset.active === "true";
      const newState = !currentlyActive;
      helpToggleBtn.dataset.active = String(newState);
      await chrome.tabs.sendMessage(tab.id, { action: "setHelpHidden", hidden: newState });
    });

    // ===== デフォルト折りたたみトグル =====
    const defaultCollapseToggleBtn = document.getElementById("defaultCollapseToggleBtn");

    const dcState = await chrome.tabs.sendMessage(tab.id, { action: "getDefaultCollapse" });
    const dcEnabled = dcState && dcState.enabled;
    defaultCollapseToggleBtn.dataset.active = dcEnabled ? "true" : "false";

    defaultCollapseToggleBtn.addEventListener("click", async () => {
      const currentlyActive = defaultCollapseToggleBtn.dataset.active === "true";
      const newState = !currentlyActive;
      defaultCollapseToggleBtn.dataset.active = String(newState);
      await chrome.tabs.sendMessage(tab.id, { action: "setDefaultCollapse", enabled: newState });
    });

    // ===== おすすめタグトグル =====
    const recommendTagToggleBtn = document.getElementById("recommendTagToggleBtn");

    const rtState = await chrome.tabs.sendMessage(tab.id, { action: "getRecommendTagHidden" });
    const rtHidden = rtState && rtState.hidden;
    recommendTagToggleBtn.dataset.active = rtHidden ? "true" : "false";

    recommendTagToggleBtn.addEventListener("click", async () => {
      const currentlyActive = recommendTagToggleBtn.dataset.active === "true";
      const newState = !currentlyActive;
      recommendTagToggleBtn.dataset.active = String(newState);
      await chrome.tabs.sendMessage(tab.id, { action: "setRecommendTagHidden", hidden: newState });
    });

    // ===== 限定販売数トグル =====
    const purchaseLimitToggleBtn = document.getElementById("purchaseLimitToggleBtn");

    const plState = await chrome.tabs.sendMessage(tab.id, { action: "getPurchaseLimitHidden" });
    const plHidden = plState && plState.hidden;
    purchaseLimitToggleBtn.dataset.active = plHidden ? "true" : "false";

    purchaseLimitToggleBtn.addEventListener("click", async () => {
      const currentlyActive = purchaseLimitToggleBtn.dataset.active === "true";
      const newState = !currentlyActive;
      purchaseLimitToggleBtn.dataset.active = String(newState);
      await chrome.tabs.sendMessage(tab.id, { action: "setPurchaseLimitHidden", hidden: newState });
    });

    // ===== 価格変更セクション =====
    priceSection.classList.remove("hidden");

    const response = await chrome.tabs.sendMessage(tab.id, { action: "getVariations" });
    const variations = response.variations;

    loadingEl.classList.add("hidden");

    if (!variations || variations.length === 0) {
      noVariationsEl.classList.remove("hidden");
    } else {
      const groups = groupByPrice(variations);
      renderGroups(groups);
      variationsEl.classList.remove("hidden");
      actionsEl.classList.remove("hidden");

      applyBtn.addEventListener("click", async () => {
        const prices = collectNewPrices();
        if (prices.length === 0) return;

        applyBtn.disabled = true;
        applyBtn.textContent = "適用中...";

        await chrome.tabs.sendMessage(tab.id, { action: "setPrices", prices });

        applyBtn.textContent = "適用しました";
        setTimeout(() => {
          applyBtn.disabled = false;
          applyBtn.textContent = "適用";
        }, 1500);
      });
    }

    // ===== 並び替えセクション =====
    await initSortSection(tab);

  } catch (e) {
    errorEl.classList.remove("hidden");
  }
});

function groupByPrice(variations) {
  const map = new Map();
  variations.forEach((v) => {
    const key = v.price;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(v);
  });
  return map;
}

function renderGroups(groups) {
  const container = document.getElementById("variations");

  groups.forEach((items, price) => {
    const row = document.createElement("div");
    row.className = "variation-row";

    const names = items.map((v) => escapeHtml(v.name)).join("、");
    const ids = items.map((v) => v.id).join(",");

    row.innerHTML = `
      <div class="field-group">
        <div class="variation-names">${names}</div>
        <div class="variation-count">${items.length}件のバリエーション</div>
        <div class="price-fields">
          <input type="text" class="price-input current" value="${escapeHtml(price)}" readonly>
          <span class="price-unit">円</span>
          <span class="arrow">→</span>
          <input type="text" class="price-input new-price" data-ids="${escapeHtml(ids)}" placeholder="新しい価格" inputmode="numeric">
          <span class="price-unit">円</span>
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

function collectNewPrices() {
  const prices = [];
  document.querySelectorAll(".new-price").forEach((input) => {
    const value = input.value.trim();
    if (value === "") return;
    const ids = input.dataset.ids.split(",");
    ids.forEach((id) => {
      prices.push({ id, price: value });
    });
  });
  return prices;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== バリエーション並び替え機能 =====

function extractSortKey(name) {
  const m = name.match(/[A-Za-z][A-Za-z0-9 ]*/);
  return m ? m[0].trim().toLowerCase() : name;
}

function compareSortKeys(a, b) {
  const aIsAlpha = /^[a-z]/.test(a);
  const bIsAlpha = /^[a-z]/.test(b);
  if (aIsAlpha && !bIsAlpha) return -1;
  if (!aIsAlpha && bIsAlpha) return 1;
  if (!aIsAlpha && !bIsAlpha) return a.localeCompare(b, 'ja');
  return a.localeCompare(b, 'en');
}

async function initSortSection(tab) {
  const sortSection = document.getElementById("sort-section");
  const textSortSection = document.getElementById("text-sort-section");
  const sortStatusBox = document.getElementById("sort-status-box");
  const sortPreview = document.getElementById("sort-preview");
  const sortBtn = document.getElementById("sort-btn");
  const sortCancelBtn = document.getElementById("sort-cancel-btn");

  sortSection.classList.remove("hidden");
  textSortSection.classList.remove("hidden");

  // バリエーション並び替え初期化
  let result;
  try {
    result = await chrome.tabs.sendMessage(tab.id, { action: 'getSortVariations' });
  } catch (e) {
    sortStatusBox.textContent = '❌ ページを再読み込みしてください';
    sortStatusBox.style.color = '#e53e3e';
    return;
  }

  if (!result || !result.names || result.names.length === 0) {
    sortStatusBox.textContent = 'バリエーションがありません';
    sortStatusBox.style.color = '#888';
    return;
  }

  const names = result.names;
  sortStatusBox.textContent = `${names.length} 件のバリエーションを検出（1番目は固定）`;
  sortStatusBox.style.color = '#38a169';

  sortPreview.textContent = names.map((n, i) => {
    const key = extractSortKey(n);
    const prefix = i === 0 ? '🔒' : `${i + 1}.`;
    const suffix = key !== n ? ` [${key}]` : '';
    return `${prefix} ${n}${suffix}`;
  }).join('\n');

  const sortable = names.slice(1);
  const sorted = [...sortable].sort((a, b) =>
    compareSortKeys(extractSortKey(a), extractSortKey(b))
  );
  const alreadySorted = sortable.join('\n') === sorted.join('\n');

  if (alreadySorted) {
    sortBtn.textContent = '✅ すでに並び替え済み';
    sortBtn.disabled = true;
    sortBtn.style.background = '#48bb78';
  } else {
    sortBtn.disabled = false;
  }

  let pollTimer = null;

  function showSortingUI() {
    sortBtn.disabled = true;
    sortBtn.style.display = 'none';
    sortCancelBtn.style.display = 'block';
  }

  function showIdleUI() {
    sortBtn.style.display = 'block';
    sortBtn.disabled = false;
    sortCancelBtn.style.display = 'none';
  }

  sortBtn.addEventListener('click', async () => {
    showSortingUI();
    sortStatusBox.textContent = '⏳ 並び替え中... ウィンドウを閉じないでください';
    sortStatusBox.style.color = '#2b6cb0';
    sortPreview.textContent = '';

    chrome.tabs.sendMessage(tab.id, { action: 'startSort' });

    pollTimer = setInterval(async () => {
      let res;
      try {
        res = await chrome.tabs.sendMessage(tab.id, { action: 'getSortProgress' });
      } catch (e) {
        clearInterval(pollTimer);
        showIdleUI();
        return;
      }

      if (!res) return;

      sortStatusBox.textContent = res.message;
      sortStatusBox.style.color = res.done ? '#38a169' : res.error ? '#e53e3e' : '#2b6cb0';

      if (res.done || res.error) {
        clearInterval(pollTimer);

        if (res.error) {
          chrome.runtime.sendMessage({ action: 'detachDebugger', tabId: tab.id });
        }

        showIdleUI();

        if (res.done) {
          await new Promise(r => setTimeout(r, 500));
          const r2 = await chrome.tabs.sendMessage(tab.id, { action: 'getSortVariations' });
          if (r2 && r2.names) {
            sortPreview.textContent = r2.names.map((n, i) => {
              const prefix = i === 0 ? '🔒' : `${i + 1}.`;
              return `${prefix} ${n}`;
            }).join('\n');
            sortBtn.textContent = '✅ すでに並び替え済み';
            sortBtn.disabled = true;
            sortBtn.style.background = '#48bb78';
          }
        }
      }
    }, 400);
  });

  sortCancelBtn.addEventListener('click', async () => {
    chrome.tabs.sendMessage(tab.id, { action: 'cancelSort' });
    if (pollTimer) clearInterval(pollTimer);
    sortStatusBox.textContent = '⛔ キャンセルしました';
    sortStatusBox.style.color = '#e53e3e';
    showIdleUI();
  });

  // テキスト並び替え
  const textInput = document.getElementById('text-input');
  const textOutput = document.getElementById('text-output');
  const textSortBtn = document.getElementById('text-sort-btn');
  const textCopyBtn = document.getElementById('text-copy-btn');
  const textClearBtn = document.getElementById('text-clear-btn');

  /**
   * テキストをパースして商品エントリとショップ名を分離する。
   * - 「・」で始まる行 → 商品エントリの名前行（続くURL行・備考行を含む）
   * - URLを含む行 → 直前の商品エントリに属する
   * - 「※」で始まる行 → 直前の商品エントリの備考
   * - それ以外の非空行 → ショップ名として収集
   */
  function parseEntries(text) {
    const lines = text.split('\n');
    const entries = [];
    const shopNames = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (line === '') {
        i++;
        continue;
      }

      if (line.startsWith('・')) {
        // 商品エントリ：「・」で始まる名前行 + 続くURL・備考行
        const blockLines = [lines[i]];
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          // 次の「・」行または次のショップ名行で区切る
          if (next.startsWith('・')) break;
          // 空行でないURL行・備考行はこのエントリに含める
          if (next !== '' && (next.startsWith('http') || next.startsWith('※') || next.startsWith('　') || next.startsWith('\t'))) {
            // URL行の処理：正規化＋先頭に全角スペース付与
            const raw = lines[i];
            if (next.startsWith('http')) {
              // booth URLを統一形式に変換（例: https://xxx.booth.pm/items/1234 → https://booth.pm/ja/items/1234）
              const urlMatch = next.match(/booth\.pm\/(?:ja\/)?items\/(\d+)/);
              const normalized = urlMatch
                ? 'https://booth.pm/ja/items/' + urlMatch[1]
                : next;
              blockLines.push('　' + normalized);
            } else {
              blockLines.push(raw);
            }
            i++;
          } else {
            break;
          }
        }
        const key = extractSortKey(line);
        entries.push({ text: blockLines.join('\n'), sortKey: key });
      } else {
        // ショップ名（「・」「http」「※」で始まらない非空行）
        shopNames.push(line);
        i++;
      }
    }
    return { entries, shopNames };
  }

  textSortBtn.addEventListener('click', () => {
    const raw = textInput.value.trim();
    if (!raw) return;

    const { entries, shopNames } = parseEntries(raw);
    if (entries.length === 0) {
      textOutput.textContent = '（エントリが見つかりません）';
      return;
    }

    entries.sort((a, b) => compareSortKeys(a.sortKey, b.sortKey));

    let result = entries.map(e => e.text).join('\n');

    // ショップ名がある場合は末尾にまとめて表示
    if (shopNames.length > 0) {
      result += '\n\n' + shopNames.join('\n');
    }

    textOutput.textContent = result;
    textCopyBtn.style.display = 'block';
    textClearBtn.style.display = 'block';
  });

  textCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(textOutput.textContent).then(() => {
      textCopyBtn.textContent = 'コピーしました!';
      setTimeout(() => { textCopyBtn.textContent = 'コピー'; }, 1500);
    });
  });

  textClearBtn.addEventListener('click', () => {
    textInput.value = '';
    textOutput.textContent = '';
    textCopyBtn.style.display = 'none';
    textClearBtn.style.display = 'none';
  });

  // テキスト入力の保存・復元
  const storage = chrome.storage?.local;
  if (storage) {
    storage.get('sortTextInput', (data) => {
      if (data.sortTextInput) textInput.value = data.sortTextInput;
    });

    let saveTimer = null;
    textInput.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        storage.set({ sortTextInput: textInput.value });
      }, 500);
    });
  }
}
