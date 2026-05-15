// smartGenerate.js – Smart Generate mode logic

(function () {
  let smartStudentHelper = null;
  let currentGroups = []; // [{students:[{id,name,isLeader}], topic:''}]

  function init() {
    smartStudentHelper = wireStudentInput(
      'smartStudentInput', 'smartStudentCount', 'smartSortedList', 'smartSortBtn'
    );

    document.getElementById('smartGenerateBtn').addEventListener('click', onGenerate);
    document.getElementById('smartRegenerateBtn').addEventListener('click', onRegenerate);
    document.getElementById('smartResetBtn').addEventListener('click', onReset);
    document.getElementById('smartExportTxt').addEventListener('click', () => exportTxt(currentGroups, 'smart-groups.txt'));
    document.getElementById('smartExportPdf').addEventListener('click', () => exportPdfClean(currentGroups, 'smart-groups.pdf'));
  }

  function onGenerate() {
    clearError('smartInputError');
    clearError('smartGroupError');

    const students = smartStudentHelper.getSortedStudents();
    if (!students.length) {
      showError('smartInputError', '⚠ Please enter at least one student.');
      return;
    }

    const n = parseInt(document.getElementById('smartGroupCount').value, 10);
    if (!n || n <= 0) {
      showError('smartGroupError', '⚠ Enter a valid number of groups.');
      return;
    }
    if (n > students.length) {
      showError('smartGroupError', '⚠ Group count cannot exceed total students.');
      return;
    }

    generateAndRender(students, n);
  }

  function onRegenerate() {
    const students = smartStudentHelper.getSortedStudents();
    const n = parseInt(document.getElementById('smartGroupCount').value, 10);
    if (!students.length || !n) return;
    generateAndRender(students, n);
  }

  function generateAndRender(students, n) {
    const distributed = distributeGroups(students, n);
    currentGroups = distributed.map(grp => ({
      students: grp.map(s => ({ ...s, isLeader: false })),
      topic: ''
    }));
    renderGroups();
    document.getElementById('smartResults').classList.remove('hidden');
    document.getElementById('smartResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderGroups() {
    const container = document.getElementById('smartGroupsContainer');
    container.innerHTML = '';

    currentGroups.forEach((group, gi) => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.style.animationDelay = (gi * 0.05) + 's';

      const leaderCount = group.students.filter(s => s.isLeader).length;

      card.innerHTML = `
        <div class="group-card-header">
          <span class="group-card-title">Group ${gi + 1}</span>
          <span class="group-badge-count">${group.students.length} members</span>
        </div>
        <div class="student-list" id="smart-list-${gi}"></div>
        <input type="text" class="topic-input" placeholder="📌 Add topic (optional)"
               value="${escHtml(group.topic)}" data-gi="${gi}" />
      `;

      container.appendChild(card);

      // Render student rows
      const listEl = card.querySelector(`#smart-list-${gi}`);
      renderStudentRows(listEl, group.students, gi);

      // Topic input
      card.querySelector('.topic-input').addEventListener('input', e => {
        currentGroups[parseInt(e.target.dataset.gi)].topic = e.target.value;
      });
    });
  }

  function renderStudentRows(container, students, gi) {
    container.innerHTML = '';
    students.forEach((s, si) => {
      const row = document.createElement('div');
      row.className = 'student-row' + (s.isLeader ? ' is-leader' : '');
      row.innerHTML = `
        <span class="sid">${escHtml(s.id)}</span>
        <span class="sname">${escHtml(s.name)}</span>
        <button class="crown-btn ${s.isLeader ? 'active' : ''}" title="Set as leader" data-gi="${gi}" data-si="${si}">👑</button>
      `;
      row.querySelector('.crown-btn').addEventListener('click', e => {
        const g = parseInt(e.currentTarget.dataset.gi);
        const s2 = parseInt(e.currentTarget.dataset.si);
        // Toggle: if already leader, remove. else set as only leader
        const group = currentGroups[g];
        const wasLeader = group.students[s2].isLeader;
        group.students.forEach(st => st.isLeader = false);
        if (!wasLeader) group.students[s2].isLeader = true;
        // Re-render this group's list
        const listEl = document.getElementById(`smart-list-${g}`);
        renderStudentRows(listEl, currentGroups[g].students, g);
      });
      container.appendChild(row);
    });
  }

  function onReset() {
    currentGroups = [];
    smartStudentHelper.clear();
    document.getElementById('smartGroupCount').value = '';
    document.getElementById('smartResults').classList.add('hidden');
    document.getElementById('smartGroupsContainer').innerHTML = '';
    clearError('smartInputError');
    clearError('smartGroupError');
  }

  // Expose init
  window.initSmartGenerate = init;
})();
