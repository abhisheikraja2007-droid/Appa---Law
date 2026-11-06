function escapePdfText(t) {
  return String(t).replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
}

function wrapText(t, maxLen) {
  const words = String(t).split(" ");
  const lines = [];
  let current = "";
  words.forEach(w => {
    if ((current + " " + w).trim().length > maxLen) {
      lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

function buildPdfBinary(lines) {
  let y = 790;
  let streamContent = "BT\n";
  lines.forEach(l => {
    streamContent += "/" + (l.b ? "F2" : "F1") + " " + l.s + " Tf 1 0 0 1 56 " + y + " Tm (" + escapePdfText(l.t) + ") Tj\n";
    y -= l.s * 1.7;
  });
  streamContent += "ET";

  const obj = [];
  obj[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  obj[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  obj[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>";
  obj[4] = "<< /Length " + streamContent.length + " >>\nstream\n" + streamContent + "\nendstream";
  obj[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  obj[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let s = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = s.length;
    s += i + " 0 obj\n" + obj[i] + "\nendobj\n";
  }
  const startXref = s.length;
  s += "xref\n0 7\n0000000000 65535 f \n";
  for (let i = 1; i <= 6; i++) {
    s += ("0000000000" + offsets[i]).slice(-10) + " 00000 n \n";
  }
  s += "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" + startXref + "\n%%EOF";

  return new Uint8Array(Array.from(s).map(ch => ch.charCodeAt(0) & 255));
}

export function generateReceiptPdf(receipt) {
  const lines = [
    { t: "RECEIPT", s: 20, b: 1 },
    { t: "Diligent in Law - Advocate Thangarajus", s: 10 },
    { t: "", s: 10 },
    { t: "Receipt No.: " + receipt.no, s: 12, b: 1 },
    { t: "Date and time: " + receipt.dt, s: 12 },
    { t: "", s: 10 }
  ];

  const bodyText = "Received with thanks Rs. " + receipt.am + " (Rupees " + receipt.words + " only) from " + receipt.nm + " towards " + receipt.rp + (receipt.per ? " for " + receipt.per : "") + (receipt.pr ? " for the property: " + receipt.pr : "") + ".";
  wrapText(bodyText, 78).forEach(t => lines.push({ t: t, s: 12 }));

  lines.push(
    { t: "", s: 10 },
    { t: "Mode of payment: " + receipt.mo + (receipt.ref ? " - reference " + receipt.ref : ""), s: 12 },
    { t: "", s: 12 },
    { t: "", s: 12 },
    { t: "", s: 12 },
    { t: "Received by: " + receipt.by, s: 12 },
    { t: "Signature", s: 12 },
    { t: "", s: 10 }
  );

  wrapText("This receipt is computer prepared and is valid with the signature of the person who received the payment.", 95).forEach(t => lines.push({ t: t, s: 9 }));

  const pdfBytes = buildPdfBinary(lines);
  const cleanFilename = receipt.no.replace(/[\/\\]/g, "-") + ".pdf";
  return new File([pdfBytes], cleanFilename, { type: "application/pdf" });
}

