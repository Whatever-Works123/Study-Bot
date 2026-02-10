/* =========================================
   1. GLOBAL VARIABLES & INITIAL LOAD
   ========================================= */
// Helper to safely parse JSON without crashing
function safeLoad(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Corrupted data for ${key}, resetting.`);
        return fallback;
    }
}

let todos = safeLoad('todos', []);
let notes = safeLoad('notes', []);
let folders = safeLoad('folders', [{id: 'general', name: 'General'}]);
let pomodoros = parseInt(localStorage.getItem('pomodoros')) || 0;

// ... rest of the code ...

// State Variables
let editingNoteId = null;
let currentNoteImage = null;
let currentFolderId = 'all'; // 'all' shows everything

// Timer Variables
let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;
let currentMode = 'pomodoro'; // 'pomodoro', 'short', 'long'

// Load everything on start
window.onload = () => {
    updateStats();
    renderTodos();
    renderFolders();
    renderNotes();
    updateTimerDisplay();
    
    // Apply Dark Mode if saved
    if(localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }

    // Initialize Draggable Windows
    dragElement(document.getElementById("todo-window"));
    dragElement(document.getElementById("note-window"));
};

/* =========================================
   2. NAVIGATION & SAVING
   ========================================= */
/* =========================================
   2. NAVIGATION & SAVING
   ========================================= */

// Fixed: Robust page switching that finds the active link automatically
function showPage(pageId) {
    // 1. Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // 2. Show the specific page requested
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    } else {
        console.error(`Page "${pageId}" not found!`);
        return;
    }
    
    // 3. Update Sidebar Highlight
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        // Check if this link corresponds to the pageId
        if (link.getAttribute('onclick').includes(`'${pageId}'`)) {
            link.classList.add('active');
        }
    });

    // On mobile, close sidebar after clicking
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// Added: Missing function for the mobile menu button
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ... keep existing saveData and updateStats functions ...

function saveData() {
    try {
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('notes', JSON.stringify(notes));
        localStorage.setItem('folders', JSON.stringify(folders));
        localStorage.setItem('pomodoros', pomodoros);
        updateStats();
    } catch (e) { alert("Storage full! Please delete some images."); }
}

function updateStats() {
    document.getElementById('stat-todo').innerText = todos.filter(t => !t.done).length;
    document.getElementById('stat-note').innerText = notes.length;
    document.getElementById('stat-pomo').innerText = pomodoros;
}

/* =========================================
   3. TO-DO LOGIC (With 3-Month Limit)
   ========================================= */
function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    
    // Sort: High Priority first, then by Date
    todos.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        if(priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.date) - new Date(b.date);
    });

    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = `task-card priority-${todo.priority}`;
        if(todo.done) div.style.opacity = '0.5';
        
        div.innerHTML = `
            <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${todo.id})" style="width: 20px; height: 20px;">
            <div style="flex:1; text-decoration: ${todo.done ? 'line-through' : 'none'}">
                <div style="font-weight: 600; font-size: 1.1rem;">${todo.text}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">📅 ${todo.date} &nbsp;•&nbsp; ${todo.desc}</div>
            </div>
            <button onclick="deleteTodo(${todo.id})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.2rem;">&times;</button>
        `;
        list.appendChild(div);
    });
}

function openTodoModal() { 
    // Clear inputs
    ['modal-todo-text','modal-todo-desc','modal-todo-date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('modal-todo-priority').value = 'medium';

    // --- DATE LIMIT LOGIC (Today to +3 Months) ---
    const dateInput = document.getElementById('modal-todo-date');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);

    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    // ---------------------------------------------

    // Reset position
    const win = document.getElementById('todo-window');
    win.style.position = ''; win.style.top = ''; win.style.left = ''; win.style.margin = '';

    document.getElementById('todo-modal').classList.add('show');
}

function closeTodoModal() {
    document.getElementById('todo-modal').classList.remove('show');
}

function saveTodo() {
    const text = document.getElementById('modal-todo-text').value;
    const desc = document.getElementById('modal-todo-desc').value;
    const date = document.getElementById('modal-todo-date').value;
    const priority = document.getElementById('modal-todo-priority').value;

    if(!text || !date) return alert("Task name and date are required!");

    todos.push({ id: Date.now(), text, desc, date, priority, done: false });
    saveData();
    closeTodoModal();
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if(todo) {
        todo.done = !todo.done;
        saveData();
        renderTodos();
    }
}

function deleteTodo(id) {
    if(confirm("Delete this task?")) {
        todos = todos.filter(t => t.id !== id);
        saveData();
        renderTodos();
    }
}

/* =========================================
   4. FOLDER LOGIC
   ========================================= */
function createFolder() {
    const name = prompt("Enter folder name:");
    if (name) {
        folders.push({ id: Date.now().toString(), name: name });
        saveData();
        renderFolders();
    }
}

function selectFolder(folderId) {
    currentFolderId = folderId;
    
    // Visual update
    document.querySelectorAll('.folder-item').forEach(el => el.classList.remove('active'));
    if(folderId === 'all') {
        document.getElementById('folder-all').classList.add('active');
        document.getElementById('current-folder-title').textContent = "All Notes";
    } else {
        const folder = folders.find(f => f.id === folderId);
        if(folder) {
            document.getElementById(`folder-${folderId}`).classList.add('active');
            document.getElementById('current-folder-title').textContent = folder.name;
        }
    }
    renderNotes();
}

function renderFolders() {
    const list = document.getElementById('folder-list');
    list.innerHTML = folders.map(f => `
        <div class="folder-item ${currentFolderId === f.id ? 'active' : ''}" 
             id="folder-${f.id}" 
             onclick="selectFolder('${f.id}')">
            <span>📁 ${f.name}</span>
            ${f.id !== 'general' ? `<span onclick="event.stopPropagation(); deleteFolder('${f.id}')" style="cursor:pointer; opacity:0.6;">✕</span>` : ''}
        </div>
    `).join('');
    
    // Update Dropdown in Modal
    const select = document.getElementById('note-folder-select');
    if(select) {
        select.innerHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    }
}

function deleteFolder(id) {
    if(confirm("Delete this folder? Notes inside will be deleted too.")) {
        folders = folders.filter(f => f.id !== id);
        notes = notes.filter(n => n.folderId !== id); // Cascading delete
        saveData();
        selectFolder('all');
        renderFolders();
    }
}

/* =========================================
   5. NOTE LOGIC (Rich Media & Folders)
   ========================================= */
function renderNotes() {
    const search = document.getElementById('note-search').value.toLowerCase();
    const grid = document.getElementById('notes-grid');
    
    // Filter by Folder AND Search
    const filtered = notes.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search);
        const matchesFolder = (currentFolderId === 'all') || (n.folderId === currentFolderId);
        return matchesSearch && matchesFolder;
    });
    
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
    `).join('') || `<div style="grid-column:1/-1; text-align:center; color: var(--text-secondary); padding:20px;">No notes found.</div>`;
}

function openNoteModal(id=null) {
    editingNoteId = id;
    currentNoteImage = null;
    
    // Reset Modal
    const win = document.getElementById('note-window');
    win.style.position = ''; win.style.top = ''; win.style.left = ''; win.style.margin = '';
    document.getElementById('note-modal').classList.add('show');
    
    renderFolders(); // Ensure dropdown has latest folders

    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');

    if(id) {
        // Edit Existing
        const n = notes.find(x => x.id === id);
        document.getElementById('note-title').value = n.title;
        document.getElementById('note-content').value = n.content;
        document.getElementById('note-tags').value = n.tags.join(', ');
        document.getElementById('note-folder-select').value = n.folderId || 'general';
        
        if(n.image) {
            currentNoteImage = n.image;
            previewImg.src = n.image;
            previewContainer.classList.remove('hidden');
        } else {
            previewContainer.classList.add('hidden');
        }
    } else {
        // Create New
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';
        // Default to current folder (or General if in "All")
        document.getElementById('note-folder-select').value = (currentFolderId === 'all') ? 'general' : currentFolderId;
        previewContainer.classList.add('hidden');
    }
}

function closeNoteModal() {
    document.getElementById('note-modal').classList.remove('show');
}

function saveNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const tags = document.getElementById('note-tags').value.split(',').map(t=>t.trim()).filter(t=>t);
    const folderId = document.getElementById('note-folder-select').value; // Get selected folder
    
    if(!title) return alert("Note needs a title!");
    
    const noteObj = {
        id: editingNoteId || Date.now(),
        title, content, tags, folderId,
        image: currentNoteImage,
        date: new Date().toISOString()
    };

    if(editingNoteId) {
        const idx = notes.findIndex(n=>n.id===editingNoteId);
        notes[idx] = noteObj;
    } else {
        notes.unshift(noteObj);
    }
    saveData(); closeNoteModal(); renderNotes();
}

function deleteNote(id) {
    if(confirm("Delete note?")) {
        notes = notes.filter(n => n.id !== id);
        saveData();
        renderNotes();
    }
}

// Image Handling
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentNoteImage = e.target.result;
            document.getElementById('image-preview').src = currentNoteImage;
            document.getElementById('image-preview-container').classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function clearImage() {
    currentNoteImage = null;
    document.getElementById('note-image').value = '';
    document.getElementById('image-preview-container').classList.add('hidden');
}

/* =========================================
   6. POMODORO TIMER
   ========================================= */
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    
    // Find the button that was clicked (safely)
    const buttons = document.querySelectorAll('.mode-btn');
    if(mode === 'pomodoro') buttons[0].classList.add('active');
    if(mode === 'short') buttons[1].classList.add('active');
    if(mode === 'long') buttons[2].classList.add('active');

    pauseTimer();
    if (mode === 'pomodoro') timeLeft = 25 * 60;
    else if (mode === 'short') timeLeft = 5 * 60;
    else if (mode === 'long') timeLeft = 15 * 60;
    
    updateTimerDisplay();
}

function startTimer() {
    if(!isRunning) {
        isRunning = true;
        timerInterval = setInterval(() => {
            if(timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                // Timer finished
                pauseTimer();
                if(currentMode === 'pomodoro') {
                    pomodoros++;
                    saveData();
                    alert("Focus session complete! Take a break.");
                } else {
                    alert("Break over! Back to work.");
                }
            }
        }, 1000);
    }
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

function resetTimer() {
    pauseTimer();
    setMode(currentMode);
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer-time').innerText = `${m}:${s}`;
}

/* =========================================
   7. UTILITIES (Draggable, Dark Mode)
   ========================================= */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

function clearAllData() {
    if(confirm("DANGER: This will wipe all notes and tasks. Are you sure?")) {
        localStorage.clear();
        location.reload();
    }
}

// Dragging Logic
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    // The header is the handle
    const header = elmnt.querySelector(".draggable-handle");
    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.margin = 0; 
        elmnt.style.position = "absolute";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Close modals when clicking strictly on the dark overlay
window.onclick = function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
    }
};