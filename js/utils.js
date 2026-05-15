// utils.js – Shared helper functions

/**
 * Parse raw textarea input into student objects [{id, name}]
 * Accepts: "101 John Doe", "101,John Doe", "101\tJohn Doe"
 */
function parseStudents(raw) {
  const lines = raw.split('\n');
  const students = [];
  const seen = new Set();

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Replace comma or tab with space for uniformity
    const normalized = line.replace(/[,\t]+/, ' ');
    const spaceIdx = normalized.indexOf(' ');
    if (spaceIdx === -1) continue;

    const id = normalized.substring(0, spaceIdx).trim();
    const name = normalized.substring(spaceIdx + 1).trim();
    if (!id || !name) continue;

    const key = id + '|' + name;
    if (seen.has(key)) continue;
    seen.add(key);

    students.push({ id, name });
  }
  return students;
}

/**
 * Sort students by numeric ID, then alphabetically
 */
function sortStudents(students) {
  return [...students].sort((a, b) => {
    const na = parseInt(a.id, 10), nb = parseInt(b.id, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Fisher-Yates shuffle
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Distribute students into N groups using round-robin
 * Returns array of arrays
 */
function distributeGroups(students, n) {
  const groups = Array.from({ length: n }, () => []);
  const shuffled = shuffle(students);
  shuffled.forEach((s, i) => groups[i % n].push(s));
  return groups;
}

/**
 * Render sorted list into a container element
 */
function renderSortedList(container, students) {
  if (!students.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = students.map(s =>
    `<div class="sorted-list-item">
       <span class="sid">${escHtml(s.id)}</span>
       <span>${escHtml(s.name)}</span>
     </div>`
  ).join('');
}

/**
 * Escape HTML special chars
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wire up student textarea to auto-parse, count, sort
 */
function wireStudentInput(textareaId, countId, sortedListId, sortBtnId) {
  const ta = document.getElementById(textareaId);
  const countEl = document.getElementById(countId);
  const listEl = document.getElementById(sortedListId);
  const sortBtn = document.getElementById(sortBtnId);

  let currentStudents = [];

  function update() {
    currentStudents = parseStudents(ta.value);
    countEl.textContent = currentStudents.length + ' student' + (currentStudents.length !== 1 ? 's' : '');
  }

  ta.addEventListener('input', update);
  sortBtn.addEventListener('click', () => {
    currentStudents = sortStudents(parseStudents(ta.value));
    renderSortedList(listEl, currentStudents);
  });

  return {
    getStudents: () => parseStudents(ta.value),
    getSortedStudents: () => sortStudents(parseStudents(ta.value)),
    clear: () => {
      ta.value = '';
      listEl.innerHTML = '';
      countEl.textContent = '0 students';
    }
  };
}

/**
 * Show an error message element (clears after 4s)
 */
function showError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'errorShake 0.4s ease';
  });
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; }, 4000);
}

function clearError(elId) {
  const el = document.getElementById(elId);
  if (el) el.textContent = '';
}
