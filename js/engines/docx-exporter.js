function crc32(buffer) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

class SimpleZip {
  constructor() {
    this.files = [];
  }

  addFile(path, content) {
    const enc = new TextEncoder();
    const data = typeof content === "string" ? enc.encode(content) : content;
    this.files.push({ path, data });
  }

  generate() {
    const enc = new TextEncoder();
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const f of this.files) {
      const pathBytes = enc.encode(f.path);
      const crc = crc32(f.data);
      const size = f.data.length;

      const lh = new Uint8Array(30 + pathBytes.length + size);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, size, true);
      dv.setUint32(22, size, true);
      dv.setUint16(26, pathBytes.length, true);
      dv.setUint16(28, 0, true);
      lh.set(pathBytes, 30);
      lh.set(f.data, 30 + pathBytes.length);

      localHeaders.push(lh);

      const ch = new Uint8Array(46 + pathBytes.length);
      const cdv = new DataView(ch.buffer);
      cdv.setUint32(0, 0x02014b50, true);
      cdv.setUint16(4, 20, true);
      cdv.setUint16(6, 20, true);
      cdv.setUint16(8, 0, true);
      cdv.setUint16(10, 0, true);
      cdv.setUint16(12, 0, true);
      cdv.setUint16(14, 0, true);
      cdv.setUint32(16, crc, true);
      cdv.setUint32(20, size, true);
      cdv.setUint32(24, size, true);
      cdv.setUint16(28, pathBytes.length, true);
      cdv.setUint16(30, 0, true);
      cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true);
      cdv.setUint16(36, 0, true);
      cdv.setUint32(38, 0, true);
      cdv.setUint32(42, offset, true);
      ch.set(pathBytes, 46);

      centralHeaders.push(ch);
      offset += lh.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    centralHeaders.forEach(ch => { cdSize += ch.length; });

    const eocd = new Uint8Array(22);
    const edv = new DataView(eocd.buffer);
    edv.setUint32(0, 0x06054b50, true);
    edv.setUint16(4, 0, true);
    edv.setUint16(6, 0, true);
    edv.setUint16(8, this.files.length, true);
    edv.setUint16(10, this.files.length, true);
    edv.setUint32(12, cdSize, true);
    edv.setUint32(16, cdOffset, true);
    edv.setUint16(20, 0, true);

    const totalSize = offset + cdSize + 22;
    const finalZip = new Uint8Array(totalSize);
    let cur = 0;
    for (const lh of localHeaders) {
      finalZip.set(lh, cur);
      cur += lh.length;
    }
    for (const ch of centralHeaders) {
      finalZip.set(ch, cur);
      cur += ch.length;
    }
    finalZip.set(eocd, cur);

    return finalZip;
  }
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseHtmlToDocxXml(html) {
  const container = document.createElement("div");
  container.innerHTML = html;

  let bodyXml = "";

  function parseNode(node) {
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (!text) return "";
      return `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
    }
    if (node.nodeType !== 1) return "";

    const tag = node.tagName.toLowerCase();

    if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3") {
      let pPr = "";
      if (node.classList.contains("c") || node.style.textAlign === "center") {
        pPr += '<w:jc w:val="center"/>';
      } else if (node.classList.contains("r") || node.style.textAlign === "right") {
        pPr += '<w:jc w:val="right"/>';
      } else if (node.style.textAlign === "justify") {
        pPr += '<w:jc w:val="both"/>';
      }

      if (tag === "h1") pPr += '<w:pStyle w:val="Heading1"/>';
      if (tag === "h2") pPr += '<w:pStyle w:val="Heading2"/>';
      if (tag === "h3") pPr += '<w:pStyle w:val="Heading3"/>';

      let runs = "";
      for (const child of node.childNodes) {
        if (child.nodeType === 1) {
          const ctag = child.tagName.toLowerCase();
          const isBold = ctag === "b" || ctag === "strong";
          const isItalic = ctag === "i" || ctag === "em";
          const isUnderline = ctag === "u";
          const text = child.textContent;
          runs += `<w:r><w:rPr>${isBold ? "<w:b/>" : ""}${isItalic ? "<w:i/>" : ""}${isUnderline ? '<w:u w:val="single"/>' : ""}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
        } else if (child.nodeType === 3) {
          runs += `<w:r><w:t xml:space="preserve">${escapeXml(child.textContent)}</w:t></w:r>`;
        }
      }
      return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
    }

    if (tag === "table") {
      let tblXml = '<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>';
      for (const row of node.querySelectorAll("tr")) {
        tblXml += "<w:tr>";
        for (const cell of row.querySelectorAll("th, td")) {
          const text = cell.innerText || cell.textContent;
          tblXml += `<w:tc><w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
        }
        tblXml += "</w:tr>";
      }
      tblXml += "</w:tbl>";
      return tblXml;
    }

    if (tag === "hr") {
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
    }

    let inner = "";
    for (const child of node.childNodes) {
      inner += parseNode(child);
    }
    return inner;
  }

  for (const child of container.childNodes) {
    bodyXml += parseNode(child);
  }

  return bodyXml;
}

export function exportHtmlToDocx(htmlContent, filename = "Diligent-in-Law.docx") {
  const zip = new SimpleZip();

  zip.addFile(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  zip.addFile(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.addFile(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  zip.addFile(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:rPr>
      <w:b/>
      <w:u w:val="single"/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
</w:styles>`
  );

  const docBody = parseHtmlToDocxXml(htmlContent);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docBody}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="20160"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="2154" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.addFile("word/document.xml", documentXml);

  const zipBytes = zip.generate();
  const blob = new Blob([zipBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

