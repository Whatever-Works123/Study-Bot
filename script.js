let todos = JSON.parse(localStorage.getItem('todos')) || [];
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let pomodoros = parseInt(localStorage.getItem('pomodoros')) || 0;
let editingNoteId = null;
let currentNoteImage = null;

// --- INITIALIZATION ---
// Apply draggable logic to our windows
makeElementDraggable(document.getElementById("todo-window"), document.getElementById("todo-header"));
makeElementDraggable(document.getElementById("note-window"), document.getElementById("note-header"));

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
    // AUTO-CLOSE FEATURE: Close any open windows when switching pages
    closeTodoModal();
    closeNoteModal();

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
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
        container.innerHTML = `<div class="card" style="text-align:center; color: var(--text-secondary); padding: 30px;">🎉 No urgent tasks!</div>`;
    } else {
        container.innerHTML = upcoming.map(t => `
            <div class="task-card priority-${t.priority}">
                <div style="flex:1">
                    <div style="font-weight:600">${t.text}</div>
                    <div style="font-size:0.8rem; opacity:0.7;">📅 ${new Date(t.dueDate).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }
}

/* --- DRAG LOGIC --- */
function makeElementDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        // Get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        // Calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position:
        // We use transform translate instead of top/left to keep it smooth and relative to center
        // Note: element.style.transform might contain 'scale', so we need to handle that.
        // For simplicity in this layout, we are manipulating top/left relative to current visual position
        
        let currentTop = element.offsetTop;
        let currentLeft = element.offsetLeft;
        
        // Since the element is centered via flexbox in the overlay, we need to switch it to absolute positioning
        // the first time we drag it so it moves freely.
        element.style.position = "absolute";
        element.style.margin = "0"; // Remove auto margins
        element.style.top = (currentTop - pos2) + "px";
        element.style.left = (currentLeft - pos1) + "px";
    }

    function closeDragElement() {
        // Stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

/* --- TIMER --- */
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

/* --- TO-DO MODAL FUNCTIONS --- */
/* --- TO-DO MODAL FUNCTIONS --- */
function openTodoModal() { 
    // Clear previous values
    ['modal-todo-text','modal-todo-desc','modal-todo-date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('modal-todo-priority').value = 'medium';
    
    // --- NEW CODE: Set Date Limits (Today to +3 Months) ---
    const dateInput = document.getElementById('modal-todo-date');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3); // Add 3 months

    // Format to YYYY-MM-DD for HTML input
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    // ------------------------------------------------------

    // Reset position for fresh look
    const win = document.getElementById('todo-window');
    win.style.position = ''; 
    win.style.top = ''; 
    win.style.left = ''; 
    win.style.margin = '';

    document.getElementById('todo-modal').classList.add('show');
}
function closeTodoModal() { document.getElementById('todo-modal').classList.remove('show'); }

function saveTodoFromModal() {
    const text = document.getElementById('modal-todo-text').value.trim();
    if(!text) return alert("Please enter a task name");
    
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
        <div class="task-card priority-${t.priority}" style="opacity: ${t.completed ? 0.5 : 1}">
            <input type="checkbox" style="width: 20px; height: 20px; cursor:pointer;" ${t.completed ? 'checked' : ''} onchange="toggleTodo(${t.id})">
            <div style="flex:1">
                <div style="text-decoration: ${t.completed ? 'line-through' : 'none'}; font-weight: 600;">${t.text}</div>
                ${t.desc ? `<div style="font-size: 0.85rem; color: var(--text-secondary);">${t.desc}</div>` : ''}
            </div>
            <button class="btn-ghost" style="color: var(--danger); padding: 8px;" onclick="deleteTodo(${t.id})">✕</button>
        </div>
    `).join('') || `<div style="text-align:center; color: var(--text-secondary); padding: 40px;">No tasks. You're all caught up! 🌟</div>`;
}

function toggleTodo(id) { const t = todos.find(x => x.id === id); if(t) t.completed = !t.completed; saveData(); renderTodos(); }
function deleteTodo(id) { if(confirm("Delete task?")) { todos = todos.filter(t => t.id !== id); saveData(); renderTodos(); } }

/* --- NOTE MODAL FUNCTIONS --- */
function openNoteModal(id=null) {
    editingNoteId = id;
    currentNoteImage = null;
    
    // Reset position
    const win = document.getElementById('note-window');
    win.style.position = ''; 
    win.style.top = ''; 
    win.style.left = ''; 
    win.style.margin = '';

    const modal = document.getElementById('note-modal');
    modal.classList.add('show');
    
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');

    if(id) {
        const n = notes.find(x => x.id === id);
        document.getElementById('note-title').value = n.title;
        document.getElementById('note-content').value = n.content;
        document.getElementById('note-tags').value = n.tags.join(', ');
        
        if(n.image) {
            currentNoteImage = n.image;
            previewImg.src = n.image;
            previewContainer.classList.remove('hidden');
        } else {
            previewContainer.classList.add('hidden');
        }
    } else {
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';
        previewContainer.classList.add('hidden');
    }
}
function closeNoteModal() { document.getElementById('note-modal').classList.remove('show'); }

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentNoteImage = e.target.result;
            document.getElementById('image-preview').src = e.target.result;
            document.getElementById('image-preview-container').classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function clearImage() {
    document.getElementById('note-image').value = '';
    currentNoteImage = null;
    document.getElementById('image-preview-container').classList.add('hidden');
}

function saveNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const tags = document.getElementById('note-tags').value.split(',').map(t=>t.trim()).filter(t=>t);
    
    if(!title) return alert("Note needs a title!");
    
    const noteObj = {
        id: editingNoteId || Date.now(),
        title, content, tags,
        image: currentNoteImage
    };

    if(editingNoteId) {
        const idx = notes.findIndex(n=>n.id===editingNoteId);
        notes[idx] = noteObj;
    } else {
        notes.unshift(noteObj);
    }
    saveData(); closeNoteModal(); renderNotes();
}

function renderNotes() {
    const search = document.getElementById('note-search').value.toLowerCase();
    const grid = document.getElementById('notes-grid');
    const filtered = notes.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
    
    grid.innerHTML = filtered.map(n => `
        <div class="card note-card" onclick="openNoteModal(${n.id})">
            ${n.image ? `<img src="${n.image}">` : ''}
            <h3>${n.title}</h3>
            <div class="note-content">${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}</div>
            <div style="margin-top: auto; padding-top: 10px; font-size: 0.8rem; color: var(--primary);">
                ${n.tags.map(t=>`#${t}`).join(' ')}
            </div>
            <button onclick="event.stopPropagation(); deleteNote(${n.id})" style="position: absolute; top: 10px; right: 10px; background: white; border:none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; color: var(--danger); box-shadow: 0 2px 5px rgba(0,0,0,0.1);">✕</button>
        </div>
    `).join('') || `<div style="grid-column:1/-1; text-align:center; color: var(--text-secondary); padding: 20px;">No notes yet. Create one! 📝</div>`;
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

window.onclick = e => { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); }
document.addEventListener('keydown', (e) => { if(e.key === "Escape") document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show')); });

renderTodos(); 
renderNotes(); 
updateStats();