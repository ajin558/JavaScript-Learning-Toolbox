(() => {
  if (globalThis.__jsLearningToolbox?.initialized) return;

  const state = { initialized: true, inspecting: false, host: null, shadow: null, highlight: null, label: null, panel: null, selected: null, moveHandler: null, clickHandler: null };
  globalThis.__jsLearningToolbox = state;

  function ensurePanel() {
    if (state.host?.isConnected) return;
    const host = document.createElement('div');
    host.id = '__js_learning_toolbox_host__';
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box} .highlight{position:fixed;border:2px solid #7565ed;background:rgba(117,101,237,.10);pointer-events:none;display:none;transition:all .04s linear}
        .label{position:fixed;display:none;max-width:320px;padding:4px 7px;border-radius:5px;background:#5849ce;color:#fff;font:11px/1.35 ui-monospace,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;box-shadow:0 2px 8px #19133a55}
        .panel{position:fixed;top:96px;right:20px;width:min(342px,calc(100vw - 24px));max-height:calc(100vh - 112px);overflow:auto;pointer-events:auto;color:#292b40;background:#fff;border:1px solid #e4e5ec;border-radius:14px;box-shadow:0 14px 45px #20233b35;font:12px/1.5 system-ui,"Segoe UI","Microsoft YaHei",sans-serif}
        .head{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:9px;padding:12px 13px;background:#fff;border-bottom:1px solid #eff0f4;cursor:move;touch-action:none}
        .mark{width:27px;height:27px;display:grid;place-items:center;border-radius:8px;color:#fff;background:#6a5ae0;font-weight:700}.head-copy{flex:1;min-width:0}.head-copy b{display:block;font-size:12px}.head-copy span{display:block;color:#9194a4;font-size:9px}.action{border:0;border-radius:7px;padding:6px 8px;background:#f1efff;color:#6253cf;font:600 9px system-ui;cursor:pointer}.close{width:25px;height:25px;border:0;border-radius:7px;background:#f5f5f8;color:#77798b;font-size:16px;cursor:pointer}
        .body{padding:12px 13px 13px}.element-name{font:11px/1.5 ui-monospace,Consolas,monospace;overflow-wrap:anywhere;color:#5e50cf;background:#f6f4ff;border-radius:7px;padding:7px 8px;margin-bottom:10px}.section{font-size:9px;color:#a0a2b0;letter-spacing:.6px;text-transform:uppercase;margin:11px 0 6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.metric{background:#f8f8fb;border:1px solid #f0f0f4;border-radius:7px;padding:7px 8px;min-width:0}.metric span{display:block;color:#9a9cab;font-size:8px;margin-bottom:2px}.metric b{display:block;font-size:10px;font-weight:600;overflow-wrap:anywhere}.swatch{display:inline-block;width:9px;height:9px;border:1px solid #d6d7df;border-radius:3px;vertical-align:-1px;margin-right:5px}.copy-css{width:100%;margin-top:10px;border:1px solid #e7e4fb;border-radius:7px;padding:8px 10px;background:#f6f4ff;color:#5e50cf;font:600 10px system-ui;cursor:pointer}.copy-status{min-height:13px;color:#77798b;font-size:9px;padding-top:5px}.foot{color:#a0a2b0;font-size:8px;padding-top:7px}.mode-on{background:#fff0e8;color:#cd7a43}
      </style>
      <div class="highlight"></div><div class="label"></div>
      <section class="panel" aria-label="网页元素样式检查面板">
        <header class="head"><span class="mark">JS</span><div class="head-copy"><b>网页元素检查</b><span>尺寸 · 布局 · 字体 · 颜色</span></div><button class="action" data-action="toggle">开始选取</button><button class="close" data-action="close" aria-label="关闭">×</button></header>
        <div class="body"><div class="element-name" data-field="selector">将鼠标移到元素上并点击</div><div class="section">尺寸与坐标（CSS px）</div><div class="grid" data-grid="geometry"></div><div class="section">间距与父级布局</div><div class="grid" data-grid="spacing"></div><div class="section">字体与颜色</div><div class="grid" data-grid="font"></div><div class="section">盒模型（上 / 右 / 下 / 左）</div><div class="grid" data-grid="box"></div><button class="copy-css" data-action="copy" type="button">复制此元素的 CSS 样式</button><div class="copy-status" data-field="copy-status" aria-live="polite"></div><div class="foot">坐标随页面滚动更新。间距取最近且方向对齐的同层元素；按 Esc 暂停选取。</div></div>
      </section>`;
    document.documentElement.append(host);
    state.host = host;
    state.shadow = shadow;
    state.highlight = shadow.querySelector('.highlight');
    state.label = shadow.querySelector('.label');
    state.panel = shadow.querySelector('.panel');
    shadow.querySelector('[data-action="toggle"]').addEventListener('click', toggleInspect);
    shadow.querySelector('[data-action="close"]').addEventListener('click', closePanel);
    shadow.querySelector('[data-action="copy"]').addEventListener('click', copySelectedCss);
    enableDrag(shadow.querySelector('.head'));
    state.viewportHandler ??= () => {
      if (state.viewportFrame) return;
      state.viewportFrame = requestAnimationFrame(() => {
        state.viewportFrame = 0;
        if (state.selected?.isConnected) displayElement(state.selected);
        if (state.panel?.style.left) {
          const panelRect = state.panel.getBoundingClientRect();
          state.panel.style.left = `${Math.max(0, Math.min(window.innerWidth - panelRect.width, panelRect.left))}px`;
          state.panel.style.top = `${Math.max(0, Math.min(window.innerHeight - panelRect.height, panelRect.top))}px`;
        }
      });
    };
    window.addEventListener('scroll', state.viewportHandler, true);
    window.addEventListener('resize', state.viewportHandler, true);
  }

  function format(value) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return value;
    return `${Math.round(number * 100) / 100}px`;
  }

  function short(value, limit = 90) {
    const text = String(value || '').trim();
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  function getElement(event) {
    const path = event.composedPath?.() ?? [];
    const candidate = path.find((node) => node instanceof Element && !state.host?.contains(node));
    return candidate instanceof Element ? candidate : event.target instanceof Element ? event.target : null;
  }

  function isPanelEvent(event) {
    return Boolean(state.host && (event.target === state.host || event.composedPath?.().includes(state.host)));
  }

  function elementLabel(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = (element.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((name) => `.${name}`).join('');
    return `${tag}${id}${classes}`;
  }

  function positionHighlight(element) {
    if (!state.highlight || !element) return;
    const rect = element.getBoundingClientRect();
    Object.assign(state.highlight.style, { display: 'block', left: `${Math.max(0, rect.left)}px`, top: `${Math.max(0, rect.top)}px`, width: `${Math.max(0, rect.width)}px`, height: `${Math.max(0, rect.height)}px` });
    state.label.textContent = `${elementLabel(element)} · ${format(rect.width)} × ${format(rect.height)}`;
    state.label.style.display = 'block';
    state.label.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 328))}px`;
    state.label.style.top = `${rect.top > 25 ? rect.top - 24 : rect.bottom + 3}px`;
  }

  function metric(label, value, color = '') {
    const box = document.createElement('div');
    box.className = 'metric';
    const title = document.createElement('span');
    title.textContent = label;
    const content = document.createElement('b');
    if (color) {
      const swatch = document.createElement('i');
      swatch.className = 'swatch';
      swatch.style.background = color;
      content.append(swatch, document.createTextNode(short(value)));
    } else content.textContent = short(value);
    box.append(title, content);
    return box;
  }

  function fillGrid(name, entries) {
    const grid = state.shadow.querySelector(`[data-grid="${name}"]`);
    grid.replaceChildren(...entries.map(([label, value, color]) => metric(label, value, color)));
  }

  function siblingSpacing(element, rect) {
    const gaps = { left: Infinity, right: Infinity, top: Infinity, bottom: Infinity };
    const siblings = element.parentElement?.children ?? [];
    for (const sibling of siblings) {
      if (sibling === element || !isVisible(sibling)) continue;
      const other = sibling.getBoundingClientRect();
      const overlapX = Math.min(rect.right, other.right) - Math.max(rect.left, other.left);
      const overlapY = Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top);
      if (overlapY > 0) {
        if (other.right <= rect.left) gaps.left = Math.min(gaps.left, rect.left - other.right);
        if (other.left >= rect.right) gaps.right = Math.min(gaps.right, other.left - rect.right);
      }
      if (overlapX > 0) {
        if (other.bottom <= rect.top) gaps.top = Math.min(gaps.top, rect.top - other.bottom);
        if (other.top >= rect.bottom) gaps.bottom = Math.min(gaps.bottom, other.top - rect.bottom);
      }
    }
    const labels = { left: '左侧', right: '右侧', top: '上方', bottom: '下方' };
    const entries = Object.entries(gaps).map(([side, value]) => [labels[side], Number.isFinite(value) ? format(value) : '—']);
    const parentStyle = element.parentElement ? getComputedStyle(element.parentElement) : null;
    if (parentStyle) {
      const layout = parentStyle.display.startsWith('flex')
        ? `${parentStyle.display} · ${parentStyle.flexDirection}`
        : parentStyle.display;
      entries.push(['父级布局', layout], ['父级行 / 列间距', `${format(parentStyle.rowGap)} / ${format(parentStyle.columnGap)}`]);
    }
    return entries;
  }

  function uniqueSelector(element) {
    const parts = [];
    let current = element;
    while (current instanceof Element && current !== document.documentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part += `#${CSS.escape(current.id)}`;
        parts.unshift(part);
        const candidate = parts.join(' > ');
        try { if (document.querySelectorAll(candidate).length === 1) break; } catch { /* 继续向上补充路径 */ }
      } else {
        const classes = [...current.classList].slice(0, 2);
        if (classes.length) part += classes.map((name) => `.${CSS.escape(name)}`).join('');
        const sameTag = [...(current.parentElement?.children ?? [])].filter((sibling) => sibling.tagName === current.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
        parts.unshift(part);
        const candidate = parts.join(' > ');
        try { if (document.querySelectorAll(candidate).length === 1) break; } catch { /* 继续向上补充路径 */ }
      }
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function cssSnippet(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const declarations = [
      ['display', style.display], ['position', style.position], ['box-sizing', style.boxSizing],
      ['width', style.width], ['height', style.height],
      ['margin', style.margin], ['padding', style.padding], ['border', style.border],
      ['gap', style.gap], ['font-family', style.fontFamily], ['font-size', style.fontSize],
      ['font-weight', style.fontWeight], ['line-height', style.lineHeight],
      ['color', style.color], ['background-color', style.backgroundColor]
    ].filter(([, value]) => value && value !== 'normal' && value !== 'none')
      .map(([name, value]) => `  ${name}: ${value};`).join('\n');
    return `${uniqueSelector(element)} {\n${declarations}\n}`;
  }

  async function copySelectedCss() {
    const status = state.shadow?.querySelector('[data-field="copy-status"]');
    if (!state.selected || !status) return;
    const text = cssSnippet(state.selected);
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'CSS 样式已复制。';
    } catch {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;';
      document.body.append(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      status.textContent = copied ? 'CSS 样式已复制。' : '复制失败，请检查浏览器剪贴板权限。';
    }
  }

  function displayElement(element) {
    if (!(element instanceof Element)) return;
    state.selected = element;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const parentRect = element.parentElement?.getBoundingClientRect();
    state.shadow.querySelector('[data-field="selector"]').textContent = `${elementLabel(element)}${element.textContent?.trim() ? ` — ${short(element.textContent.trim(), 72)}` : ''}`;
    fillGrid('geometry', [
      ['宽 × 高', `${format(rect.width)} × ${format(rect.height)}`],
      ['视口 X / Y', `${format(rect.left)} / ${format(rect.top)}`],
      ['页面 X / Y', `${format(rect.left + window.scrollX)} / ${format(rect.top + window.scrollY)}`],
      ['父级内 X / Y', parentRect ? `${format(rect.left - parentRect.left)} / ${format(rect.top - parentRect.top)}` : '—'],
      ['父级宽 × 高', parentRect ? `${format(parentRect.width)} × ${format(parentRect.height)}` : '—'],
      ['显示 / 定位', `${style.display} / ${style.position}`],
      ['盒模型', style.boxSizing],
      ['内容 / 溢出', `${element.clientWidth} × ${element.clientHeight} / ${element.scrollWidth} × ${element.scrollHeight}`]
    ]);
    fillGrid('spacing', siblingSpacing(element, rect));
    fillGrid('font', [
      ['字体', style.fontFamily],
      ['字号 / 字重', `${style.fontSize} / ${style.fontWeight}`],
      ['行高', style.lineHeight],
      ['文字颜色', style.color, style.color],
      ['背景颜色', style.backgroundColor, style.backgroundColor]
    ]);
    fillGrid('box', [
      ['Margin', `${format(style.marginTop)} / ${format(style.marginRight)} / ${format(style.marginBottom)} / ${format(style.marginLeft)}`],
      ['Border', `${format(style.borderTopWidth)} / ${format(style.borderRightWidth)} / ${format(style.borderBottomWidth)} / ${format(style.borderLeftWidth)}`],
      ['Padding', `${format(style.paddingTop)} / ${format(style.paddingRight)} / ${format(style.paddingBottom)} / ${format(style.paddingLeft)}`]
    ]);
    state.shadow.querySelector('[data-field="copy-status"]').textContent = '';
    positionHighlight(element);
  }

  function onMove(event) {
    if (!state.inspecting || isPanelEvent(event)) return;
    const element = getElement(event);
    if (!element || element === document.documentElement || element === document.body) return;
    positionHighlight(element);
  }

  function onClick(event) {
    if (!state.inspecting || isPanelEvent(event)) return;
    const element = getElement(event);
    if (!element || element === document.documentElement || element === document.body) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    displayElement(element);
    setInspecting(false);
  }

  function setInspecting(active) {
    state.inspecting = active;
    const button = state.shadow?.querySelector('[data-action="toggle"]');
    if (button) {
      button.textContent = active ? '暂停选取' : '开始选取';
      button.classList.toggle('mode-on', active);
    }
    if (active) {
      state.moveHandler ??= onMove;
      state.clickHandler ??= onClick;
      document.addEventListener('mousemove', state.moveHandler, true);
      document.addEventListener('click', state.clickHandler, true);
    } else {
      if (state.moveHandler) document.removeEventListener('mousemove', state.moveHandler, true);
      if (state.clickHandler) document.removeEventListener('click', state.clickHandler, true);
    }
  }

  function toggleInspect() {
    setInspecting(!state.inspecting);
  }

  function closePanel() {
    setInspecting(false);
    if (state.viewportFrame) cancelAnimationFrame(state.viewportFrame);
    state.viewportFrame = 0;
    state.selected = null;
    if (state.viewportHandler) {
      window.removeEventListener('scroll', state.viewportHandler, true);
      window.removeEventListener('resize', state.viewportHandler, true);
    }
    state.host?.remove();
    state.host = null;
    state.shadow = null;
    state.panel = null;
    state.highlight = null;
    state.label = null;
  }

  function enableDrag(handle) {
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    handle.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) return;
      const rect = state.panel.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      originX = rect.left;
      originY = rect.top;
      state.panel.style.right = 'auto';
      function move(moveEvent) {
        state.panel.style.left = `${Math.max(0, Math.min(window.innerWidth - state.panel.offsetWidth, originX + moveEvent.clientX - startX))}px`;
        state.panel.style.top = `${Math.max(0, Math.min(window.innerHeight - state.panel.offsetHeight, originY + moveEvent.clientY - startY))}px`;
      }
      function up() {
        window.removeEventListener('mousemove', move, true);
        window.removeEventListener('mouseup', up, true);
      }
      window.addEventListener('mousemove', move, true);
      window.addEventListener('mouseup', up, true);
      event.preventDefault();
    });
  }

  function readTables() {
    return [...document.querySelectorAll('table')].map((table, index) => {
      const rows = [...table.rows]
        .map((row) => [...row.cells].map((cell) => (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim()))
        .filter((row) => row.some(Boolean));
      const rect = table.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(table).visibility !== 'hidden';
      return { index, caption: table.caption?.innerText?.trim() || '', rows, rowCount: rows.length, columnCount: Math.max(0, ...rows.map((row) => row.length)), visible };
    }).filter((table) => table.visible && table.rows.length > 0)
      .map(({ visible, ...table }) => table);
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function collectVisible(elements, max = 200, maxScan = 5000) {
    const items = [];
    let total = 0;
    let scanned = 0;
    for (const element of elements) {
      scanned += 1;
      if (isVisible(element)) {
        total += 1;
        if (items.length < max) items.push(element);
        else break;
      }
      if (scanned >= maxScan) break;
    }
    const truncated = scanned < elements.length || total > max;
    return { items, total, totalExact: !truncated, truncated };
  }

  function limited(elements, mapper, max = 200) {
    const result = collectVisible(elements, max);
    return { ...result, items: result.items.map(mapper) };
  }

  function readField(node, selector, kind) {
    if (!selector) return undefined;
    let target;
    try { target = node.matches(selector) ? node : node.querySelector(selector); }
    catch { throw new Error(`字段选择器无效：${selector}`); }
    if (!target) return '';
    if (kind === 'link') {
      const anchor = target.matches('a[href]') ? target : target.querySelector('a[href]');
      return anchor?.href || target.getAttribute('href') || '';
    }
    if (kind === 'image') {
      const image = target.matches('img') ? target : target.querySelector('img');
      return image ? imageUrl(image) : target.getAttribute('src') || '';
    }
    return (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  function imageUrl(image) {
    const lazySource = ['data-original', 'data-lazy-src', 'data-src', 'data-lazyload', 'data-echo']
      .map((attribute) => image.getAttribute(attribute))
      .find(Boolean);
    if (image.complete && image.naturalWidth > 1) return image.currentSrc || image.src || lazySource || '';
    return lazySource || image.currentSrc || image.getAttribute('src') || image.src || '';
  }

  function scrapePage(options = {}) {
    const include = options.include || {};
    const custom = options.custom || {};
    const data = {
      page: {
        title: document.title,
        url: location.href,
        description: document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        language: document.documentElement.lang || '',
        capturedAt: new Date().toISOString()
      }
    };
    const summary = {};
    let truncated = false;

    if (include.headings) {
      const result = limited(document.querySelectorAll('h1,h2,h3,h4,h5,h6'), (element) => ({ level: Number(element.tagName.slice(1)), text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500) }));
      data.headings = result.items;
      summary['标题'] = result.totalExact ? result.total : `≥${result.total}`;
      truncated ||= result.truncated;
    }

    if (include.links) {
      const result = limited(document.querySelectorAll('a[href]'), (element) => ({ text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300), url: element.href, title: element.title || '' }));
      data.links = result.items;
      summary['链接'] = result.totalExact ? result.total : `≥${result.total}`;
      truncated ||= result.truncated;
    }

    if (include.images) {
      const result = limited(document.querySelectorAll('img'), (element) => ({ alt: element.alt || '', src: imageUrl(element), width: element.naturalWidth, height: element.naturalHeight, title: element.title || '' }));
      data.images = result.items;
      summary['图片'] = result.totalExact ? result.total : `≥${result.total}`;
      truncated ||= result.truncated;
    }

    if (include.tables) {
      const allTables = readTables();
      data.tables = allTables.slice(0, 20).map((table) => ({ caption: table.caption, rowCount: table.rowCount, columnCount: table.columnCount, rows: table.rows.slice(0, 100) }));
      summary['表格'] = allTables.length;
      truncated ||= allTables.length > 20 || allTables.some((table) => table.rows.length > 100);
    }

    if (include.jsonLd) {
      const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 30);
      const structuredData = [];
      for (const script of scripts) {
        try { structuredData.push(JSON.parse(script.textContent)); } catch { /* 页面里无效的 JSON-LD 不阻断其他提取 */ }
      }
      data.structuredData = structuredData;
      summary['JSON-LD'] = structuredData.length;
      truncated ||= document.querySelectorAll('script[type="application/ld+json"]').length > 30;
    }

    if (custom.recordSelector) {
      let recordMatches;
      try { recordMatches = document.querySelectorAll(custom.recordSelector); }
      catch { throw new Error(`卡片选择器无效：${custom.recordSelector}`); }
      const recordResult = collectVisible(recordMatches);
      const records = recordResult.items;
      const fieldSelectors = ['title', 'price', 'link', 'image'].filter((key) => custom[key]);
      data.customRecords = {
        selector: custom.recordSelector,
        total: recordResult.total,
        totalExact: recordResult.totalExact,
        items: records.map((node) => {
          const anchor = node.matches('a[href]') ? node : node.querySelector('a[href]');
          const image = node.matches('img') ? node : node.querySelector('img');
          const item = {
            text: (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1500),
            title: node.getAttribute('title') || '',
            href: anchor?.href || '',
            image: image ? imageUrl(image) : '',
            dataAttributes: Object.fromEntries([...node.attributes].filter((attribute) => attribute.name.startsWith('data-')).slice(0, 20).map((attribute) => [attribute.name, attribute.value.slice(0, 300)]))
          };
          for (const key of fieldSelectors) item[key] = readField(node, custom[key], key === 'link' ? 'link' : key === 'image' ? 'image' : 'text');
          return item;
        }),
        truncated: recordResult.truncated
      };
      summary['卡片'] = recordResult.totalExact ? recordResult.total : `≥${Math.max(recordResult.total, records.length + 1)}`;
      truncated ||= recordResult.truncated;
    } else if (['title', 'price', 'link', 'image'].some((key) => custom[key])) {
      throw new Error('请先填写卡片选择器，再配置卡片中的字段选择器。');
    }

    return { data, summary, truncated };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'JS_TOOLBOX_GET_TABLES') {
      sendResponse({ tables: readTables() });
      return false;
    }
    if (message?.type === 'JS_TOOLBOX_START_INSPECT') {
      ensurePanel();
      setInspecting(true);
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'JS_TOOLBOX_SCRAPE_JSON') {
      try { sendResponse(scrapePage(message.options)); }
      catch (error) { sendResponse({ error: `提取失败：${error.message}` }); }
      return false;
    }
    return false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.inspecting) setInspecting(false);
  }, true);
})();
