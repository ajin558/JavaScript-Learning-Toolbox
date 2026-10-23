// 这是一个原生 JavaScript 小项目：先找到网页元素，再为它们添加事件。
const navButtons = document.querySelectorAll('.nav-item');
const toolPages = document.querySelectorAll('.tool-page');
const currentToolName = document.querySelector('#currentToolName');
const toast = document.querySelector('#toast');
let toastTimer;

function showTool(name) {
  toolPages.forEach((page) => { page.hidden = page.dataset.page !== name; });
  navButtons.forEach((button) => { button.classList.toggle('active', button.dataset.tool === name); });
  const activeButton = document.querySelector(`.nav-item[data-tool="${name}"]`);
  currentToolName.textContent = activeButton?.querySelector('span:nth-child(2)')?.textContent ?? '工具';
}

navButtons.forEach((button) => button.addEventListener('click', () => showTool(button.dataset.tool)));

function setFeedback(element, message, type = '') {
  element.textContent = message;
  element.className = `feedback ${type}`.trim();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1900);
}

async function copyText(text, feedbackElement) {
  if (!text) {
    setFeedback(feedbackElement, '还没有可复制的结果', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    if (copied) showToast('已复制到剪贴板');
    else setFeedback(feedbackElement, '复制失败，请手动选择文本复制', 'error');
  }
}

// JSON 工具：解析成功后得到 JavaScript 数据，再按需要的缩进转回文本。
const jsonInput = document.querySelector('#jsonInput');
const jsonOutput = document.querySelector('#jsonOutput');
const jsonFeedback = document.querySelector('#jsonFeedback');

function processJson(indent) {
  try {
    const value = JSON.parse(jsonInput.value);
    jsonOutput.value = JSON.stringify(value, null, indent);
    const bytes = new Blob([jsonOutput.value]).size;
    setFeedback(jsonFeedback, `处理完成 · ${jsonOutput.value.length} 个字符 · ${bytes} 字节`, 'success');
  } catch (error) {
    jsonOutput.value = '';
    setFeedback(jsonFeedback, `JSON 格式有误：${error.message}`, 'error');
  }
}

document.querySelector('#jsonFormat').addEventListener('click', () => processJson(2));
document.querySelector('#jsonMinify').addEventListener('click', () => processJson(0));
document.querySelector('#jsonClear').addEventListener('click', () => {
  jsonInput.value = '';
  jsonOutput.value = '';
  setFeedback(jsonFeedback, '输入和结果已清空');
  jsonInput.focus();
});
document.querySelector('#jsonSample').addEventListener('click', () => {
  jsonInput.value = '{"name":"小明","role":"前端学习者","skills":["HTML","CSS","JavaScript"],"active":true}';
  processJson(2);
});
document.querySelector('#jsonCopy').addEventListener('click', () => copyText(jsonOutput.value, jsonFeedback));
jsonInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') processJson(2);
});

// 文本工具：将文本切成每一行，分别清理后再拼起来。
const textInput = document.querySelector('#textInput');
const textOutput = document.querySelector('#textOutput');
const textFeedback = document.querySelector('#textFeedback');
const textCount = document.querySelector('#textCount');

function updateTextCount() {
  textCount.textContent = `${textInput.value.length} 个字符`;
}

textInput.addEventListener('input', updateTextCount);
document.querySelector('#textClean').addEventListener('click', () => {
  const trimLines = document.querySelector('#trimLines').checked;
  const collapseSpaces = document.querySelector('#collapseSpaces').checked;
  const removeBlankLines = document.querySelector('#removeBlankLines').checked;
  let lines = textInput.value.split(/\r?\n/);
  if (trimLines) lines = lines.map((line) => line.trim());
  if (collapseSpaces) lines = lines.map((line) => line.replace(/[\t ]{2,}/g, ' '));
  if (removeBlankLines) lines = lines.filter((line) => line.length > 0);
  textOutput.value = lines.join('\n');
  setFeedback(textFeedback, `整理完成 · ${lines.length} 行 · ${textOutput.value.length} 个字符`, 'success');
});
document.querySelector('#textCopy').addEventListener('click', () => copyText(textOutput.value, textFeedback));
document.querySelector('#textClear').addEventListener('click', () => {
  textInput.value = '';
  textOutput.value = '';
  updateTextCount();
  setFeedback(textFeedback, '输入和结果已清空');
  textInput.focus();
});
document.querySelector('#textSample').addEventListener('click', () => {
  textInput.value = '  今天的练习    \n\n   学习 JavaScript   \n\t练习 DOM   ';
  updateTextCount();
  document.querySelector('#textClean').click();
});

// 待办清单：状态放在数组中，渲染时安全地创建每一个 DOM 节点。
const TODO_STORAGE_KEY = 'js-learning-toolbox.todos.v1';
const todoList = document.querySelector('#todoList');
const todoEmpty = document.querySelector('#todoEmpty');
const todoRemaining = document.querySelector('#todoRemaining');
const todoFeedback = document.querySelector('#todoFeedback');
let todos = loadTodos();
let todoFilter = 'all';

function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.text === 'string') : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
    setFeedback(todoFeedback, '已自动保存');
  } catch {
    setFeedback(todoFeedback, '浏览器未能保存数据，请检查存储设置', 'error');
  }
}

function renderTodos() {
  todoList.replaceChildren();
  const visibleTodos = todos.filter((todo) => todoFilter === 'all' || (todoFilter === 'done' ? todo.done : !todo.done));
  visibleTodos.forEach((todo) => {
    const item = document.createElement('div');
    item.className = `todo-item${todo.done ? ' done' : ''}`;
    const toggle = document.createElement('button');
    toggle.className = 'todo-toggle';
    toggle.type = 'button';
    toggle.dataset.action = 'toggle';
    toggle.dataset.id = todo.id;
    toggle.setAttribute('aria-label', todo.done ? '标记为未完成' : '标记为已完成');
    toggle.textContent = '✓';
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
    const remove = document.createElement('button');
    remove.className = 'delete-todo';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.dataset.id = todo.id;
    remove.setAttribute('aria-label', `删除：${todo.text}`);
    remove.textContent = '×';
    item.append(toggle, text, remove);
    todoList.append(item);
  });
  todoEmpty.hidden = visibleTodos.length > 0;
  const remaining = todos.filter((todo) => !todo.done).length;
  todoRemaining.textContent = `${remaining} 项待完成`;
}

document.querySelector('#todoForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#todoInput');
  const text = input.value.trim();
  if (!text) {
    input.focus();
    setFeedback(todoFeedback, '先写下一件要做的事', 'error');
    return;
  }
  todos.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, done: false });
  input.value = '';
  saveTodos();
  renderTodos();
  input.focus();
});

todoList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'toggle') todos = todos.map((todo) => todo.id === id ? { ...todo, done: !todo.done } : todo);
  if (action === 'delete') todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
});

document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  todoFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach((filter) => filter.classList.toggle('active', filter === button));
  renderTodos();
}));

document.querySelector('#clearCompleted').addEventListener('click', () => {
  const before = todos.length;
  todos = todos.filter((todo) => !todo.done);
  if (todos.length !== before) saveTodos();
  else setFeedback(todoFeedback, '当前没有已完成的任务');
  renderTodos();
});

renderTodos();
