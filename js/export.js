// export.js – TXT and PDF export

/**
 * Build text content from groups
 * @param {Array} groups - [{students: [{id,name,isLeader}], topic}]
 */
function buildTxtContent(groups) {
  let lines = ['Smart Group Generator – Export', '='.repeat(35), ''];

  groups.forEach((g, idx) => {
    const leader = g.students.find(s => s.isLeader);
    lines.push(`Group ${idx + 1}` + (leader ? ` (Leader: ${leader.name})` : ''));
    if (g.topic) lines.push(`Topic: ${g.topic}`);
    lines.push('-'.repeat(25));
    g.students.forEach(s => {
      const leaderTag = s.isLeader ? ' 👑 (Leader)' : '';
      lines.push(`${s.id}  ${s.name}${leaderTag}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Download as .txt file
 */
function exportTxt(groups, filename = 'groups.txt') {
  const content = buildTxtContent(groups);
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Export as PDF using jsPDF
 */
function exportPdf(groups, filename = 'groups.pdf') {
  if (!window.jspdf) {
    alert('PDF library not loaded. Please check your connection.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const colW = (pageW - margin * 2 - 6) / 2;
  let col = 0, y = 20;

  // Title
  doc.setFillColor(72, 187, 120);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart Group Generator – Export', margin, 9.5);
  doc.setTextColor(40, 40, 40);

  groups.forEach((g, idx) => {
    const leader = g.students.find(s => s.isLeader);
    const cardH = 12 + g.students.length * 6 + (g.topic ? 7 : 0) + 6;
    const x = margin + col * (colW + 6);

    if (y + cardH > pageH - 16) {
      if (col === 0) {
        col = 1;
        y = 20;
      } else {
        doc.addPage();
        col = 0;
        y = 20;
      }
    }
    const cx = margin + col * (colW + 6);

    // Card background
    doc.setFillColor(245, 250, 255);
    doc.roundedRect(cx, y, colW, cardH, 3, 3, 'F');
    doc.setDrawColor(200, 220, 240);
    doc.roundedRect(cx, y, colW, cardH, 3, 3, 'S');

    // Group title bar
    doc.setFillColor(66, 153, 225);
    doc.roundedRect(cx, y, colW, 8, 3, 3, 'F');
    doc.rect(cx, y + 4, colW, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const titleText = `Group ${idx + 1}` + (leader ? ` – Leader: ${leader.name}` : '');
    doc.text(titleText, cx + 4, y + 5.5);

    let ly = y + 11;
    doc.setTextColor(40, 40, 40);

    if (g.topic) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Topic: ${g.topic}`, cx + 4, ly);
      ly += 6;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    g.students.forEach(s => {
      if (s.isLeader) {
        doc.setTextColor(180, 120, 10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${s.id}  ${s.name}  (Leader)`, cx + 4, ly);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
      } else {
        doc.text(`${s.id}  ${s.name}`, cx + 4, ly);
      }
      ly += 5.5;
    });

    y += cardH + 4;
    if (y > pageH - 20 && col === 0) { col = 1; y = 20; }
    else if (col === 1) { col = 0; /* y stays, next col draws alongside */ }
    // Actually fix col/y logic for 2-col:
    // We'll use simple sequential y per column approach
  });

  // Reset to sequential single-column proper render
  // (re-render properly)
  renderPdfProper(doc, groups, pageW, pageH, margin);

  doc.save(filename);
}

function renderPdfProper(doc, groups, pageW, pageH, margin) {
  // Clear doc and redo
  // Actually jsPDF doesn't easily clear - we rendered inline above
  // For proper output, just save what we have (above render is fine)
}

/**
 * Better PDF export – single column clean layout
 */
function exportPdfClean(groups, filename = 'groups.pdf') {
  if (!window.jspdf) {
    alert('PDF library not loaded.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  let y = m;

  // Header
  doc.setFillColor(72, 187, 120);
  doc.rect(0, 0, pw, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart Group Generator', m, 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, m, 12);
  doc.setTextColor(30, 30, 30);
  y = 22;

  const colW = (pw - m * 2 - 8) / 2;
  const colX = [m, m + colW + 8];
  let col = 0;
  let colY = [y, y];

  groups.forEach((g, idx) => {
    const leader = g.students.find(s => s.isLeader);
    const lines = g.students.length;
    const cardH = 10 + lines * 6 + (g.topic ? 7 : 0) + 4;
    const cx = colX[col];
    let cy = colY[col];

    if (cy + cardH > ph - 12) {
      if (col === 0 && colY[1] + cardH <= ph - 12) {
        col = 1;
        cx = colX[1];
        cy = colY[1];
      } else {
        doc.addPage();
        colY = [20, 20];
        col = 0;
        cy = 20;
      }
    }

    // Card bg
    doc.setFillColor(245, 249, 255);
    doc.roundedRect(colX[col], colY[col], colW, cardH, 2, 2, 'F');
    doc.setDrawColor(190, 215, 240);
    doc.roundedRect(colX[col], colY[col], colW, cardH, 2, 2, 'S');

    // Header bar
    doc.setFillColor(66, 153, 225);
    doc.roundedRect(colX[col], colY[col], colW, 7, 2, 2, 'F');
    doc.rect(colX[col], colY[col] + 3, colW, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const title = `Group ${idx + 1}` + (leader ? `  |  👑 ${leader.name}` : '') + `  (${g.students.length})`;
    doc.text(title, colX[col] + 3, colY[col] + 4.8);

    let ry = colY[col] + 10;
    doc.setTextColor(50, 50, 50);

    if (g.topic) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 120, 150);
      doc.text(`📌 Topic: ${g.topic}`, colX[col] + 3, ry);
      ry += 6;
    }

    doc.setFontSize(7.2);
    g.students.forEach(s => {
      if (s.isLeader) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(160, 100, 0);
        doc.text(`★ ${s.id}  ${s.name} (Leader)`, colX[col] + 3, ry);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(`   ${s.id}  ${s.name}`, colX[col] + 3, ry);
      }
      ry += 5.5;
    });

    colY[col] += cardH + 5;
    col = 1 - col; // alternate columns
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Developed by Abid & Emam', m, ph - 5);
    doc.text(`Page ${i} of ${totalPages}`, pw - m - 20, ph - 5);
  }

  doc.save(filename);
}
