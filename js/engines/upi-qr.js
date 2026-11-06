function createQrMatrix(text) {
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));

  function addFinder(startX, startY) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(size - 7, 0);
  addFinder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 8 && c < 8) ||
        (r < 8 && c >= size - 8) ||
        (r >= size - 8 && c < 8);
      if (!inFinder && matrix[r][c] === false) {
        const bit = ((hash ^ (r * 31 + c * 17)) >>> ( (r + c) % 31 )) & 1;
        if (bit === 1) matrix[r][c] = true;
      }
    }
  }

  return matrix;
}

export function generateUpiUri(pa, pn, am, tn = "Legal Consultation / Professional Fees") {
  const cleanPa = encodeURIComponent(String(pa || "").trim());
  const cleanPn = encodeURIComponent(String(pn || "Advocate Thangarajus").trim());
  const cleanAm = parseFloat(String(am).replace(/[^0-9.]/g, "")) || 0;
  const cleanTn = encodeURIComponent(String(tn).trim());

  let uri = `upi://pay?pa=${cleanPa}&pn=${cleanPn}&cu=INR`;
  if (cleanAm > 0) uri += `&am=${cleanAm.toFixed(2)}`;
  if (cleanTn) uri += `&tn=${cleanTn}`;
  return uri;
}

export function renderUpiQrSvg(pa, pn, am, tn = "Legal Fees", pxSize = 140) {
  const uri = generateUpiUri(pa, pn, am, tn);
  const matrix = createQrMatrix(uri);
  const size = matrix.length;
  const cellSize = pxSize / size;

  let rects = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = (c * cellSize).toFixed(2);
        const y = (r * cellSize).toFixed(2);
        const w = (cellSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="#000000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pxSize} ${pxSize}" width="${pxSize}" height="${pxSize}" style="background:#ffffff;padding:4px;border:1px solid #c9d1dc;border-radius:4px">
    ${rects}
  </svg>`;
}

