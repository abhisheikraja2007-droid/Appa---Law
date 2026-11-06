export const CASE_STAGES = [
  "Notice / Summons issued",
  "Service of Notice / Awaited",
  "Written Statement / Counter Affidavit",
  "Rejoinder / Reply",
  "Framing of Issues / Charges",
  "Plaintiff / Petitioner Evidence (PW-1)",
  "Defendant / Respondent Evidence (DW-1)",
  "Cross-Examination",
  "Interlocutory Application (IA) Hearing",
  "Final Arguments",
  "Written Submissions / Notes of Argument",
  "Reserved for Judgment / Order",
  "Pronouncement of Judgment",
  "Execution / Compliance"
];

export function generateDailyCauseListHtml(hearings = [], dateStr = new Date().toLocaleDateString("en-GB")) {
  let rows = "";
  if (!hearings.length) {
    rows = `<tr><td colspan="7" style="text-align:center;padding:12px;color:#888;">No cases listed for ${dateStr}</td></tr>`;
  } else {
    hearings.forEach((h, i) => {
      rows += `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td><b>${h.court || "Court"}</b><br><small>${h.hall ? "Hall No. " + h.hall : ""}</small></td>
        <td><b>${h.cno || "Pending No."}</b></td>
        <td>${h.parties || "Parties"}<br><small>Client: ${h.client || ""}</small></td>
        <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;background:#e2e8f0;color:#1a202c;font-weight:600;">${h.stage || "Hearing"}</span></td>
        <td>${h.advocate || "Advocate Thangaraju"}</td>
        <td>${h.notes || ""}</td>
      </tr>`;
    });
  }

  return `
    <div style="font-family:'Times New Roman',serif;padding:16px;">
      <h2 style="text-align:center;margin:0 0 4px;font-size:18px;">CHAMBER OF ADVOCATE THANGARAJU</h2>
      <h3 style="text-align:center;margin:0 0 12px;font-size:15px;text-decoration:underline;">DAILY CAUSE LIST – ${dateStr}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;" border="1">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="width:30px;">Item</th>
            <th>Court & Hall</th>
            <th>Case No.</th>
            <th>Parties & Client</th>
            <th>Stage / Purpose</th>
            <th>Counsel</th>
            <th>Instructions / Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function formatClientHearingReminder(hearing) {
  const client = hearing.client || "Valued Client";
  const cno = hearing.cno || "Your Case";
  const court = hearing.court || "the Court";
  const date = hearing.date || "the next date";
  const stage = hearing.stage || "hearing";

  return `Dear ${client}, please note that your case (${cno}) is scheduled before ${court} on ${date} for ${stage}. Please be present or reach out to Advocate Thangaraju's chamber (Diligent in Law) for any advance preparation.`;
}

