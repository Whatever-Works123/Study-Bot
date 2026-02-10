/* ================= 1. SETUP & DATA ================= */
const safeLoad = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } };

let todos = safeLoad('todos', []);
let notes = safeLoad('notes', []);
let folders = safeLoad('folders', [{id: 'general', name: 'General'}]);
let deckFolders = safeLoad('deckFolders', [{id: 'general', name: 'General'}]);
let decks = safeLoad('decks', []);
let pomodoros = parseInt(localStorage.getItem('pomodoros')) || 0;

// State
let currentFolderId = 'all';
let currentDeckFolderId = 'all';
let editingNoteId = null;
let currentNoteImage = null;
let tempCards = [];

// Timer
let timerInterval;
let timeLeft = 25 * 60;
let totalTime = 25 * 60; // Needed for ring calculation
let isRunning = false;

window.onload = () => {
    if(localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }
    
    // Init Draggable Windows
    dragElement(document.getElementById("todo-window"));
    dragElement(document.getElementById("note-window"));
    dragElement(document.getElementById("deck-window"));
    
    // Init UI
    updateStats();
    renderTodos();
    renderFolders();
    renderNotes();
    renderDeckFolders();
    renderDecks();
    
    // Init SVG Circle
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = 0;
};

function saveData() {
    localStorage.setItem('todos', JSON.stringify(todos));
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('folders', JSON.stringify(folders));
    localStorage.setItem('deckFolders', JSON.stringify(deckFolders));
    localStorage.setItem('decks', JSON.stringify(decks));
    localStorage.setItem('pomodoros', pomodoros);
    updateStats();
}

function updateStats() {
    document.getElementById('stat-note').innerText = notes.length;
    document.getElementById('stat-todo').innerText = todos.filter(t => !t.done).length;
    document.getElementById('stat-deck').innerText = decks.length;
    document.getElementById('stat-pomo').innerText = pomodoros;
}

/* ================= 2. NAVIGATION ================= */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

/* ================= 3. TIMER LOGIC (NEW CIRCULAR) ================= */
function setMode(mode) {
    document.querySelectorAll('.mode-pill').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    timeLeft = mode === 'pomodoro' ? 25*60 : (mode === 'short' ? 5*60 : 15*60);
    totalTime = timeLeft; // Reset total for ring calculation
    
    document.getElementById('timer-label').innerText = mode.toUpperCase();
    updateTimer();
    isRunning = false; clearInterval(timerInterval);
    document.getElementById('btn-start').innerText = "▶";
    setProgress(100);
}

function startTimer() {
    if(!isRunning) {
        isRunning = true;
        document.getElementById('btn-start').innerText = "⏸";
        timerInterval = setInterval(() => {
            timeLeft--; 
            updateTimer();
            if(timeLeft <= 0) { 
                clearInterval(timerInterval); 
                alert('Time up!'); 
                pomodoros++; 
                saveData(); 
                resetTimer();
            }
        }, 1000);
    } else {
        clearInterval(timerInterval);
        isRunning = false;
        document.getElementById('btn-start').innerText = "▶";
    }
}

function resetTimer() {
    clearInterval(timerInterval); 
    isRunning = false; 
    document.getElementById('btn-start').innerText = "▶";
    // Default back to pomodoro or current mode reset
    timeLeft = totalTime;
    updateTimer();
    setProgress(100);
}

function updateTimer() {
    const m = Math.floor(timeLeft/60).toString().padStart(2,'0');
    const s = (timeLeft%60).toString().padStart(2,'0');
    document.getElementById('timer-time').innerText = `${m}:${s}`;
    
    // Update Ring
    const percent = (timeLeft / totalTime) * 100;
    setProgress(percent);
}

function setProgress(percent) {
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

/* ================= 4. TASKS ================= */
function openTodoModal() { document.getElementById('todo-modal').classList.add('show'); }
function saveTodo() {
    const text = document.getElementById('modal-todo-text').value;
    const date = document.getElementById('modal-todo-date').value;
    const priority = document.getElementById('modal-todo-priority').value;
    if(!text) return alert("Task name required!");
    todos.push({ id: Date.now(), text, date, priority, done: false });
    saveData(); closeModal('todo-modal'); renderTodos();
}
function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = todos.map(t => `
        <div class="card" style="padding:15px; display:flex; align-items:center; gap:15px; border-left: 5px solid ${t.priority==='high'?'#fc5c7d':'#38ef7d'}">
            <input type="checkbox" ${t.done?'checked':''} onchange="toggleTodo(${t.id})">
            <div style="flex:1; text-decoration:${t.done?'line-through':''}">
                <b>${t.text}</b><br><small>${t.date || 'No date'}</small>
            </div>
            <button class="btn-ghost" onclick="deleteTodo(${t.id})">✕</button>
        </div>
    `).join('');
}
function toggleTodo(id) { const t = todos.find(x=>x.id===id); if(t) { t.done=!t.done; saveData(); renderTodos(); } }
function deleteTodo(id) { if(confirm('Delete?')) { todos=todos.filter(x=>x.id!==id); saveData(); renderTodos(); } }

/* ================= 5. NOTES ================= */
function createFolder() {
    const name = prompt("Folder Name:");
    if(name) { folders.push({id: 'f'+Date.now(), name}); saveData(); renderFolders(); }
}
function selectFolder(id) {
    currentFolderId = id;
    document.getElementById('current-folder-title').innerText = id==='all' ? 'All Notes' : folders.find(x=>x.id===id).name;
    renderFolders(); renderNotes();
}
function renderFolders() {
    const list = document.getElementById('folder-list');
    list.innerHTML = `
        <div class="folder-item ${currentFolderId==='all'?'active':''}" onclick="selectFolder('all')">All Notes</div>
        ${folders.map(f => `
            <div class="folder-item ${currentFolderId===f.id?'active':''}" onclick="selectFolder('${f.id}')">
                📁 ${f.name}
            </div>
        `).join('')}
    `;
}
function renderNotes() {
    const search = document.getElementById('note-search').value.toLowerCase();
    const grid = document.getElementById('notes-grid');
    const filtered = notes.filter(n => {
        const matchFolder = currentFolderId==='all' || n.folderId===currentFolderId;
        const matchSearch = n.title.toLowerCase().includes(search);
        return matchFolder && matchSearch;
    });
    grid.innerHTML = filtered.map(n => `
        <div class="card note-card" onclick="openNoteModal(${n.id})">
            ${n.image ? `<img src="${n.image}">` : ''}
            <h3>${n.title}</h3>
            <div style="flex:1; overflow:hidden; font-size:0.9rem; margin-top:5px; opacity:0.8">${n.content.substring(0,80)}...</div>
            <button onclick="deleteNote(${n.id}, event)" style="position:absolute; top:10px; right:10px; background:white; border-radius:50%; width:25px; height:25px; border:none; cursor:pointer; color:red;">✕</button>
        </div>
    `).join('');
}
function openNoteModal(id = null) {
    editingNoteId = id;
    const modal = document.getElementById('note-modal');
    const select = document.getElementById('note-folder-select');
    select.innerHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    if(id) {
        const n = notes.find(x => x.id === id);
        document.getElementById('note-title').value = n.title;
        document.getElementById('note-content').value = n.content;
        document.getElementById('note-tags').value = n.tags.join(', ');
        select.value = n.folderId || 'general';
        currentNoteImage = n.image;
        if(n.image) document.getElementById('image-preview').src = n.image;
        document.getElementById('image-preview-container').className = n.image ? '' : 'hidden';
    } else {
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';
        select.value = currentFolderId === 'all' ? 'general' : currentFolderId;
        currentNoteImage = null;
        document.getElementById('image-preview-container').className = 'hidden';
    }
    modal.classList.add('show');
}
function saveNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const folderId = document.getElementById('note-folder-select').value;
    const tags = document.getElementById('note-tags').value;
    if(!title) return alert("Note Title is required!");
    const note = { id: editingNoteId || Date.now(), title, content, folderId, tags: tags.split(',').map(t=>t.trim()), image: currentNoteImage };
    if(editingNoteId) { const idx = notes.findIndex(n=>n.id===editingNoteId); notes[idx] = note; } 
    else { notes.unshift(note); }
    saveData(); closeModal('note-modal'); renderNotes();
}
function deleteNote(id, e) { e.stopPropagation(); if(confirm('Delete?')) { notes=notes.filter(n=>n.id!==id); saveData(); renderNotes(); } }

/* ================= 6. FLASHCARDS ================= */
function createDeckFolder() {
    const name = prompt("Topic Name:");
    if(name) { deckFolders.push({id:'df'+Date.now(), name}); saveData(); renderDeckFolders(); }
}
function renderDeckFolders() {
    const list = document.getElementById('deck-folder-list');
    list.innerHTML = `
        <div class="folder-item ${currentDeckFolderId==='all'?'active':''}" onclick="selectDeckFolder('all')">All Decks</div>
        ${deckFolders.map(f => `
            <div class="folder-item ${currentDeckFolderId===f.id?'active':''}" onclick="selectDeckFolder('${f.id}')">
                📁 ${f.name}
            </div>
        `).join('')}
    `;
    const select = document.getElementById('deck-folder-select');
    if(select) select.innerHTML = deckFolders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
}
function selectDeckFolder(id) {
    currentDeckFolderId = id;
    document.getElementById('current-deck-folder-title').innerText = id==='all' ? 'All Decks' : deckFolders.find(x=>x.id===id).name;
    renderDeckFolders(); renderDecks();
    closeStudyMode();
}
function openDeckBuilder() {
    document.getElementById('deck-title').value = '';
    document.getElementById('new-card-front').value = '';
    document.getElementById('new-card-back').value = '';
    tempCards = []; renderTempCards();
    document.getElementById('deck-folder-select').value = currentDeckFolderId==='all' ? 'general' : currentDeckFolderId;
    document.getElementById('deck-modal').classList.add('show');
}
function addCardToTemp() {
    const front = document.getElementById('new-card-front').value;
    const back = document.getElementById('new-card-back').value;
    if(front && back) {
        tempCards.push({front, back});
        document.getElementById('new-card-front').value = '';
        document.getElementById('new-card-back').value = '';
        document.getElementById('new-card-front').focus();
        renderTempCards();
    }
}
function renderTempCards() {
    document.getElementById('temp-card-count').innerText = tempCards.length;
    document.getElementById('temp-card-list').innerHTML = tempCards.map((c,i) => `
        <div style="background:rgba(0,0,0,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between;">
            <div><b>Q:</b> ${c.front} <br> <b>A:</b> ${c.back}</div>
            <button class="btn-ghost" style="color:red;" onclick="removeTempCard(${i})">✕</button>
        </div>
    `).join('');
}
function removeTempCard(i) { tempCards.splice(i,1); renderTempCards(); }
function saveDeck() {
    const title = document.getElementById('deck-title').value;
    const folderId = document.getElementById('deck-folder-select').value;
    if(!title) return alert("Deck name required!");
    if(tempCards.length === 0) return alert("Add at least one card!");
    decks.push({ id: Date.now(), title, folderId, cards: [...tempCards] });
    saveData(); closeModal('deck-modal'); renderDecks();
}
function renderDecks() {
    const grid = document.getElementById('deck-grid');
    const filtered = decks.filter(d => currentDeckFolderId==='all' || d.folderId===currentDeckFolderId);
    grid.innerHTML = filtered.map(d => `
        <div class="card note-card" style="height:auto; min-height:150px;" onclick="studyDeck(${d.id})">
            <h3>🗂️ ${d.title}</h3>
            <p style="margin-top:10px; color:var(--text-secondary);">${d.cards.length} Cards</p>
            <button class="btn" style="margin-top:15px; width:100%;">Study Now</button>
            <button onclick="deleteDeck(${d.id}, event)" style="position:absolute; top:10px; right:10px; border:none; background:transparent; color:red; cursor:pointer;">✕</button>
        </div>
    `).join('');
}
function deleteDeck(id, e) { e.stopPropagation(); if(confirm("Delete deck?")) { decks=decks.filter(d=>d.id!==id); saveData(); renderDecks(); } }
function studyDeck(id) {
    const deck = decks.find(d => d.id === id);
    if(!deck) return;
    document.getElementById('deck-grid').style.display = 'none';
    document.getElementById('study-area').classList.remove('hidden');
    document.getElementById('current-deck-folder-title').innerText = `Studying: ${deck.title}`;
    const container = document.getElementById('active-study-card');
    if(deck.cards.length > 0) renderFlashcard(deck.cards[0], container);
}
function renderFlashcard(card, container) {
    container.innerHTML = `
        <div class="flashcard-scene" onclick="this.children[0].classList.toggle('flipped')">
            <div class="flashcard-inner">
                <div class="flashcard-front">${card.front}</div>
                <div class="flashcard-back">${card.back}</div>
            </div>
        </div>
        <p style="text-align:center; margin-top:15px; color:var(--text-secondary);">(Click card to flip)</p>
    `;
}
function closeStudyMode() {
    document.getElementById('study-area').classList.add('hidden');
    document.getElementById('deck-grid').style.display = 'grid';
    selectDeckFolder(currentDeckFolderId);
}

/* ================= UTILS ================= */
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function clearAllData() { if(confirm("Reset everything?")) { localStorage.clear(); location.reload(); } }
function previewImage(input) { if(input.files && input.files[0]) { const r=new FileReader(); r.onload=e=>{currentNoteImage=e.target.result; document.getElementById('image-preview').src=currentNoteImage; document.getElementById('image-preview-container').className='';}; r.readAsDataURL(input.files[0]); } }
function clearImage() { currentNoteImage=null; document.getElementById('image-preview-container').className='hidden'; document.getElementById('note-image').value=''; }
function dragElement(elmnt) { let pos1=0,pos2=0,pos3=0,pos4=0; const header=elmnt.querySelector(".draggable-handle"); if(header) header.onmousedown=dragMouseDown; function dragMouseDown(e){ if(['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)) return; e.preventDefault(); pos3=e.clientX; pos4=e.clientY; document.onmouseup=closeDragElement; document.onmousemove=elementDrag; } function elementDrag(e){ e.preventDefault(); pos1=pos3-e.clientX; pos2=pos4-e.clientY; pos3=e.clientX; pos4=e.clientY; elmnt.style.top=(elmnt.offsetTop-pos2)+"px"; elmnt.style.left=(elmnt.offsetLeft-pos1)+"px"; elmnt.style.position='absolute'; } function closeDragElement(){ document.onmouseup=null; document.onmousemove=null; } }
window.onclick = e => { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); };
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); localStorage.setItem('darkMode', document.body.classList.contains('dark-mode')); }