const pageTitle = document.querySelector('#pageTitle');
const pageHost = document.querySelector('#pageHost');
const tableStatus = document.querySelector('#tableStatus');
const tableList = document.querySelector('#tableList');
const exportButton = document.querySelector('#exportTable');
const inspectStatus = document.querySelector('#inspectStatus');
let currentTab = null;
let pageTables = [];
let selectedTableIndex = -1;

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((other) => {
    const active = other === tab;
    other.classList.toggle('active', active);
    other.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-panel-view]').forEach((panel) => { panel.hidden = panel.dataset.panelView !== tab.dataset.panel; });
}));

async function readActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error('这个浏览器页面不允许扩展注入脚本，请切换到普通网页后重试。');
  }
  currentTab = tab;
  pageTitle.textContent = tab.title || '当前网页';
  try { pageHost.textContent = new URL(tab.url).host; } catch { pageHost.textContent = tab.url; }
  return tab;
}

async function prepareContentScript(tab) {
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
}

async function sendToPage(message) {
  const tab = currentTab ?? await readActiveTab();
  await prepareContentScript(tab);
  return chrome.tabs.sendMessage(tab.id, message);
}

function showError(target, error) {
  const message = error?.message || '操作失败，请刷新网页后再试。';
  target.textContent = message.includes('Cannot access') || message.includes('chrome://')
    ? '当前页面受浏览器保护。请在普通网页标签页中使用。'
    : message;
}

function renderTables(tables) {
  tableList.replaceChildren();
  pageTables = tables;
  selectedTableIndex = tables.length ? 0 : -1;
  exportButton.disabled = selectedTableIndex < 0;
  tables.forEach((table, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = `table-option${index === selectedTableIndex ? ' selected' : ''}`;
    const radio = document.createElement('span');
    radio.className = 'radio';
    const copy = document.createElement('span');
    copy.className = 'table-option-copy';
    const title = document.createElement('strong');
    title.textContent = table.caption || `表格 ${index + 1}`;
    const meta = document.createElement('span');
    meta.textContent = `${table.rowCount} 行 · 最多 ${table.columnCount} 列`;
    copy.append(title, meta);
    option.append(radio, copy);
    option.addEventListener('click', () => {
      selectedTableIndex = index;
      renderTables(pageTables);
    });
    tableList.append(option);
  });
}

document.querySelector('#readTables').addEventListener('click', async () => {
  tableStatus.textContent = '正在读取页面中的表格…';
  try {
    const response = await sendToPage({ type: 'JS_TOOLBOX_GET_TABLES' });
    renderTables(response?.tables ?? []);
    tableStatus.textContent = pageTables.length ? `找到 ${pageTables.length} 个表格，选择一个导出。` : '没有找到可见的标准 HTML 表格。';
  } catch (error) {
    showError(tableStatus, error);
  }
});

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function safeFilename(host) {
  const cleanedHost = (host || 'webpage').replace(/[^a-z0-9.-]+/gi, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `table-${cleanedHost}-${stamp}.csv`;
}

exportButton.addEventListener('click', async () => {
  const table = pageTables[selectedTableIndex];
  if (!table) return;
  const csv = `\uFEFF${table.rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  try {
    await chrome.downloads.download({ url, filename: safeFilename(currentTab?.url ? new URL(currentTab.url).host : ''), saveAs: true });
    tableStatus.textContent = '已开始导出 CSV。';
  } catch (error) {
    tableStatus.textContent = `下载失败：${error.message}`;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
});

document.querySelector('#startInspect').addEventListener('click', async () => {
  inspectStatus.textContent = '正在连接当前网页…';
  try {
    await sendToPage({ type: 'JS_TOOLBOX_START_INSPECT' });
    inspectStatus.textContent = '已启动。回到网页，将鼠标移到元素上并点击查看详情。';
  } catch (error) {
    showError(inspectStatus, error);
  }
});

let latestJson = '';
const scrapeStatus = document.querySelector('#scrapeStatus');
const scrapePreview = document.querySelector('#scrapePreview');
const jsonSize = document.querySelector('#jsonSize');
const copyJsonButton = document.querySelector('#copyJson');
const downloadJsonButton = document.querySelector('#downloadJson');

document.querySelector('#scrapePage').addEventListener('click', async () => {
  scrapeStatus.textContent = '正在提取当前网页内容…';
  try {
    const include = Object.fromEntries([...document.querySelectorAll('[data-scrape]')].map((input) => [input.dataset.scrape, input.checked]));
    const custom = {
      recordSelector: document.querySelector('#recordSelector').value.trim(),
      title: document.querySelector('#fieldTitle').value.trim(),
      price: document.querySelector('#fieldPrice').value.trim(),
      link: document.querySelector('#fieldLink').value.trim(),
      image: document.querySelector('#fieldImage').value.trim()
    };
    const response = await sendToPage({ type: 'JS_TOOLBOX_SCRAPE_JSON', options: { include, custom } });
    if (response?.error) throw new Error(response.error);
    latestJson = JSON.stringify(response.data, null, 2);
    scrapePreview.textContent = latestJson;
    const bytes = new Blob([latestJson]).size;
    jsonSize.textContent = `${latestJson.length.toLocaleString()} 字符 · ${bytes.toLocaleString()} 字节`;
    copyJsonButton.disabled = false;
    downloadJsonButton.disabled = false;
    const summary = response.summary ?? {};
    const parts = Object.entries(summary).filter(([, count]) => Number(count) > 0 || String(count).startsWith('≥')).map(([name, count]) => `${name} ${count}`);
    scrapeStatus.textContent = `抓取完成${parts.length ? `：${parts.join(' · ')}` : ''}${response.truncated ? ' · 部分内容已截断' : ''}`;
  } catch (error) {
    latestJson = '';
    scrapePreview.textContent = '抓取失败，请检查页面或 CSS 选择器。';
    jsonSize.textContent = '尚无数据';
    copyJsonButton.disabled = true;
    downloadJsonButton.disabled = true;
    showError(scrapeStatus, error);
  }
});

copyJsonButton.addEventListener('click', () => {
  if (!latestJson) return;
  const helper = document.createElement('textarea');
  helper.value = latestJson;
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand('copy');
  helper.remove();
  scrapeStatus.textContent = copied ? 'JSON 已复制到剪贴板。' : '复制失败，请手动选择预览内容。';
});

downloadJsonButton.addEventListener('click', async () => {
  if (!latestJson) return;
  const host = currentTab?.url ? new URL(currentTab.url).host.replace(/[^a-z0-9.-]+/gi, '_') : 'webpage';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const url = URL.createObjectURL(new Blob([latestJson], { type: 'application/json;charset=utf-8' }));
  try {
    await chrome.downloads.download({ url, filename: `page-data-${host}-${stamp}.json`, saveAs: true });
    scrapeStatus.textContent = '已开始下载 JSON 文件。';
  } catch (error) {
    scrapeStatus.textContent = `下载失败：${error.message}`;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
});

readActiveTab().catch((error) => {
  pageTitle.textContent = '无法读取当前页面';
  pageHost.textContent = error.message;
});
