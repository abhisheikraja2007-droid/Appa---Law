export function generateEfilingIndex(items = []) {
  let curPage = 1;
  const processed = items.map((item, idx) => {
    const pageCount = Math.max(1, parseInt(item.pages, 10) || 1);
    const startPage = curPage;
    const endPage = curPage + pageCount - 1;
    curPage = endPage + 1;

    return {
      slNo: idx + 1,
      title: item.title || "Document",
      annexureNo: item.annexure || "-",
      pageCount,
      startPage,
      endPage,
      pageRange: startPage === endPage ? `${startPage}` : `${startPage} – ${endPage}`
    };
  });

  const totalPages = curPage - 1;

  let tableRows = "";
  processed.forEach(p => {
    tableRows += `<tr>
      <td style="text-align:center;">${p.slNo}</td>
      <td>${p.annexureNo}</td>
      <td><b>${p.title}</b></td>
      <td style="text-align:center;">${p.pageCount}</td>
      <td style="text-align:center;font-weight:600;">${p.pageRange}</td>
    </tr>`;
  });

  const html = `
    <div style="font-family:'Times New Roman',serif;padding:12px;">
      <h3 style="text-align:center;text-decoration:underline;margin:0 0 4px;">INDEX OF PLEADINGS & ANNEXURES</h3>
      <p style="text-align:center;font-size:12px;margin:0 0 12px;">(As per High Court / District Court e-Filing v3.0 Guidelines)</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="width:40px;">Sl. No.</th>
            <th style="width:80px;">Annexure</th>
            <th>Description of Document / Pleading</th>
            <th style="width:60px;">Pages</th>
            <th style="width:90px;">Page No. Range</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold;background:#fafafa;">
            <td colspan="3" style="text-align:right;">Total Running Pages:</td>
            <td style="text-align:center;">${totalPages}</td>
            <td style="text-align:center;">1 – ${totalPages}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  return {
    items: processed,
    totalPages,
    html
  };
}

