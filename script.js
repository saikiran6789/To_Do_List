// Minimal, accessible To‑Do app with localStorage persistence and drag & drop reordering.
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const state = {
  tasks: load(),
  filter: 'all',
  search: '',
};

const els = {
  list: $('#list'),
  template: $('#itemTemplate'),
  newTitle: $('#newTitle'),
  newDue: $('#newDue'),
  addBtn: $('#addBtn'),
  filter: $('#filter'),
  search: $('#search'),
  clearCompleted: $('#clearCompleted'),
  count: $('#count'),
  activeCount: $('#activeCount'),
  exportBtn: $('#exportBtn'),
  importBtn: $('#importBtn'),
  importFile: $('#importFile'),
  resetBtn: $('#resetBtn'),
};

function uid(){ return Math.random().toString(36).slice(2,10); }

function load(){
  try{
    const raw = localStorage.getItem('todo.tasks');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

function save(){
  localStorage.setItem('todo.tasks', JSON.stringify(state.tasks));
}

function addTask(title, due){
  title = title.trim();
  if(!title) return;
  const t = { id: uid(), title, due: due || '', completed: false, createdAt: Date.now(), order: state.tasks.length ? Math.max(...state.tasks.map(x=>x.order||0))+1 : 1 };
  state.tasks.push(t);
  save();
  render();
}

function updateTask(id, patch){
  const i = state.tasks.findIndex(t=>t.id===id);
  if(i>-1){
    state.tasks[i] = { ...state.tasks[i], ...patch };
    save();
    render();
  }
}

function deleteTask(id){
  state.tasks = state.tasks.filter(t=>t.id!==id);
  save();
  render();
}

function duplicateTask(id){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  addTask(t.title, t.due);
}

function clearCompleted(){
  state.tasks = state.tasks.filter(t=>!t.completed);
  save();
  render();
}

function fmtDateISO(d){ return d ? d : ''; }

function matchesFilter(t){
  const todayISO = new Date().toISOString().slice(0,10);
  if(state.filter==='active') return !t.completed;
  if(state.filter==='completed') return !!t.completed;
  if(state.filter==='today') return t.due === todayISO;
  return true;
}

function matchesSearch(t){
  if(!state.search) return true;
  return t.title.toLowerCase().includes(state.search.toLowerCase());
}

function computeBadges(t, dueEl){
  const todayISO = new Date().toISOString().slice(0,10);
  const overdueBadge = dueEl.parentElement.querySelector('.overdue');
  const todayBadge = dueEl.parentElement.querySelector('.today');
  overdueBadge.hidden = !(t.due && t.due < todayISO && !t.completed);
  todayBadge.hidden = !(t.due && t.due === todayISO);
}

function bindItem(li, t){
  const checkbox = $('.toggle', li);
  const title = $('.title', li);
  const due = $('.due', li);
  const del = $('.del', li);
  const dup = $('.dup', li);

  checkbox.checked = !!t.completed;
  title.value = t.title;
  title.classList.toggle('completed', !!t.completed);
  due.value = fmtDateISO(t.due);

  checkbox.addEventListener('change', () => updateTask(t.id, { completed: checkbox.checked }));
  title.addEventListener('input', () => updateTask(t.id, { title: title.value }));
  due.addEventListener('change', () => updateTask(t.id, { due: due.value }));
  del.addEventListener('click', () => deleteTask(t.id));
  dup.addEventListener('click', () => duplicateTask(t.id));

  // drag & drop
  li.addEventListener('dragstart', () => {
    li.classList.add('dragging');
    li.dataset.dragId = t.id;
  });
  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    li.dataset.dragId = '';
    // persist order
    $$('#list .item').forEach((el, idx) => {
      const id = el.dataset.id;
      const task = state.tasks.find(x=>x.id===id);
      if(task){ task.order = idx+1; }
    });
    save();
  });

  computeBadges(t, due);
}

function render(){
  // counts
  els.count.textContent = state.tasks.length;
  els.activeCount.textContent = state.tasks.filter(t=>!t.completed).length;

  // list
  els.list.innerHTML = '';
  const tasks = state.tasks
    .slice()
    .sort((a,b) => (a.order||0)-(b.order||0) || a.createdAt - b.createdAt)
    .filter(matchesFilter)
    .filter(matchesSearch);

  for(const t of tasks){
    const li = els.template.content.firstElementChild.cloneNode(true);
    li.dataset.id = t.id;
    bindItem(li, t);
    els.list.appendChild(li);
  }
}

function setup(){
  els.addBtn.addEventListener('click', () => {
    addTask(els.newTitle.value, els.newDue.value);
    els.newTitle.value = '';
    els.newDue.value = '';
    els.newTitle.focus();
  });
  els.newTitle.addEventListener('keydown', e => {
    if(e.key === 'Enter') els.addBtn.click();
  });

  els.filter.addEventListener('change', e => {
    state.filter = e.target.value;
    render();
  });

  els.search.addEventListener('input', e => {
    state.search = e.target.value;
    render();
  });

  els.clearCompleted.addEventListener('click', clearCompleted);

  // drag over to reorder
  els.list.addEventListener('dragover', e => {
    e.preventDefault();
    const afterEl = getDragAfterElement(els.list, e.clientY);
    const dragging = $('.item.dragging');
    if(!dragging) return;
    if(afterEl == null){
      els.list.appendChild(dragging);
    } else {
      els.list.insertBefore(dragging, afterEl);
    }
  });

  // export/import/reset
  els.exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(state.tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'tasks.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  });

  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', async () => {
    const file = els.importFile.files[0];
    if(!file) return;
    const text = await file.text();
    try{
      const tasks = JSON.parse(text);
      if(Array.isArray(tasks)){
        state.tasks = tasks.map(x => ({ order: 1, ...x }));
        save();
        render();
      } else alert('Invalid file format.');
    }catch(err){
      alert('Failed to import: ' + err.message);
    } finally {
      els.importFile.value = '';
    }
  });

  els.resetBtn.addEventListener('click', () => {
    if(confirm('This will delete ALL tasks. Continue?')){
      state.tasks = [];
      save();
      render();
    }
  });

  render();
}

function getDragAfterElement(container, y){
  const els = [...container.querySelectorAll('.item:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if(offset < 0 && offset > closest.offset){
      return { offset, element: child };
    }else{
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

setup();
