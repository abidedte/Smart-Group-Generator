// spinMode.js – Spin Mode with visual wheel, Auto & Manual spin

(function () {
  // ── State ──────────────────────────────────────────────────────────────────
  let spinStudentHelper = null;
  let allStudents = [];
  let numGroups = 0;
  let leaders = [];          // [studentObj or null] per group
  let pool = [];             // remaining students to assign
  let groups = [];           // [{students:[{...isLeader}], topic:''}]
  let currentGroupIdx = 0;
  let isSpinning = false;
  let isManualMode = false;
  let spinAnimId = null;
  let wheelColors = [];
  const SPIN_DURATION = 3000; // ms

  // Canvas
  let canvas, ctx;
  let wheelAngle = 0;        // current rotation in radians
  let targetAngle = 0;
  let spinStartTime = null;
  let spinStartAngle = 0;
  let totalSpinAngle = 0;
  let onSpinEnd = null;

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('spinWheel');
    ctx = canvas.getContext('2d');

    spinStudentHelper = wireStudentInput(
      'spinStudentInput', 'spinStudentCount', 'spinSortedList', 'spinSortBtn'
    );

    document.getElementById('spinProceedBtn').addEventListener('click', onProceed);
    document.getElementById('spinStartWheelBtn').addEventListener('click', onStartWheel);
    document.getElementById('spinBtn').addEventListener('click', onSpinClick);
    document.getElementById('manualModeToggle').addEventListener('change', e => {
      isManualMode = e.target.checked;
    });
    document.getElementById('spinResetBtn').addEventListener('click', onSpinReset);
    document.getElementById('spinExportTxt').addEventListener('click', () => exportTxt(groups, 'spin-groups.txt'));
    document.getElementById('spinExportPdf').addEventListener('click', () => exportPdfClean(groups, 'spin-groups.pdf'));

    drawIdleWheel();
  }

  // ── Step 1 → Step 2 ────────────────────────────────────────────────────────
  function onProceed() {
    clearError('spinInputError');
    clearError('spinGroupError');

    allStudents = spinStudentHelper.getSortedStudents();
    if (!allStudents.length) {
      showError('spinInputError', '⚠ Please enter at least one student.');
      return;
    }
    numGroups = parseInt(document.getElementById('spinGroupCount').value, 10);
    if (!numGroups || numGroups <= 0) {
      showError('spinGroupError', '⚠ Enter a valid number of groups.');
      return;
    }
    if (numGroups > allStudents.length) {
      showError('spinGroupError', '⚠ Group count cannot exceed total students.');
      return;
    }

    leaders = new Array(numGroups).fill(null);
    renderLeaderSelection();

    document.getElementById('spinStep1').classList.add('hidden');
    document.getElementById('spinStep2').classList.remove('hidden');
  }

  function renderLeaderSelection() {
    const container = document.getElementById('spinLeaderGroups');
    container.innerHTML = '';

    for (let g = 0; g < numGroups; g++) {
      const card = document.createElement('div');
      card.className = 'leader-group-card';
      card.innerHTML = `
        <div class="leader-group-title">👑 Group ${g + 1} Leader</div>
        <select class="leader-select" data-g="${g}">
          <option value="">— Select Leader —</option>
          ${allStudents.map(s => `<option value="${s.id}|${s.name}">${s.id} – ${escHtml(s.name)}</option>`).join('')}
        </select>
        <div class="leader-selected-name" id="leader-name-${g}"></div>
      `;
      container.appendChild(card);

      card.querySelector('select').addEventListener('change', e => {
        const gi = parseInt(e.target.dataset.g);
        const val = e.target.value;
        if (!val) {
          leaders[gi] = null;
          document.getElementById(`leader-name-${gi}`).textContent = '';
          return;
        }
        const [id, ...nameParts] = val.split('|');
        const name = nameParts.join('|');
        leaders[gi] = { id, name };
        document.getElementById(`leader-name-${gi}`).textContent = `👑 ${name}`;
        // Prevent same student being selected as leader twice
        syncLeaderDropdowns();
      });
    }
  }

  function syncLeaderDropdowns() {
    const selectedIds = leaders.filter(Boolean).map(s => s.id);
    document.querySelectorAll('.leader-select').forEach(sel => {
      const gi = parseInt(sel.dataset.g);
      const ownLeaderId = leaders[gi]?.id;
      Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        const [id] = opt.value.split('|');
        opt.disabled = selectedIds.includes(id) && id !== ownLeaderId;
      });
    });
  }

  // ── Step 2 → Step 3 ────────────────────────────────────────────────────────
  function onStartWheel() {
    clearError('spinLeaderError');

    const missing = leaders.findIndex(l => !l);
    if (missing !== -1) {
      showError('spinLeaderError', `⚠ Please select a leader for Group ${missing + 1}.`);
      return;
    }

    // Check no duplicate leaders
    const leaderIds = leaders.map(l => l.id);
    if (new Set(leaderIds).size !== leaderIds.length) {
      showError('spinLeaderError', '⚠ Each leader must be a different student.');
      return;
    }

    // Build groups with leaders
    groups = leaders.map((leader, gi) => ({
      students: [{ ...leader, isLeader: true }],
      topic: ''
    }));

    // Pool = all students minus leaders
    const leaderIdSet = new Set(leaderIds);
    pool = allStudents.filter(s => !leaderIdSet.has(s.id)).map(s => ({ ...s, isLeader: false }));
    pool = shuffle(pool);

    currentGroupIdx = 0;
    isManualMode = document.getElementById('manualModeToggle').checked;

    document.getElementById('spinStep2').classList.add('hidden');
    document.getElementById('spinStep3').classList.remove('hidden');

    buildWheelColors();
    drawWheel();
    updateSpinUI();
    renderLiveGroups();
  }

  // ── Wheel Colors ───────────────────────────────────────────────────────────
  const PALETTE = [
    '#4299e1','#48bb78','#ed8936','#9f7aea','#f56565',
    '#38b2ac','#ecc94b','#fc8181','#68d391','#76e4f7',
    '#b794f4','#fbd38d','#90cdf4','#9ae6b4','#feb2b2'
  ];

  function buildWheelColors() {
    wheelColors = pool.map((_, i) => PALETTE[i % PALETTE.length]);
  }

  // ── Draw Wheel ─────────────────────────────────────────────────────────────
  function drawIdleWheel() {
    if (!canvas) return;
    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 6;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grad.addColorStop(0, '#4299e1');
    grad.addColorStop(1, '#2b6cb0');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎡 Spin Wheel', cx, cy);
  }

  function drawWheel() {
    if (!pool.length) return;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const r = cx - 6;
    const total = pool.length;
    const arc = (Math.PI * 2) / total;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#eee';
    ctx.fill();
    ctx.restore();

    pool.forEach((student, i) => {
      const start = wheelAngle + i * arc - Math.PI / 2;
      const end = start + arc;

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = wheelColors[i] || PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      if (total <= 30) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        const fontSize = Math.max(7, Math.min(12, 200 / total));
        ctx.font = `bold ${fontSize}px Nunito, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        const label = total > 20 ? student.name.split(' ')[0] : student.name;
        ctx.fillText(label, r - 8, 4);
        ctx.restore();
      }
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4299e1';
    ctx.font = 'bold 11px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pool.length, cx, cy);
  }

  // ── Spin Animation ─────────────────────────────────────────────────────────
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateSpin(timestamp) {
    if (!spinStartTime) spinStartTime = timestamp;
    const elapsed = timestamp - spinStartTime;
    const progress = Math.min(elapsed / SPIN_DURATION, 1);
    const eased = easeOut(progress);

    wheelAngle = spinStartAngle + totalSpinAngle * eased;
    drawWheel();

    if (progress < 1) {
      spinAnimId = requestAnimationFrame(animateSpin);
    } else {
      wheelAngle = spinStartAngle + totalSpinAngle;
      drawWheel();
      if (onSpinEnd) onSpinEnd();
    }
  }

  function startSpin(winnerIdx) {
    // Calculate angle to land on winnerIdx
    const total = pool.length;
    const arc = (Math.PI * 2) / total;

    // The "top" of the wheel (pointer position) is at -π/2 in canvas coords
    // We want winner slice to be at top
    // Center angle of winner slice relative to wheel start:
    const sliceCenter = winnerIdx * arc + arc / 2;
    // We want: wheelAngle + sliceCenter - π/2 ≡ 0 (mod 2π) → at top
    // Extra full rotations for drama (5-8)
    const extraRotations = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
    const normalizedCurrent = ((wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const targetOffset = (Math.PI / 2) - sliceCenter;
    const needed = ((targetOffset - normalizedCurrent) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    spinStartAngle = wheelAngle;
    totalSpinAngle = extraRotations + needed;
    spinStartTime = null;

    spinAnimId = requestAnimationFrame(animateSpin);
  }

  // ── Spin Click ─────────────────────────────────────────────────────────────
  function onSpinClick() {
    if (isSpinning || !pool.length) return;
    doOneSpin();
  }

  function doOneSpin() {
    if (!pool.length) {
      finishAll();
      return;
    }

    isSpinning = true;
    document.getElementById('spinBtn').disabled = true;
    document.getElementById('spinResult').classList.add('hidden');

    // Pick a random winner
    const winnerIdx = Math.floor(Math.random() * pool.length);
    const winner = pool[winnerIdx];
    const assignedGroup = currentGroupIdx;

    onSpinEnd = () => {
      // Assign winner to group
      groups[assignedGroup].students.push({ ...winner, isLeader: false });

      // Remove from pool
      pool.splice(winnerIdx, 1);
      buildWheelColors();

      // Show result
      const resultEl = document.getElementById('spinResult');
      document.getElementById('spinResultName').textContent = `${winner.id} – ${winner.name}`;
      document.getElementById('spinResultGroup').textContent = `→ Assigned to Group ${assignedGroup + 1}`;
      resultEl.classList.remove('hidden');

      // Advance group index (round-robin)
      currentGroupIdx = (currentGroupIdx + 1) % numGroups;

      // Update UI
      updateSpinUI();
      renderLiveGroups(assignedGroup);

      isSpinning = false;

      if (!pool.length) {
        // All done
        setTimeout(finishAll, 1200);
        return;
      }

      if (!isManualMode) {
        // Auto mode: spin again after short delay
        setTimeout(() => {
          if (!pool.length) return finishAll();
          doOneSpin();
        }, 1200);
      } else {
        // Manual mode: wait for click
        document.getElementById('spinBtn').disabled = false;
      }
    };

    startSpin(winnerIdx);
  }

  function updateSpinUI() {
    document.getElementById('remainingCount').textContent = `Remaining: ${pool.length}`;
    document.getElementById('nextGroupBadge').textContent = pool.length
      ? `Next: Group ${currentGroupIdx + 1}`
      : 'All done!';
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.textContent = pool.length ? '🎡 Spin!' : '🎉 Done!';
    spinBtn.disabled = !pool.length || isSpinning;
  }

  // ── Live Groups Panel ──────────────────────────────────────────────────────
  function renderLiveGroups(highlightGroup) {
    const container = document.getElementById('spinGroupsLive');
    container.innerHTML = '';

    groups.forEach((g, gi) => {
      const card = document.createElement('div');
      card.className = 'spin-live-card' + (gi === currentGroupIdx && pool.length ? ' active-group' : '');
      card.innerHTML = `
        <div class="spin-live-card-title">
          Group ${gi + 1}
          <span style="font-size:0.75rem;color:var(--text3);font-weight:500">(${g.students.length})</span>
        </div>
        <div class="spin-live-members">
          ${g.students.map(s => `<span class="member-chip ${s.isLeader ? 'leader' : ''}" title="${escHtml(s.id)} – ${escHtml(s.name)}">${s.isLeader ? '👑 ' : ''}<strong>${escHtml(s.id)}</strong> – ${escHtml(s.name)}</span>`).join('')}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ── Finish ─────────────────────────────────────────────────────────────────
  function finishAll() {
    document.getElementById('spinStep3').classList.add('hidden');
    renderFinalGroups();
    document.getElementById('spinStep4').classList.remove('hidden');
    document.getElementById('spinStep4').scrollIntoView({ behavior: 'smooth' });
  }

  function renderFinalGroups() {
    const container = document.getElementById('spinFinalGroups');
    container.innerHTML = '';

    groups.forEach((group, gi) => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.style.animationDelay = (gi * 0.05) + 's';
      card.innerHTML = `
        <div class="group-card-header">
          <span class="group-card-title">Group ${gi + 1}</span>
          <span class="group-badge-count">${group.students.length} members</span>
        </div>
        <div id="spin-final-list-${gi}"></div>
        <input type="text" class="topic-input" placeholder="📌 Add topic (optional)"
               value="${escHtml(group.topic)}" data-gi="${gi}" />
      `;
      container.appendChild(card);

      const listEl = card.querySelector(`#spin-final-list-${gi}`);
      group.students.forEach(s => {
        const row = document.createElement('div');
        row.className = 'student-row' + (s.isLeader ? ' is-leader' : '');
        row.innerHTML = `
          <span class="sid">${escHtml(s.id)}</span>
          <span class="sname">${s.isLeader ? '👑 ' : ''}${escHtml(s.name)}</span>
        `;
        listEl.appendChild(row);
      });

      card.querySelector('.topic-input').addEventListener('input', e => {
        groups[parseInt(e.target.dataset.gi)].topic = e.target.value;
      });
    });
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function onSpinReset() {
    // Cancel animation
    if (spinAnimId) cancelAnimationFrame(spinAnimId);
    isSpinning = false;

    allStudents = []; numGroups = 0; leaders = [];
    pool = []; groups = []; currentGroupIdx = 0;
    wheelAngle = 0;

    spinStudentHelper.clear();
    document.getElementById('spinGroupCount').value = '';

    ['spinStep2','spinStep3','spinStep4'].forEach(id =>
      document.getElementById(id).classList.add('hidden')
    );
    document.getElementById('spinStep1').classList.remove('hidden');
    document.getElementById('spinResult').classList.add('hidden');
    document.getElementById('spinGroupsLive').innerHTML = '';
    document.getElementById('spinFinalGroups').innerHTML = '';

    clearError('spinInputError');
    clearError('spinGroupError');
    clearError('spinLeaderError');

    drawIdleWheel();
  }

  window.initSpinMode = init;
})();
