/* ================= 1. INITIALIZATION & DATA ================= */
// Safe Load Helper
const safeLoad = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } 
    catch (e) { return fallback; }
};

let todos = safeLoad('todos', []);
let notes = safeLoad('notes', []);
let folders = safeLoad('folders', [{id: 'general', name: 'General'}]);
let decks = safeLoad('decks', [{id: 'general', name: 'General', cards: []}]);
let pomodoros = parseInt(localStorage.getItem('pomodoros')) || 0;

// State
let currentFolderId = 'all';
let currentDeckId = 'general';
let editingNoteId = null;
let currentNoteImage = null;

// Timer
let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;

window.onload = () => {
    // 1. Restore Theme
    if(localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }

    // 2. Initialize UI
    updateStats();
    renderTodos();
    renderFolders();
    renderNotes();
    renderDecks();
    renderCards();
    
    // 3. Make Windows Draggable
    dragElement(document.getElementById("todo-window"));
    dragElement(document.getElementById("note-window"));
};

function saveData() {
    localStorage.setItem('todos', JSON.stringify(todos));
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('folders', JSON.stringify(folders));
    localStorage.setItem('decks', JSON.stringify(decks));
    localStorage.setItem('pomodoros', pomodoros);
    updateStats();
}

function updateStats() {
    document.getElementById('stat-note').innerText = notes.length;
    document.getElementById('stat-todo').innerText = todos.filter(t => !t.done).length;
    document.getElementById('stat-pomo').innerText = pomodoros;
}

/* ================= 2. NAVIGATION ================= */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');
    
    // Highlight sidebar
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => {
        if(l.getAttribute('onclick').includes(pageId)) l.classList.add('active');
    });

    if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

/* ================= 3. TO-DO LOGIC ================= */
function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = `card task-card`;
        div.style.padding = '15px';
        div.style.display = 'flex';
        div.style.gap = '15px';
        div.style.alignItems = 'center';
        div.style.borderLeft = todo.priority === 'high' ? '5px solid #fc5c7d' : '5px solid #38ef7d';
        
        div.innerHTML = `
            <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
            <div style="flex:1; text-decoration: ${todo.done ? 'line-through' : 'none'}">
                <strong>${todo.text}</strong><br>
                <small>${todo.date}</small>
            </div>
            <button onclick="deleteTodo(${todo.id})" class="btn-ghost" style="color:var(--danger)">✕</button>
        `;
        list.appendChild(div);
    });
}

function saveTodo() {
    const text = document.getElementById('modal-todo-text').value;
    const date = document.getElementById('modal-todo-date').value;
    const priority = document.getElementById('modal-todo-priority').value;
    
    if(text) {
        todos.push({ id: Date.now(), text, date, priority, done: false });
        saveData();
        closeModal('todo-modal');
        renderTodos();
    }
}

function toggleTodo(id) {
    const t = todos.find(x => x.id === id);
    if(t) { t.done = !t.done; saveData(); renderTodos(); }
}

function deleteTodo(id) {
    if(confirm('Delete?')) { todos = todos.filter(t => t.id !== id); saveData(); renderTodos(); }
}

/* ================= 4. NOTE & FOLDER LOGIC (FIXED) ================= */
function createFolder() {
    const name = prompt("Folder Name:");
    if(name) {
        folders.push({ id: 'f'+Date.now(), name });
        saveData();
        renderFolders();
    }
}

function selectFolder(id) {
    currentFolderId = id;
    renderFolders(); // Update active highlights
    renderNotes();   // Update grid
    
    // Update Title
    const f = folders.find(x => x.id === id);
    document.getElementById('current-folder-title').innerText = id === 'all' ? "All Notes" : f.name;
}

function renderFolders() {
    const list = document.getElementById('folder-list');
    
    // 1. Render Sidebar List
    let html = `
        <div class="folder-item ${currentFolderId === 'all' ? 'active' : ''}" onclick="selectFolder('all')">
            <span>📚 All Notes</span>
        </div>
    `;
    
    folders.forEach(f => {
        html += `
            <div class="folder-item ${currentFolderId === f.id ? 'active' : ''}" onclick="selectFolder('${f.id}')">
                <span>📁 ${f.name}</span>
                ${f.id !== 'general' ? `<button onclick="deleteFolder('${f.id}', event)" class="btn-ghost">✕</button>` : ''}
            </div>
        `;
    });
    list.innerHTML = html;

    // 2. Render Modal Dropdown
    const select = document.getElementById('note-folder-select');
    select.innerHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
}

function deleteFolder(id, e) {
    e.stopPropagation(); // Don't select the folder when deleting
    if(confirm('Delete folder and its notes?')) {
        folders = folders.filter(f => f.id !== id);
        notes = notes.filter(n => n.folderId !== id);
        selectFolder('all');
        saveData();
    }
}

function renderNotes() {
    const search = document.getElementById('note-search').value.toLowerCase();
    const grid = document.getElementById('notes-grid');
    
    const filtered = notes.filter(n => {
        const inFolder = currentFolderId === 'all' || n.folderId === currentFolderId;
        const inSearch = n.title.toLowerCase().includes(search);
        return inFolder && inSearch;
    });

    grid.innerHTML = filtered.map(n => `
        <div class="card note-card" onclick="openNoteModal(${n.id})">
            ${n.image ? `<img src="${n.image}">` : ''}
            <h3>${n.title}</h3>
            <div class="note-content">${n.content.substring(0, 60)}...</div>
            <div style="margin-top:auto; font-size:0.8rem; opacity:0.7">${n.tags.join(' ')}</div>
            <button onclick="deleteNote(${n.id}, event)" style="position:absolute; top:10px; right:10px; border:none; background:white; border-radius:50%; width:24px; height:24px; cursor:pointer; color:red;">✕</button>
        </div>
    `).join('');
}

function openNoteModal(id = null) {
    editingNoteId = id;
    const modal = document.getElementById('note-modal');
    
    // Sync Folder Selector
    renderFolders(); 

    if(id) {
        const n = notes.find(x => x.id === id);
        document.getElementById('note-title').value = n.title;
        document.getElementById('note-content').value = n.content;
        document.getElementById('note-tags').value = n.tags.join(', ');
        document.getElementById('note-folder-select').value = n.folderId || 'general';
        currentNoteImage = n.image;
        if(n.image) document.getElementById('image-preview').src = n.image;
        document.getElementById('image-preview-container').className = n.image ? 'image-preview-box' : 'hidden';
    } else {
        // New Note
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';
        document.getElementById('image-preview-container').className = 'hidden';
        currentNoteImage = null;
        // Default to current folder if specific one selected
        document.getElementById('note-folder-select').value = currentFolderId === 'all' ? 'general' : currentFolderId;
    }
    modal.classList.add('show');
}

function saveNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const folderId = document.getElementById('note-folder-select').value;
    const tags = document.getElementById('note-tags').value.split(',').map(t=>t.trim());

    if(!title) return alert('Title required');

    const note = { id: editingNoteId || Date.now(), title, content, folderId, tags, image: currentNoteImage };

    if(editingNoteId) {
        const idx = notes.findIndex(n => n.id === editingNoteId);
        notes[idx] = note;
    } else {
        notes.unshift(note);
    }
    saveData();
    closeModal('note-modal');
    renderNotes();
}

function deleteNote(id, e) {
    e.stopPropagation();
    if(confirm('Delete note?')) {
        notes = notes.filter(n => n.id !== id);
        saveData();
        renderNotes();
    }
}

/* ================= 5. FLASHCARD LOGIC (NEW) ================= */
function createDeck() {
    const name = prompt("Deck Name:");
    if(name) {
        decks.push({ id: 'd'+Date.now(), name, cards: [] });
        saveData();
        renderDecks();
    }
}

function renderDecks() {
    const list = document.getElementById('deck-list');
    list.innerHTML = decks.map(d => `
        <div class="folder-item ${currentDeckId === d.id ? 'active' : ''}" onclick="selectDeck('${d.id}')">
            <span>🗂️ ${d.name}</span>
            <span style="font-size:0.8rem; opacity:0.6">${d.cards.length} cards</span>
        </div>
    `).join('');
}

function selectDeck(id) {
    currentDeckId = id;
    const d = decks.find(x => x.id === id);
    document.getElementById('current-deck-title').innerText = d.name;
    renderDecks();
    renderCards();
}

function renderCards() {
    const deck = decks.find(d => d.id === currentDeckId);
    const grid = document.getElementById('card-grid');
    
    if(!deck || deck.cards.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:gray;">Empty Deck. Add a card!</p>`;
        return;
    }

    grid.innerHTML = deck.cards.map((c, index) => `
        <div class="flashcard-scene">
            <div class="flashcard-inner" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-front">
                    <div>${c.front}</div>
                </div>
                <div class="flashcard-back">
                    <div>${c.back}</div>
                </div>
            </div>
            <button onclick="deleteCard(${index})" style="position:absolute; top:0; right:0; z-index:10; background:red; color:white; border:none; width:25px; height:25px; border-radius:50%; cursor:pointer;">✕</button>
        </div>
    `).join('');
}

function openCardModal() {
    document.getElementById('card-front').value = '';
    document.getElementById('card-back').value = '';
    document.getElementById('card-modal').classList.add('show');
}

function saveCard() {
    const front = document.getElementById('card-front').value;
    const back = document.getElementById('card-back').value;
    
    if(front && back) {
        const deckIndex = decks.findIndex(d => d.id === currentDeckId);
        if(deckIndex > -1) {
            decks[deckIndex].cards.push({ front, back });
            saveData();
            closeModal('card-modal');
            renderDecks(); // Update count
            renderCards();
        }
    }
}

function deleteCard(index) {
    if(confirm('Delete card?')) {
        const deckIndex = decks.findIndex(d => d.id === currentDeckId);
        decks[deckIndex].cards.splice(index, 1);
        saveData();
        renderDecks();
        renderCards();
    }
}

/* ================= 6. UTILITIES ================= */
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

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

// Timer Logic
function setMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    timeLeft = mode === 'pomodoro' ? 25*60 : (mode === 'short' ? 5*60 : 15*60);
    updateTimerDisplay();
    isRunning = false; clearInterval(timerInterval);
}
function startTimer() {
    if(!isRunning) {
        isRunning = true;
        timerInterval = setInterval(() => {
            timeLeft--; updateTimerDisplay();
            if(timeLeft<=0) { clearInterval(timerInterval); alert('Time up!'); pomodoros++; saveData(); }
        }, 1000);
    }
}
function resetTimer() { clearInterval(timerInterval); isRunning=false; timeLeft=25*60; updateTimerDisplay(); }
function updateTimerDisplay() {
    const m = Math.floor(timeLeft/60).toString().padStart(2,'0');
    const s = (timeLeft%60).toString().padStart(2,'0');
    document.getElementById('timer-time').innerText = `${m}:${s}`;
}

// Global Modal Close
window.onclick = (e) => {
    if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
};

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}
function clearAllData() { if(confirm('Reset all?')) { localStorage.clear(); location.reload(); } }

// Draggable Helper
function dragElement(elmnt) {
    let pos1=0, pos2=0, pos3=0, pos4=0;
    const header = elmnt.querySelector(".draggable-handle");
    if(header) header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.margin = 0;
        elmnt.style.position = 'absolute'; 
    }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
}

// Initialize To-Do Modal Functions
function openTodoModal() {
    document.getElementById('modal-todo-text').value = '';
    document.getElementById('modal-todo-date').value = '';
    document.getElementById('todo-modal').classList.add('show');
}