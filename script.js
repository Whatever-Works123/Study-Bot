let todos = JSON.parse(localStorage.getItem('todos')) || [];
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let pomodoros = parseInt(localStorage.getItem('pomodoros')) || 0;
let editingNoteId = null;

function saveData() {
    try {
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('notes', JSON.stringify(notes));
        localStorage.setItem('pomodoros', pomodoros);
        updateStats();
    } catch (e) { alert("Storage full! Please delete some data."); }
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    // Ensure event exists before accessing it (safe for programmatic calls)
    if(event) event.currentTarget.classList.add('active');
    if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function updateStats() {
    document.getElementById('stat-notes').textContent = notes.length;
    document.getElementById('stat-todos').textContent = todos.filter(t => !t.completed).length;
    document.getElementById('stat-pomodoros').textContent = pomodoros;

    const upcoming = todos.filter(t => !t.completed && t.dueDate).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
    const container = document.getElementById('upcoming-tasks');
    if(upcoming.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center; color: var(--text-secondary);">🎉 No urgent tasks! Time to relax.</div>`;
    } else {
        container.innerHTML = upcoming.map(t => `
            <div class="task-card priority-${t.priority}">
                <div style="flex:1">
                    <div class="task-title">${t.text}</div>
                    <div class="date-badge" style="width: fit-content; margin-top:5px;">📅 ${new Date(t.dueDate).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }
}

// Timer
let timerInterval, timeLeft = 25 * 60, isTimerRunning = false;
function setTimerMode(minutes) {
    clearInterval(timerInterval); isTimerRunning = false; timeLeft = minutes * 60;
    updateTimerDisplay();
    document.getElementById('start-btn').textContent = "Start Focus";
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    if(event) event.target.classList.add('active');
}
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
    document.title = `${m}:${s} - Focus`;
}
function startTimer() {
    if (isTimerRunning) { clearInterval(timerInterval); isTimerRunning = false; document.getElementById('start-btn').textContent = "Resume"; }
    else {
        isTimerRunning = true; document.getElementById('start-btn').textContent = "Pause";
        timerInterval = setInterval(() => {
            timeLeft--; updateTimerDisplay();
            if (timeLeft <= 0) { clearInterval(timerInterval); alert("Session Complete!"); pomodoros++; saveData(); resetTimer(); }
        }, 1000);
    }
}
function resetTimer() { clearInterval(timerInterval); isTimerRunning = false; setTimerMode(25); document.querySelector('.mode-btn').click(); }

// To-Do
function openTodoModal() { 
    ['text','desc','date'].forEach(id => document.getElementById('modal-todo-'+id).value = '');
    document.getElementById('modal-todo-priority').value = 'medium';
    document.getElementById('todo-modal').classList.add('show');
    document.getElementById('todo-modal').style.display = 'flex';
}
function closeTodoModal() { document.getElementById('todo-modal').style.display = 'none'; }

function saveTodoFromModal() {
    const text = document.getElementById('modal-todo-text').value.trim();
    if(!text) return;
    todos.push({
        id: Date.now(),
        text,
        desc: document.getElementById('modal-todo-desc').value,
        dueDate: document.getElementById('modal-todo-date').value,
        priority: document.getElementById('modal-todo-priority').value,
        completed: false
    });
    saveData(); closeTodoModal(); renderTodos();
}

function renderTodos() {
    const list = document.getElementById('todo-list');
    const sorted = [...todos].sort((a,b) => (a.completed - b.completed) || (a.priority === 'high' ? -1 : 1));
    list.innerHTML = sorted.map(t => `
        <div class="task-card priority-${t.priority} ${t.completed ? 'completed' : ''}" style="opacity: ${t.completed ? 0.6 : 1}">
            <input type="checkbox" style="width: 20px; height: 20px; margin-top: 4px;" ${t.completed ? 'checked' : ''} onchange="toggleTodo(${t.id})">
            <div style="flex:1">
                <div class="task-title" style="text-decoration: ${t.completed ? 'line-through' : 'none'}">${t.text}</div>
                ${t.desc ? `<div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">${t.desc}</div>` : ''}
                <div style="display:flex; gap: 10px; margin-top: 10px;">
                    <span class="badge badge-${t.priority}">${t.priority}</span>
                    ${t.dueDate ? `<span class="date-badge">📅 ${new Date(t.dueDate).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
            <button class="btn btn-outline" style="padding: 5px 10px; border:none; color: var(--danger);" onclick="deleteTodo(${t.id})">✕</button>
        </div>
    `).join('') || `<div style="text-align:center; padding: 40px; color: var(--text-secondary);">No tasks found. Get started! 🚀</div>`;
}

function toggleTodo(id) { const t = todos.find(x => x.id === id); if(t) t.completed = !t.completed; saveData(); renderTodos(); }
function deleteTodo(id) { if(confirm("Delete task?")) { todos = todos.filter(t => t.id !== id); saveData(); renderTodos(); } }

// Notes
function openNoteModal(id=null) {
    editingNoteId = id;
    const modal = document.getElementById('note-modal');
    modal.style.display = 'flex';
    if(id) {
        const n = notes.find(x => x.id === id);
        document.getElementById('note-title').value = n.title;
        document.getElementById('note-content').value = n.content;
        document.getElementById('note-tags').value = n.tags.join(', ');
        document.getElementById('image-preview').innerHTML = n.image ? `<img src="${n.image}" style="width:100%">` : '';
    } else {
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';
        document.getElementById('image-preview').innerHTML = '';
    }
}
function closeNoteModal() { document.getElementById('note-modal').style.display = 'none'; }

function saveNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const tags = document.getElementById('note-tags').value.split(',').map(t=>t.trim()).filter(t=>t);
    const file = document.getElementById('note-image').files[0];
    
    if(!title) return alert("Title required!");
    
    const process = (img) => {
        if(editingNoteId) {
            const idx = notes.findIndex(n=>n.id===editingNoteId);
            notes[idx] = {...notes[idx], title, content, tags, image: img || notes[idx].image};
        } else {
            notes.unshift({id: Date.now(), title, content, tags, image: img});
        }
        saveData(); closeNoteModal(); renderNotes();
    };

    if(file) {
        const r = new FileReader();
        r.onload = e => process(e.target.result);
        r.readAsDataURL(file);
    } else process(null);
}

function renderNotes() {
    const search = document.getElementById('note-search').value.toLowerCase();
    const grid = document.getElementById('notes-grid');
    const filtered = notes.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
    
    grid.innerHTML = filtered.map(n => `
        <div class="card note-card" onclick="openNoteModal(${n.id})">
            ${n.image ? `<img src="${n.image}">` : ''}
            <h3>${n.title}</h3>
            <div class="note-content">${n.content.substring(0, 100)}...</div>
            <div style="margin-top: 15px; font-size: 0.8rem; color: var(--primary);">
                ${n.tags.map(t=>`#${t}`).join(' ')}
            </div>
            <button onclick="event.stopPropagation(); deleteNote(${n.id})" style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.9); border:none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; color: var(--danger); box-shadow: 0 2px 5px rgba(0,0,0,0.1);">🗑️</button>
        </div>
    `).join('') || `<div style="grid-column:1/-1; text-align:center; color: var(--text-secondary);">No notes found.</div>`;
}
function deleteNote(id) { if(confirm("Delete note?")) { notes = notes.filter(n=>n.id!==id); saveData(); renderNotes(); } }

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}
function clearAllData() { if(confirm("Reset App?")) { localStorage.clear(); location.reload(); } }

if(localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('dark-mode-toggle').checked = true;
}

// Close modals on click outside
window.onclick = e => {
    if(e.target.classList.contains('modal')) e.target.style.display = 'none';
}

// Initial render calls
renderTodos(); 
renderNotes(); 
updateStats();
