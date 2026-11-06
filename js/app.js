import { COURTS as DEFAULT_COURTS, FT as DEFAULT_FT, LANGS, FONTS as DEFAULT_FONTS, PH as DEFAULT_PH, LM } from './data/templates-pleadings.js';
import { AG, COM, APT } from './data/templates-deeds.js';
import { STATES, RULES, UNI as DEFAULT_UNI } from './data/state-rules.js';
import { D, M } from './data/legal-maxims.js';
import { numberToWords } from './engines/number-to-words.js';
import { generateReceiptPdf } from './engines/pdf-generator.js';
import { suggestCourt } from './engines/court-suggester.js';
import { validateDraft } from './engines/validator.js';
import { exportHtmlToDocx } from './engines/docx-exporter.js';
import { putItem, getItem, getAllItems, deleteItem, exportEncryptedBackup, importEncryptedBackup, migrateFromLocalStorage } from './storage.js';
import { syncWithLanServer } from './sync.js';
import { searchCriminalCodes, formatDualCitation } from './data/criminal-codes-2024.js';
import { calculateNI138Timeline, calculateTnCourtFees, LIMITATION_PERIODS } from './engines/statutory-calculators.js';
import { renderUpiQrSvg } from './engines/upi-qr.js';
import { CASE_STAGES, generateDailyCauseListHtml, formatClientHearingReminder } from './engines/case-diary.js';
import { generateEfilingIndex } from './engines/efiling-index.js';
import { startDictation, stopDictation, isSpeechSupported, expandSnippets } from './engines/voice-dictation.js';

export const $ = i => document.getElementById(i);

export const COURTS = [...DEFAULT_COURTS];
export const FT = [...DEFAULT_FT];
export const FONTS = [...DEFAULT_FONTS];
export const PH = [...DEFAULT_PH];
export const UNI = [...DEFAULT_UNI];

export const S = {
  docs: [{ t: "", n: "" }],
  laws: [{ c: "", ct: "", h: "", p: "" }],
  secs: [{ a: "", s: "", r: "" }],
  advs: [{ n: "Thangaraju", e: "" }]
};

const IDS = [
  "orient", "palign", "cols", "hshow", "hfirst", "hl", "hc", "hr",
  "fshow", "fl", "fc", "fr", "hfs", "rmy", "aadv", "aadj", "adep",
  "apay", "aprop", "asr", "sidle", "atype", "ap1", "ap2", "asub",
  "aamt", "aterm", "adate", "court", "ocourt", "lim1", "lim2", "ftype",
  "state", "place", "cno", "p1", "p2", "client", "val", "fee", "jur",
  "facts", "grounds", "prayer", "lang", "font", "fsize", "lh", "paper",
  "mt", "mb", "ml", "mr", "rupi"
];

export function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mk(tag, props) {
  const e = document.createElement(tag);
  for (const k in props) e[k] = props[k];
  return e;
}

export function lines(id) {
  return $(id).value.split("\n").filter(s => s.trim());
}

export function save() {
  try {
    const o = { S };
    IDS.forEach(i => { if ($(i)) o[i] = $(i).value; });
    o.caveat = $("caveat")?.checked;
    o.docket = $("docket")?.checked;
    o.sign = $("sign")?.checked;
    o.showlaws = $("showlaws")?.checked;
    o.showsecs = $("showsecs")?.checked;
    o.rqr = $("rqr")?.checked;
    localStorage.setItem("dil1", JSON.stringify(o));
  } catch (e) {}
}

export function load() {
  try {
    const o = JSON.parse(localStorage.getItem("dil1") || "null");
    if (!o) return;
    if (o.S) {
      S.docs = o.S.docs || S.docs;
      S.laws = o.S.laws || S.laws;
      S.advs = o.S.advs || S.advs;
      S.secs = o.S.secs || S.secs;
    }
    IDS.forEach(i => {
      if (o[i] !== undefined && $(i)) $(i).value = o[i];
    });
    if ($("caveat")) $("caveat").checked = o.caveat;
    if ($("docket")) $("docket").checked = o.docket;
    if ($("sign")) $("sign").checked = !!o.sign;
    if ($("showlaws")) $("showlaws").checked = o.showlaws !== false;
    if ($("showsecs")) $("showsecs").checked = o.showsecs !== false;
    if ($("rqr")) $("rqr").checked = o.rqr !== false;
  } catch (e) {}
}

export function renderDocs() {
  const d = $("docs");
  if (!d) return;
  d.innerHTML = "";
  S.docs.forEach((x, i) => {
    const r = mk("div", { className: "item" });
    const t = mk("input", {
      value: x.t,
      placeholder: "Document description",
      oninput: function () { x.t = this.value; save(); }
    });
    const u = mk("button", {
      textContent: "↑",
      title: "Move up",
      onclick: () => {
        if (i > 0) {
          S.docs.splice(i - 1, 0, S.docs.splice(i, 1)[0]);
          renderDocs();
          save();
        }
      }
    });
    const w = mk("button", {
      textContent: "↓",
      title: "Move down",
      onclick: () => {
        if (i < S.docs.length - 1) {
          S.docs.splice(i + 1, 0, S.docs.splice(i, 1)[0]);
          renderDocs();
          save();
        }
      }
    });
    const z = mk("button", {
      textContent: "×",
      title: "Remove",
      onclick: () => {
        S.docs.splice(i, 1);
        renderDocs();
        save();
      }
    });
    r.append(mk("span", { textContent: (i + 1) + "." }), t, u, w, z);
    d.append(r);
  });
}

export function renderLaws() {
  const l = $("laws");
  if (!l) return;
  l.innerHTML = "";
  S.laws.forEach((x, i) => {
    const r = mk("div", { className: "item", style: "flex-wrap:wrap" });
    [["c", "Case name and citation"], ["ct", "Court, date"], ["h", "Holding relied on"], ["p", "Para"]].forEach(f => {
      r.append(mk("input", {
        value: x[f[0]] || "",
        placeholder: f[1],
        style: "flex:1 1 45%",
        oninput: function () { x[f[0]] = this.value; save(); }
      }));
    });
    r.append(mk("button", {
      textContent: "×",
      title: "Remove",
      onclick: () => {
        S.laws.splice(i, 1);
        renderLaws();
        save();
      }
    }));
    l.append(r);
  });
}

export function renderSecs() {
  const l = $("secs");
  if (!l) return;
  l.innerHTML = "";
  S.secs.forEach((x, i) => {
    const r = mk("div", { className: "item", style: "flex-wrap:wrap" });
    [["a", "Act"], ["s", "Section"], ["r", "Relevance"]].forEach(f => {
      r.append(mk("input", {
        value: x[f[0]] || "",
        placeholder: f[1],
        style: "flex:1 1 30%",
        oninput: function () { x[f[0]] = this.value; save(); }
      }));
    });
    r.append(mk("button", {
      textContent: "×",
      title: "Remove",
      onclick: () => {
        S.secs.splice(i, 1);
        renderSecs();
        save();
      }
    }));
    l.append(r);
  });
}

export function renderAdvs() {
  const a = $("advs");
  if (!a) return;
  a.innerHTML = "";
  S.advs.forEach((x, i) => {
    const r = mk("div", { className: "item" });
    r.append(
      mk("input", {
        value: x.n,
        placeholder: "Advocate name",
        oninput: function () { x.n = this.value; save(); }
      }),
      mk("input", {
        value: x.e,
        placeholder: "Enrolment no.",
        oninput: function () { x.e = this.value; save(); }
      })
    );
    if (i > 0) {
      r.append(mk("button", {
        textContent: "×",
        title: "Remove",
        onclick: () => {
          S.advs.splice(i, 1);
          renderAdvs();
          save();
        }
      }));
    }
    a.append(r);
  });
}

export function render() {
  renderDocs();
  renderLaws();
  renderSecs();
  renderAdvs();
}

export function advBlock() {
  return S.advs
    .filter(a => a.n.trim())
    .map(a => "Advocate " + esc(a.n) + (a.e ? " (Enrolment No. " + esc(a.e) + ")" : ""))
    .join("<br>");
}

export function dock() {
  return $("docket")?.checked
    ? "<hr><p><b>Docket:</b> Prepared and settled by " + advBlock() + " – Diligent in Law Advocate Thangarajus. Legal consultation only with Advocate Thangaraju.</p>"
    : "";
}

export function hd() {
  const o = $("ocourt")?.value.trim() || "";
  const c = o || $("court")?.value || "";
  const loc = [ $("place")?.value, $("state")?.value ].filter(Boolean).join(", ").toUpperCase();
  if (!o && /^High Court/.test(c)) return "IN THE HIGH COURT" + (loc ? " AT " + esc(loc) : "");
  if (!o && /^Supreme/.test(c)) return "IN THE SUPREME COURT OF INDIA";
  return "IN THE COURT OF THE " + esc(c.toUpperCase()) + (loc ? " AT " + esc(loc) : "");
}

export function pdim() {
  const a = ($("paper")?.value || "210x297").split("x");
  return $("orient")?.value === "l" ? [a[1], a[0]] : a;
}

export function style() {
  const w = pdim();
  const sh = $("sheet");
  if (!sh) return;
  const s = sh.style;
  const curLang = $("lang")?.value || "English";
  const lg = LANGS.find(l => l[0] === curLang);
  s.width = w[0] + "mm";
  s.minHeight = w[1] + "mm";
  s.padding = [ $("mt")?.value || 25, $("mr")?.value || 25, $("mb")?.value || 25, $("ml")?.value || 38 ]
    .map(v => v + "mm")
    .join(" ");
  s.fontFamily = "'" + ($("font")?.value || "Times New Roman") + "'," + (lg ? "'" + lg[1] + "','" + lg[2] + "'," : "") + "serif";
  s.fontSize = ($("fsize")?.value || 14) + "pt";
  s.lineHeight = $("lh")?.value || 1.8;
  s.textAlign = $("palign")?.value || "left";
  const nc = parseInt($("cols")?.value) || 1;
  s.columnCount = nc > 1 ? nc : "auto";
  s.columnGap = "10mm";
  s.direction = curLang === "Urdu" ? "rtl" : "ltr";

  const st = $("pg") || mk("style", { id: "pg" });
  document.head.append(st);
  st.textContent = "@page{size:" + w[0] + "mm " + w[1] + "mm;margin:" + [ $("mt")?.value || 25, $("mr")?.value || 25, $("mb")?.value || 25, $("ml")?.value || 38 ].map(v => v + "mm").join(" ") + "}" + hfCss();
  pvr();
  wsync();
}

export function gen() {
  let h = "<p class='c'><b>" + hd() + "</b></p>";
  h += "<p class='r'><b>" + (esc($("cno")?.value) || "Case No. ____________ of 20____") + "</b></p>";
  h += "<table><tr><td>" + esc($("p1")?.value).replace(/\n/g, "<br>") + "</td><td class='c'>Versus</td><td>" + esc($("p2")?.value).replace(/\n/g, "<br>") + "</td></tr></table>";
  h += "<h3>" + esc($("ftype")?.value.toUpperCase()) + (($("client")?.value) ? " ON BEHALF OF THE " + esc($("client")?.value.toUpperCase()) : "") + "</h3>";
  
  if ($("val")?.value || $("fee")?.value || $("jur")?.value) {
    h += "<p><b>Jurisdiction, valuation and court fee:</b> " + (esc($("jur")?.value) || "") +
         (($("val")?.value) ? " Value for jurisdiction: Rs. " + esc($("val")?.value) + "." : "") +
         (($("fee")?.value) ? " Court fee / stamp duty paid: Rs. " + esc($("fee")?.value) + "." : "") + "</p>";
  }
  
  h += "<p><b>FACTS OF THE CASE</b></p>";
  lines("facts").forEach((f, i) => { h += "<p>" + (i + 1) + ". " + esc(f) + "</p>"; });
  
  const docs = S.docs.filter(x => x.t && x.t.trim());
  if (docs.length) {
    h += "<p><b>DOCUMENTS RELIED ON</b></p><table><tr><th>Annexure</th><th>Description</th></tr>";
    docs.forEach((x, i) => { h += "<tr><td>R-" + (i + 1) + "</td><td>" + esc(x.t) + "</td></tr>"; });
    h += "</table>";
  }
  
  const g = lines("grounds");
  if (g.length) {
    h += "<p><b>GROUNDS</b></p>";
    g.forEach((x, i) => { h += "<p>" + String.fromCharCode(65 + i % 26) + ". " + esc(x) + "</p>"; });
  }
  
  const laws = S.laws.filter(x => x.c && x.c.trim());
  if (laws.length && $("showlaws")?.checked) {
    h += "<p><b>CASE LAWS RELIED ON</b></p><table><tr><th>No.</th><th>Case</th><th>Court and date</th><th>Holding relied on</th><th>Para</th></tr>";
    laws.forEach((x, i) => {
      h += "<tr><td>" + (i + 1) + "</td><td>" + esc(x.c) + "</td><td>" + esc(x.ct) + "</td><td>" + esc(x.h) + "</td><td>" + esc(x.p) + "</td></tr>";
    });
    h += "</table>";
  }
  
  const secs = S.secs.filter(x => x.a || x.s);
  if (secs.length && $("showsecs")?.checked) {
    h += "<p><b>SECTIONS AND ACTS RELIED ON</b></p><table><tr><th>No.</th><th>Act</th><th>Section</th><th>Relevance</th></tr>";
    secs.forEach((x, i) => {
      h += "<tr><td>" + (i + 1) + "</td><td>" + esc(x.a) + "</td><td>" + esc(x.s) + "</td><td>" + esc(x.r) + "</td></tr>";
    });
    h += "</table>";
  }
  
  if ($("caveat")?.checked) {
    h += "<p><b>RESERVATION OF CAVEAT:</b> The " + (esc($("client")?.value) || "party") +
         " reserves the right to file caveat petition(s) under Section 148-A of the Code of Civil Procedure, 1908 and the corresponding rules of the High Court and the Supreme Court, so that no order is passed in any appeal or proceeding against the order in this matter without notice to and hearing the " +
         (esc($("client")?.value) || "party") + ".</p>";
  }
  
  const pr = lines("prayer");
  if (pr.length) {
    h += "<p><b>PRAYER</b></p><p>It is therefore prayed that this Hon’ble Court may be pleased to:</p>";
    pr.forEach((x, i) => { h += "<p>(" + String.fromCharCode(97 + i % 26) + ") " + esc(x) + "</p>"; });
  }
  
  if ($("sign")?.checked) {
    h += "<p>Place: " + esc($("place")?.value) + "<br>Date: " + new Date().toLocaleDateString("en-GB") + "</p><p class='r'>" + advBlock() + "</p>";
  }
  h += dock();
  
  if ($("sheet")) $("sheet").innerHTML = h;
  style();
}

function addTo(id, t) {
  const e = $(id);
  if (!e) return;
  e.value = (e.value.trim() ? e.value.trim() + "\n" : "") + t;
  save();
}

function tidy(id) {
  const el = $(id);
  if (!el) return;
  el.value = el.value.split("\n").map(x => {
    x = x.replace(/\s+/g, " ").trim();
    if (!x) return "";
    x = x.replace(/\s+([,.;:])/g, "$1").replace(/([,;])(?=[A-Za-z])/g, "$1 ").replace(/\bcan not\b/gi, "cannot");
    x = x.charAt(0).toUpperCase() + x.slice(1);
    if (!/[.;:?!]$/.test(x)) x += ".";
    return x;
  }).filter(Boolean).join("\n");
  save();
}

const PC = [
  ["Not applicable", []],
  ["Apartment / Flat", [
    "Property class: apartment or flat in a building with common areas.",
    "The Second Party shall pay the monthly maintenance charges, sinking fund, water and electricity charges of Rs. ______ to the apartment owners’ association or the First Party, as agreed.",
    "The Second Party shall obey the by-laws and parking rules of the association and shall not obstruct common areas, lifts or staircases.",
    "Car parking slot no. ______ is included. No alteration shall be made to the structure, balcony or elevation."
  ]],
  ["Individual House", [
    "Property class: independent house with its own compound.",
    "The Second Party shall keep the compound, garden, water tank and borewell in good order and shall pay all electricity, water and other charges for the period of occupation.",
    "Structural repairs and repairs to the roof and walls shall be done by the First Party, and minor day-to-day repairs by the Second Party.",
    "No construction or alteration shall be made without the First Party’s written consent."
  ]],
  ["Commercial Premises", [
    "Property class: commercial premises.",
    "The premises shall be used only for the business of ______. The Second Party shall hold all licences needed and shall pay GST on the rent where it applies.",
    "The Second Party shall follow fire-safety and local authority rules."
  ]],
  ["Vacant Land / Plot", [
    "Property class: vacant land or plot.",
    "The boundaries and extent are as in the schedule. No construction shall be made without the First Party’s consent and the approvals the law requires."
  ]],
  ["Agricultural Land", [
    "Property class: agricultural land.",
    "The transfer, lease or use of agricultural land is restricted by the land laws of the State, including ceiling and tenancy laws. The parties have checked that this transaction is permitted.",
    "The parties do not intend to create any tenancy right, subject to State law, and the land shall be returned on expiry."
  ]]
];

function pcl() {
  const c = PC.find(x => x[0] === $("aprop")?.value);
  return c ? c[1] : [];
}

const STL = {
  "Karnataka": "Karnataka Stamp Act, 1957",
  "Maharashtra": "Maharashtra Stamp Act, 1958",
  "Rajasthan": "Rajasthan Stamp Act, 1998",
  "Gujarat": "Bombay Stamp Act, 1958, as applied in Gujarat"
};

function rg(n) {
  const R = [
    [/Rental|Leave and Licence/, "A lease of immovable property for one year or less need not be registered. A lease for more than one year, or from year to year, must be registered (Section 107, Transfer of Property Act, 1882; Section 17(1)(d), Registration Act, 1908). Leave and licence is not a lease, so check the State law on its stamp duty and registration. A month-to-month tenancy ends by 15 days’ notice (Section 106, Transfer of Property Act) unless the State rent law differs."],
    [/Lease Deed/, "A lease for more than one year must be registered (Section 107, Transfer of Property Act; Section 17(1)(d), Registration Act)."],
    [/Sale Deed/, "Registration is compulsory (Section 54, Transfer of Property Act, for value of Rs. 100 or more; Section 17(1)(b), Registration Act)."],
    [/Agreement to Sell/, "Not compulsorily registrable by itself, but if possession is given in part performance (Section 53A, Transfer of Property Act) it must be registered (Section 17(1A), Registration Act). Some States charge stamp duty as on a conveyance."],
    [/Gift Deed/, "Registration is compulsory for immovable property (Section 123, Transfer of Property Act; Section 17(1)(a), Registration Act). The donee must accept in the donor’s lifetime."],
    [/Settlement|Partition|Release/, "Registration is compulsory when the document creates, declares, assigns or ends a right in immovable property of Rs. 100 or more (Section 17(1)(b) and (c), Registration Act). Take advice on oral partitions and recorded family arrangements."],
    [/Mortgage/, "A mortgage for Rs. 100 or more must be by registered deed (Section 59, Transfer of Property Act), except a mortgage by deposit of title deeds (Section 58(f))."],
    [/Power of Attorney/, "Registration is not compulsory under the Registration Act, but authentication under Section 33 is needed to present documents, and the State may require registration for a power to sell immovable property. Check the State rule."],
    [/Partnership/, "The deed need not be registered, but an unregistered firm cannot sue to enforce contract rights (Section 69, Indian Partnership Act, 1932). Register the firm with the Registrar of Firms (Section 58)."],
    [/Construction and Development/, "It must be registered where it transfers an interest in immovable property (Section 17(1)(b), Registration Act). A real estate project may need registration under Section 3, Real Estate (Regulation and Development) Act, 2016."],
    [/Compromise/, "A compromise outside court that creates or ends rights in immovable property needs registration (Section 17(1)(b)). A court decree on compromise under Order XXIII Rule 3 CPC is exempt (Section 17(2)(vi))."]
  ];
  const m = R.find(x => x[0].test(n));
  return m ? m[1] : "Registration is not compulsory under Section 17, Registration Act, 1908. Stamp duty is still payable, and an unstamped document is not admissible in evidence (Section 35, Indian Stamp Act, 1899).";
}

function dg(v) {
  return String(v || "").replace(/\D/g, "");
}

function mAad() {
  const d = dg($("aad")?.value);
  if (!d) return "______";
  return $("amask")?.checked ? "XXXX XXXX " + d.slice(-4) : d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function mAcc() {
  const d = dg($("ban")?.value);
  if (!d) return "______";
  return $("amask")?.checked ? "XXXXXXXX" + d.slice(-4) : d;
}

function BP() {
  return $("aben")?.value || "Second Party";
}

function bnm() {
  return BP() === "First Party" ? "ap1" : "ap2";
}

function ids() {
  return "Aadhaar No. " + mAad() + "; PAN " + ($("pan")?.value.trim().toUpperCase() || "______") + "; bank account in the name of " + ($("bk")?.value.trim() || "______") + ", account no. " + mAcc() + ", IFSC " + ($("ifsc")?.value.trim().toUpperCase() || "______");
}

function asn() {
  return $("aasn")?.value.trim() || "the apartment owners’ association or society (where the property is in an apartment)";
}

function stl() {
  const st = $("state")?.value || "the State";
  return "the laws of " + st + " and the sections applicable, including the rent law, the stamp law and " + (APT[st] || "the apartment ownership or housing society law of the State") + ", as amended from time to time";
}

function BEN() {
  const b = BP();
  const M = $("aperm")?.checked ? [
    "MAIN CLAUSE: The property is given to the " + b + " by mere permission, only to use for the beneficial purpose stated in this agreement, in return for the rent or fee given. It creates no ownership, title or interest in the property beyond the rights expressly given here. The First Party remains the sole owner, and the " + b + " holds the property only with the owner’s permission and for the owner.",
    "The " + b + " shall not claim ownership of the property, and shall not claim any right by adverse possession however long the possession continues. The " + b + " shall not set up any title against the owner, shall not allow anyone else to do so, and shall not sub-let or part with possession.",
    "A signed inventory and dated photographs of the condition of the property at handover are annexed. The parties shall check the property against them on return."
  ] : [];
  return M.concat([
    "The " + b + " (the beneficiary of the property) has given the following identity and payment details, with copies attached: " + ids() + ".",
    "The " + b + " has given, and annexes to this agreement, an affidavit undertaking to obey the rules, by-laws and decisions of " + asn() + " and " + stl() + ".",
    "For the whole time that the " + b + " holds, occupies or uses the property, the " + b + " shall use it only for the agreed purpose and shall do no illegal act in or in relation to the property.",
    "The " + b + " shall not damage the property. In particular the " + b + " shall not nail, drill or fix anything into the walls, ceilings, floors or fittings, and shall make no structural change, without the other party’s written consent.",
    "If the property is damaged, the " + b + " shall pay compensation for the damage and the full cost of repair and renovation needed to restore it to its condition at the start. That sum may be deducted from any deposit, and the balance is recoverable from the " + b + ".",
    "On leaving, or when this agreement ends, the " + b + " shall hand back the property to the owner in the same condition in which it was given, without any damage and with all fittings and keys, fair wear and tear excepted.",
    "Every party, and every member named below, shall sign this agreement."
  ]);
}

function sg() {
  const r = l => "<td>" + l + "<br><br><br>Signature</td>";
  const c = [r("First Party"), r("Second Party")];
  $("amem")?.value.split("\n").filter(x => x.trim()).forEach(m => {
    c.push(r("Member: " + esc(m.trim())));
  });
  c.push("<td>Witness 1: Name, address, signature<br><br><br></td>", "<td>Witness 2: Name, address, signature<br><br><br></td>");
  let h = "<table>";
  for (let i = 0; i < c.length; i += 2) {
    h += "<tr>" + c[i] + (c[i + 1] || "<td></td>") + "</tr>";
  }
  return h + "</table>";
}

function advT() {
  const n = parseInt($("aadv")?.value) || 0;
  const r = parseFloat(String($("aamt")?.value).replace(/[^0-9.]/g, "")) || 0;
  return { n, r, t: n * r };
}

function inr(x) {
  return "Rs. " + x.toLocaleString("en-IN");
}

function ADV() {
  const a = advT();
  const o = [];
  const pay = $("apay")?.value || "bank transfer";
  const d = parseFloat(String($("adep")?.value).replace(/[^0-9.]/g, "")) || 0;
  if (a.n > 0) {
    const tot = a.r ? inr(a.t) + " (" + a.n + " × " + inr(a.r) + ")" : "Rs. __________ (" + a.n + " × the monthly rent)";
    const adj = $("aadj")?.value;
    const w = a.n + (a.n === 1 ? " month" : " months");
    o.push("The Second Party has paid, and the First Party acknowledges receipt of, advance rent for " + w + ", being " + tot + ", by " + pay + ".");
    o.push(adj === "first"
      ? "This advance shall be adjusted against the rent for the first " + a.n + (a.n === 1 ? " month" : " months") + " of the term, and the Second Party shall pay rent from the following month."
      : adj === "last"
      ? "This advance shall be held by the First Party and adjusted against the rent for the last " + a.n + (a.n === 1 ? " month" : " months") + " of the term. The Second Party shall pay rent every month until then."
      : "This advance is refundable. It shall be held without interest, shall not be adjusted against rent unless both parties agree in writing, and shall be returned when the Second Party vacates, after deducting lawful dues.");
  }
  if (d > 0) {
    o.push("The Second Party has also paid Rs. " + d.toLocaleString("en-IN") + " as refundable security deposit, by " + pay + ", to be returned without interest on vacating after deducting lawful dues.");
  }
  return o;
}

function advn() {
  const a = advT();
  const d = parseFloat(String($("adep")?.value).replace(/[^0-9.]/g, "")) || 0;
  const w = ($("apay")?.value === "cash" && (a.t + d) >= 200000) ? " This payment is shown as cash and may reach that limit." : "";
  return "<b>Advance and deposit:</b> check any State limit on advance rent or deposit. The Model Tenancy Act, 2021 caps the security deposit, so check its limits and whether the State has adopted it. Pay by bank transfer, cheque or UPI where possible, because the income-tax law restricts cash receipts of Rs. 2 lakh or more." + w + " Issue a signed receipt for every payment.<br>";
}

function nt(n) {
  const st = $("state")?.value || "the State";
  return "<p><i>Note to advocate (delete before printing).<br><b>Property class:</b> " + esc($("aprop")?.value) + ".<br><b>Registration:</b> " + esc(rg(n)) + "<br><b>Place of registration:</b> for a document affecting immovable property, the office of the Sub-Registrar in whose sub-district the property, or part of it, is situated (Section 28, Registration Act, 1908), wherever the owner or parties live. Property and office noted: " + esc($("asr")?.value || "not entered") + ". Present the document within four months of execution (Section 23); late presentation attracts a fine (Section 25). The parties and two witnesses appear with identity proof. Registration fee is under the State schedule (Section 78). An unregistered document that needs registration is not admissible to prove title (Section 49).<br><b>Stamp duty:</b> " + esc(STL[st] || "Indian Stamp Act, 1899, as amended for " + st) + ". An insufficiently stamped document is not admissible in evidence (Section 35, Indian Stamp Act, 1899). Check the current State schedule and any concession.<br>" + advn() + "<b>Adverse possession:</b> a tenant or licensee holds with the owner’s permission, so adverse possession generally cannot arise (Article 65, Limitation Act, 1963 allows 12 years for a possession claim based on title), but record the permission in writing. Annex a signed inventory with dated photographs at handover and compare them on return.<br><b>Aadhaar:</b> take the beneficiary’s consent, keep a masked copy and use it only for this agreement. A private party cannot compel Aadhaar authentication (the Supreme Court restricted this in 2018), so accept PAN, passport or voter ID as alternatives if the person prefers. Keep the PAN and bank details only as needed.<br>Verify every rule against the current Act and State notification. Check that each signatory has authority.</i></p>";
}

export function ag() {
  const n = $("atype")?.value || "Rental Agreement";
  const e = AG.find(x => x[0] === n) || [n, "", "", ["The parties agree to the following terms regarding {sub}."]];
  const lang = $("lang")?.value || "English";
  const t = (lang === "Tamil" && e[1]) || (lang === "Hindi" && e[2]) || "";
  const V = {
    sub: $("asub")?.value.trim() || "__________",
    amt: $("aamt")?.value.trim() ? "Rs. " + $("aamt")?.value.trim() : "Rs. __________",
    term: $("aterm")?.value.trim() || "__________",
    pl: $("place")?.value.trim() || "__________"
  };
  const f = x => x.replace(/\{(sub|amt|term|pl)\}/g, (_, k) => V[k]);
  const P = id => esc($(id)?.value.trim()).replace(/\n/g, "<br>") || "__________";
  
  let h = "<h3>" + (t ? esc(t) + " (" + esc(n.toUpperCase()) + ")" : esc(n.toUpperCase())) + "</h3>";
  h += "<p>This " + esc(n) + " is made at " + esc(V.pl) + " on " + esc($("adate")?.value.trim() || new Date().toLocaleDateString("en-GB")) + " between:</p><p>(1) " + P("ap1") + " (the “First Party”)</p><p class='c'>and</p><p>(2) " + P("ap2") + " (the “Second Party”).</p><p>The expressions First Party and Second Party include their heirs, legal representatives, successors and assigns.</p><p><b>NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:</b></p>";
  
  e[3].concat(ADV(), pcl(), BEN(), COM).forEach((x, i) => {
    h += "<p>" + (i + 1) + ". " + esc(f(x)) + "</p>";
  });
  h += "<p>IN WITNESS WHEREOF the parties have signed this agreement on the date first written above.</p>" + sg();
  h += nt(n);
  
  if ($("sheet")) $("sheet").innerHTML = h;
  style();
}

export function af() {
  const b = BP();
  const nm = esc($(bnm())?.value.trim()).replace(/\n/g, "<br>") || "__________";
  const pl = esc($("place")?.value.trim() || "__________");
  const dt = esc($("adate")?.value.trim() || new Date().toLocaleDateString("en-GB"));
  const L = ($("aperm")?.checked ? ["The property is given to me by mere permission, only to use for the beneficial purpose stated, in return for the rent or fee given. I shall not claim ownership of the property, or any right by adverse possession, however long my possession continues. The owner remains its sole owner."] : []).concat([
    "I am the " + b + " (the beneficiary of the property) under the " + $("atype")?.value + " for the property described as: " + ($("asub")?.value.trim() || "__________") + ".",
    "My identity and payment details are: " + ids() + ". Copies of my identity documents are attached.",
    "I shall obey the rules, by-laws and decisions of " + asn() + ", and " + stl() + ".",
    "For the whole time that I hold, occupy or use the property, I shall use it only for the agreed purpose and shall do no illegal act in or in relation to the property.",
    "I shall not damage the property. I shall not nail, drill or fix anything into the walls, ceilings, floors or fittings, and I shall make no structural change, without the owner’s written consent.",
    "If I damage the property, I shall pay compensation for the damage and the full cost of repair and renovation needed to restore it to its condition at the start. The owner may deduct this from my deposit, and I shall pay any balance.",
    "On leaving I shall hand back the property in the same condition in which it was given, without any damage, fair wear and tear excepted.",
    "What is stated above is true to my knowledge. Nothing material has been concealed."
  ]);
  const h = "<h3>AFFIDAVIT AND UNDERTAKING OF THE BENEFICIARY</h3><p>I, " + nm + ", do hereby solemnly affirm and state on oath as follows:</p>" +
    L.map((x, i) => "<p>" + (i + 1) + ". " + esc(x) + "</p>").join("") +
    "<p class='r'>DEPONENT<br><br><br>Signature</p><p><b>VERIFICATION</b></p><p>Verified at " + pl + " on " + dt + " that the contents of this affidavit are true and correct to my knowledge, that no part of it is false, and that nothing material has been concealed.</p><p class='r'>DEPONENT<br><br><br>Signature</p><p><i>Note to advocate (delete before printing): execute on non-judicial stamp paper of the value the State requires, and have it sworn before a Notary Public or Oath Commissioner. Attach copies of the identity documents. Have every party and member sign the agreement as well.</i></p>";
  if ($("sheet")) $("sheet").innerHTML = h;
  style();
}

let RC = 0;
let RL = [];
let RT = "";
try {
  const Q = JSON.parse(localStorage.getItem("dil5") || "null");
  if (Q) {
    RC = Q.c || 0;
    RL = Q.l || [];
  }
} catch (e) {}

function rsv() {
  try {
    localStorage.setItem("dil5", JSON.stringify({ c: RC, l: RL.slice(0, 100) }));
  } catch (e) {}
}

export function rlg() {
  const h = $("rlog");
  if (!h) return;
  h.innerHTML = RL.length ? "<b>Receipts issued (this browser)</b>" : "No receipts issued yet.";
  RL.slice(0, 10).forEach((x, i) => {
    const r = mk("div", { className: "item" });
    r.append(
      mk("span", { textContent: x.no + " – " + x.nm + " – Rs. " + x.am + " – " + x.dt, style: "flex:1" }),
      mk("button", {
        textContent: "×",
        title: "Remove from the list",
        onclick: () => {
          RL.splice(i, 1);
          rsv();
          rlg();
        }
      })
    );
    h.append(r);
  });
}

export function rbuild(inc) {
  const am = parseFloat(String($("ra")?.value).replace(/[^0-9.]/g, "")) || 0;
  if (!$("rn")?.value.trim() || !am) {
    if ($("rlog")) $("rlog").innerHTML = "Enter the name and the amount first.";
    return null;
  }
  const now = new Date();
  const dt = now.toLocaleString("en-GB");
  let no;
  if (inc) {
    RC++;
    no = "R-" + String(RC).padStart(4, "0") + "/" + now.getFullYear();
  } else {
    no = RT.no || "R-____";
  }
  const pr = $("rprop")?.value.trim() || $("asub")?.value.trim();
  const by = $("rby")?.value.trim() || "__________";
  const per = $("rper")?.value.trim();
  const ref = $("rref")?.value.trim();
  const upiId = $("rupi")?.value.trim() || "thangaraju@oksbi";
  const tx = "Receipt No. " + no + ". Received with thanks Rs. " + am.toLocaleString("en-IN") + " (Rupees " + numberToWords(am) + " only) from " + $("rn")?.value.trim() + " towards " + $("rp")?.value + (per ? " for " + per : "") + (pr ? " for the property: " + pr : "") + ". Mode: " + $("rmo")?.value + (ref ? ", ref. " + ref : "") + ". Date and time: " + dt + ". Received by: " + by + ". Diligent in Law Advocate Thangarajus.";
  return {
    rp: $("rp")?.value,
    mo: $("rmo")?.value,
    no,
    tx,
    am: am.toLocaleString("en-IN"),
    rawAmount: am,
    upiId,
    nm: $("rn")?.value.trim(),
    dt,
    words: numberToWords(am),
    pr,
    by,
    per,
    ref
  };
}

function rneed() {
  if (RT) return RT;
  const r = rbuild(true);
  if (r) {
    RT = r;
    RL.unshift({ no: r.no, nm: r.nm, am: r.am, dt: r.dt });
    rsv();
    rlg();
  }
  return r;
}

function num() {
  let d = dg($("rm")?.value);
  if (d.length === 10) d = "91" + d;
  return d;
}

export function hfc(t) {
  t = String(t || "");
  if (!t.trim()) return "none";
  const out = t.split(/(\{page\}|\{pages\}|\{date\}|\{case\}|\{client\})/).filter(Boolean).map(p => {
    if (p === "{page}") return "counter(page)";
    if (p === "{pages}") return "counter(pages)";
    const v = p === "{date}" ? new Date().toLocaleString("en-GB") : p === "{case}" ? $("cno")?.value : p === "{client}" ? $("client")?.value : p;
    return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ") + '"';
  }).join(" ");
  return out || "none";
}

export function hfCss() {
  const hs = $("hshow")?.value === "1";
  const fs = $("fshow")?.value === "1";
  const z = (parseFloat($("hfs")?.value) || 8) + "pt serif";
  const bx = (pos, id, on) => "@" + pos + "{content:" + (on ? hfc($(id)?.value) : "none") + ";font:" + z + "}";
  let c = "@page{" + bx("top-left", "hl", hs) + bx("top-center", "hc", hs) + bx("top-right", "hr", hs) + bx("bottom-left", "fl", fs) + bx("bottom-center", "fc", fs) + bx("bottom-right", "fr", fs) + "}";
  if ($("hfirst")?.value === "0") {
    c += "@page :first{@top-left{content:none}@top-center{content:none}@top-right{content:none}}";
  }
  return c;
}

function tk(t) {
  return String(t || "")
    .replace(/\{page\}/g, "1")
    .replace(/\{pages\}/g, "n")
    .replace(/\{date\}/g, new Date().toLocaleString("en-GB"))
    .replace(/\{case\}/g, $("cno")?.value || "")
    .replace(/\{client\}/g, $("client")?.value || "");
}

export function pvr() {
  const w = pdim()[0];
  ["pvh", "pvf"].forEach((id, i) => {
    const e = $(id);
    const p = i ? "f" : "h";
    const on = $(p + "show")?.value === "1";
    if (!e) return;
    e.style.width = w + "mm";
    e.style.padding = "2mm " + ($("mr")?.value || 25) + "mm 2mm " + ($("ml")?.value || 38) + "mm";
    e.innerHTML = on
      ? "<span>" + esc(tk($(p + "l")?.value)) + "</span><span>" + esc(tk($(p + "c")?.value)) + "</span><span>" + esc(tk($(p + "r")?.value)) + "</span>"
      : "<span><i>" + (i ? "Footer" : "Header") + " removed</i></span><span></span><span></span>";
  });
}

const HF = ["hshow", "hfirst", "hl", "hc", "hr", "fshow", "fl", "fc", "fr", "hfs", "fsize", "lh", "mt", "mb", "ml", "mr"];
const HFD = {
  hshow: "1", hfirst: "1", hl: "", hc: "", hr: "",
  fshow: "1", fl: "Diligent in Law – Advocate Thangarajus", fc: "Page {page} of {pages}", fr: "Printed: {date}", hfs: "8"
};
let PVP = false;

export function pvsync() {
  HF.forEach(x => {
    if ($("p_" + x) && $(x)) $("p_" + x).value = $(x).value;
  });
  if ($("p_proof")) $("p_proof").checked = PVP;
}

export function hfreset() {
  for (const k in HFD) {
    if ($(k)) $(k).value = HFD[k];
  }
  save();
  style();
  pvsync();
}

export function pvOpen(p) {
  PVP = !!p || PVP;
  if ($("pvbar") && $("wbar")) $("pvbar").append($("wbar"));
  if ($("pvbar") && $("prbar")) $("pvbar").prepend($("prbar"));
  prlab();
  document.body.classList.remove("proof");
  document.body.classList.add("pv");
  style();
  pvsync();
  window.scrollTo(0, 0);
}

export function pvClose() {
  document.body.classList.remove("pv", "proof");
  const rt = document.querySelector(".rt");
  const scr = $("scr");
  const hdr = document.querySelector("header");
  if (rt && $("wbar") && scr) rt.insertBefore($("wbar"), scr);
  if (hdr && $("prbar")) hdr.after($("prbar"));
  prlab();
  prh();
  save();
}

let LR = null;
const SH = () => $("sheet");
const SCR = () => $("scr");
const WB = () => $("wbar");
let WM = null;
let WT = null;

function inSh() {
  const s = getSelection();
  return s.rangeCount && SH() && SH().contains(s.anchorNode);
}

function wmsg(t) {
  const m = $("wmsg");
  if (m) {
    m.textContent = t;
    clearTimeout(WM);
    WM = setTimeout(() => { m.textContent = ""; }, 3500);
  }
}

function act(fn) {
  if (SH()) SH().focus();
  if (LR) {
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(LR);
  }
  try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
  fn();
  wcount();
}

function ex(c, v) {
  act(() => { document.execCommand(c, false, v == null ? null : v); });
}

function blocks() {
  if (!inSh() || !SH()) return [];
  const r = getSelection().getRangeAt(0);
  const a = Array.from(SH().querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,td,th,div"))
    .filter(b => !b.classList.contains("pb") && r.intersectsNode(b));
  return a.filter(b => !a.some(o => o !== b && b.contains(o)));
}

function bs(fn) {
  act(() => {
    const b = blocks();
    if (!b.length) {
      wmsg("Click inside a paragraph first.");
      return;
    }
    b.forEach(fn);
  });
}

function cell() {
  if (!inSh()) return null;
  let n = getSelection().anchorNode;
  n = n.nodeType === 1 ? n : n.parentNode;
  return n.closest("td,th");
}

function fsz(pt) {
  act(() => {
    if (!getSelection().rangeCount || getSelection().isCollapsed) {
      blocks().forEach(b => { b.style.fontSize = pt + "pt"; });
      return;
    }
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("fontSize", false, "7");
    document.execCommand("styleWithCSS", false, true);
    if (SH()) {
      SH().querySelectorAll("font[size='7']").forEach(f => {
        const sp = document.createElement("span");
        sp.style.fontSize = pt + "pt";
        while (f.firstChild) sp.appendChild(f.firstChild);
        f.replaceWith(sp);
      });
    }
  });
}

function fsd(d) {
  const s = getSelection();
  const n = s.rangeCount && s.anchorNode ? (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode) : SH();
  const pt = Math.round(parseFloat(getComputedStyle(n).fontSize) * 0.75);
  fsz(Math.max(6, Math.min(72, pt + d)));
}

function cs(v) {
  act(() => {
    const t = getSelection().toString();
    if (!t) {
      wmsg("Select text first.");
      return;
    }
    const o = v === "u" ? t.toUpperCase()
      : v === "l" ? t.toLowerCase()
      : v === "t" ? t.toLowerCase().replace(/(^|[\s(\-])(\S)/g, (_, a, b) => a + b.toUpperCase())
      : t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\S)/g, (_, a, b) => a + b.toUpperCase());
    document.execCommand("insertText", false, o);
  });
}

function wpar() {
  act(() => {
    const b = blocks();
    if (!b.length) {
      wmsg("Click inside a paragraph first.");
      return;
    }
    const v = (id, u) => {
      const x = $(id)?.value.trim();
      return x === "" ? null : x + u;
    };
    const m = [
      ["w_pl", "mm", "marginLeft"],
      ["w_pr", "mm", "marginRight"],
      ["w_pf", "mm", "textIndent"],
      ["w_pb", "pt", "marginTop"],
      ["w_pa", "pt", "marginBottom"]
    ];
    b.forEach(p => {
      m.forEach(q => {
        const x = v(q[0], q[1]);
        if (x !== null) p.style[q[2]] = x;
      });
    });
  });
}

function tins() {
  const r = Math.max(1, Math.min(40, +$("w_r")?.value || 3));
  const c = Math.max(1, Math.min(12, +$("w_c")?.value || 3));
  let h = "<table>";
  for (let i = 0; i < r; i++) {
    h += "<tr>";
    for (let j = 0; j < c; j++) h += "<td><br></td>";
    h += "</tr>";
  }
  h += "</table><p><br></p>";
  act(() => { document.execCommand("insertHTML", false, h); });
}

function tt(v) {
  act(() => {
    const c = cell();
    if (!c) {
      wmsg("Click inside a table cell first.");
      return;
    }
    const tr = c.parentNode;
    const tb = c.closest("table");
    const i = c.cellIndex;
    const nr = () => {
      const r = tr.cloneNode(false);
      Array.from(tr.cells).forEach(() => {
        const n = document.createElement("td");
        n.innerHTML = "<br>";
        r.append(n);
      });
      return r;
    };

    if (v === "ra") tr.before(nr());
    else if (v === "rb") tr.after(nr());
    else if (v === "cl" || v === "cr") {
      Array.from(tb.rows).forEach(r => {
        const x = r.cells[i];
        const n = document.createElement("td");
        n.innerHTML = "<br>";
        if (x) {
          if (v === "cl") x.before(n);
          else x.after(n);
        } else r.append(n);
      });
    } else if (v === "dr") {
      tr.remove();
      if (!tb.rows.length) tb.remove();
    } else if (v === "dc") {
      Array.from(tb.rows).forEach(r => { if (r.cells[i]) r.deleteCell(i); });
      if (!tb.rows[0] || !tb.rows[0].cells.length) tb.remove();
    } else if (v === "dt") {
      tb.remove();
    } else if (v === "mg") {
      const nx = c.nextElementSibling;
      if (nx) {
        c.colSpan = (c.colSpan || 1) + (nx.colSpan || 1);
        if (nx.textContent.trim()) c.innerHTML += "<br>" + nx.innerHTML;
        nx.remove();
      }
    } else if (v === "bd") {
      tb.classList.toggle("nb");
    }
  });
}

function wfind(back) {
  const f = $("w_f")?.value;
  if (!f) return;
  act(() => {
    const mc = $("w_mc")?.checked;
    let hit = false;
    for (let i = 0; i < 300; i++) {
      if (!window.find(f, mc, !!back, true, false, false, false)) break;
      if (inSh()) { hit = true; break; }
    }
    if (!hit) wmsg("Not found.");
  });
}

function wrep() {
  const f = $("w_f")?.value;
  const r = $("w_g")?.value;
  if (!f) return;
  act(() => {
    const t = getSelection().toString();
    const mc = $("w_mc")?.checked;
    if (t && (mc ? t === f : t.toLowerCase() === f.toLowerCase())) {
      document.execCommand("insertText", false, r);
    }
  });
  wfind();
}

function wall() {
  const f = $("w_f")?.value;
  const r = $("w_g")?.value;
  if (!f || !SH()) return;
  const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $("w_mc")?.checked ? "g" : "gi");
  let n = 0;
  const w = document.createTreeWalker(SH(), NodeFilter.SHOW_TEXT);
  const a = [];
  let x;
  while ((x = w.nextNode())) a.push(x);
  a.forEach(t => {
    const v = t.nodeValue.replace(re, () => { n++; return r; });
    if (v !== t.nodeValue) t.nodeValue = v;
  });
  wmsg(n + " replaced.");
}

function wdoc() {
  if (!SH()) return;
  const d = pdim();
  const m = [ $("mt")?.value || 25, $("mr")?.value || 25, $("mb")?.value || 25, $("ml")?.value || 38 ];
  const cl = SH().cloneNode(true);
  cl.querySelectorAll(".pb").forEach(p => {
    const b = document.createElement("br");
    b.setAttribute("clear", "all");
    b.style.pageBreakBefore = "always";
    p.replaceWith(b);
  });
  const h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Diligent in Law</title><style>@page Section1{size:' + d[0] + 'mm ' + d[1] + 'mm;margin:' + m[0] + 'mm ' + m[1] + 'mm ' + m[2] + 'mm ' + m[3] + 'mm}div.Section1{page:Section1}body{font-family:"' + $("font")?.value + '";font-size:' + $("fsize")?.value + 'pt;line-height:' + $("lh")?.value + ';text-align:' + $("palign")?.value + '}table{border-collapse:collapse}td,th{border:1px solid #000;padding:4px}</style></head><body><div class="Section1">' + cl.innerHTML + '</div></body></html>';
  const u = URL.createObjectURL(new Blob(["\ufeff" + h], { type: "application/msword" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = "Diligent-in-Law-" + new Date().toISOString().slice(0, 10) + ".doc";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => { URL.revokeObjectURL(u); }, 4000);
  wmsg("Saved to your downloads. Open it in Word.");
}

function wst() {
  if (!inSh() || !WB()) return;
  try {
    WB().querySelectorAll("button[data-c]").forEach(b => {
      b.classList.toggle("on", document.queryCommandState(b.dataset.c));
    });
  } catch (e) {}
}

export function wcount() {
  const sh = SH();
  if (!sh || !$("wcnt")) return;
  const t = (sh.innerText || sh.textContent || "").trim();
  const n = t ? t.split(/\s+/).length : 0;
  const scr = SCR();
  const zz = scr?.style.zoom || "";
  if (scr) scr.style.zoom = "";
  const cs2 = getComputedStyle(sh);
  const ch = Math.max(0, sh.scrollHeight - (parseFloat(cs2.paddingTop) || 0) - (parseFloat(cs2.paddingBottom) || 0));
  const pp = (pdim()[1] - (+$("mt")?.value || 0) - (+$("mb")?.value || 0)) * 96 / 25.4;
  const pg = Math.max(1, Math.ceil(ch / pp - 0.02));
  if (scr) scr.style.zoom = zz;
  $("wcnt").textContent = n + " words · about " + pg + (pg === 1 ? " page" : " pages");
  if ($("prpages")) $("prpages").textContent = "Total pages: about " + pg;
}

export function wsync() {
  if (!$("w_paper")) return;
  $("w_paper").value = $("paper")?.value;
  $("w_orient").value = $("orient")?.value;
  $("w_cols").value = $("cols")?.value;
  wcount();
  prsync();
}

function prh() {
  const pb = $("prbar");
  document.documentElement.style.setProperty("--prh", (document.body.classList.contains("pv") ? 0 : (pb ? pb.offsetHeight : 0)) + "px");
}

function prlab() {
  const b = $("pr_prev");
  if (b) b.textContent = document.body.classList.contains("pv") ? "Close preview" : "Print preview";
}

function prsum() {
  const o = $("paper")?.selectedOptions[0];
  const al = { left: "left-aligned", justify: "justified", center: "centred", right: "right-aligned" }[$("palign")?.value || "left"];
  return (o ? o.textContent : "") + " " + ($("orient")?.value === "l" ? "landscape" : "portrait") + " · margins T" + $("mt")?.value + " B" + $("mb")?.value + " L" + $("ml")?.value + " R" + $("mr")?.value + " mm · " + $("font")?.value + " " + $("fsize")?.value + " pt, line spacing " + $("lh")?.value + " · " + al + " · " + (($("cols")?.value > 1) ? $("cols")?.value + " columns · " : "") + "header " + ($("hshow")?.value === "1" ? "on" : "removed") + ", footer " + ($("fshow")?.value === "1" ? "on" : "removed");
}

export function prsync() {
  if (!$("pr_paper")) return;
  $("pr_paper").value = $("paper")?.value;
  $("pr_orient").value = $("orient")?.value;
  $("pr_hshow").value = $("hshow")?.value;
  $("pr_fshow").value = $("fshow")?.value;
  const c = $("fc")?.value;
  $("pr_pn").value = (c === "Page {page} of {pages}" || c === "Page {page}") ? c : (c === "" ? "none" : "");
  $("pr_proof").checked = PVP;
  if ($("prsum")) $("prsum").textContent = prsum();
  prh();
}

export function doPrint(selOnly) {
  style();
  const ps = $("psel");
  if (!ps) return;
  ps.innerHTML = "";
  document.body.classList.remove("psel");
  if (selOnly) {
    const r = (inSh() && !getSelection().isCollapsed) ? getSelection().getRangeAt(0) : ((LR && !LR.collapsed) ? LR : null);
    if (!r) {
      if ($("prmsg")) $("prmsg").textContent = "Select the text you want to print first.";
      return;
    }
    ps.appendChild(r.cloneContents());
    const sh = SH();
    ["fontFamily", "fontSize", "lineHeight", "textAlign", "columnCount", "columnGap", "direction"].forEach(k => {
      ps.style[k] = sh.style[k];
    });
    document.body.classList.add("psel");
  }
  if (PVP) document.body.classList.add("proof");
  window.print();
}

let LP = null;
let LG = [];
try {
  LP = JSON.parse(localStorage.getItem("dilp") || "null");
  LG = JSON.parse(localStorage.getItem("dill") || "[]");
} catch (e) {}

function hs(t) {
  const e = new TextEncoder().encode(t);
  return (window.crypto && crypto.subtle)
    ? crypto.subtle.digest("SHA-256", e).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""))
    : Promise.resolve(btoa(unescape(encodeURIComponent(t))));
}

export function lgs() {
  const slog = $("slog");
  if (!slog) return;
  slog.innerHTML = LG.length ? "<b>Access log (this browser only)</b><br>" + LG.slice(0, 8).map(x => esc(x.t + " – " + x.k)).join("<br>") : "No access events recorded yet.";
  try {
    localStorage.setItem("dill", JSON.stringify(LG.slice(0, 50)));
  } catch (e) {}
}

function logev(k) {
  LG.unshift({ t: new Date().toLocaleString("en-GB"), k });
  lgs();
}

export function lock() {
  if (!LP) {
    if ($("slog")) $("slog").innerHTML = "Set a passcode first.";
    return;
  }
  if ($("lk")) {
    $("lk").style.display = "flex";
    $("lkp").value = "";
    $("lkp").focus();
  }
}

let IT = null;
function idle() {
  clearTimeout(IT);
  const m = parseFloat($("sidle")?.value) || 0;
  if (m > 0 && LP) IT = setTimeout(lock, m * 60000);
}

const AGN = AG.map(x => x[0]);
try {
  const Y = JSON.parse(localStorage.getItem("dil3") || "null");
  if (Y) AGN.splice(0, AGN.length, ...Y);
} catch (e) {}

const STN = {};
try {
  const X = JSON.parse(localStorage.getItem("dil2") || "{}");
  if (X.c) COURTS.splice(0, COURTS.length, ...X.c);
  if (X.f) FT.splice(0, FT.length, ...X.f);
  if (X.p) PH.splice(0, PH.length, ...X.p);
  if (X.n) FONTS.splice(0, FONTS.length, ...X.n);
  if (X.s) Object.assign(STN, X.s);
  if (X.u) UNI.splice(0, UNI.length, ...X.u);
} catch (e) {}

function sv() {
  try {
    localStorage.setItem("dil2", JSON.stringify({ c: COURTS, f: FT, p: PH, n: FONTS, s: STN, u: UNI }));
  } catch (e) {}
}

function svAgn() {
  try {
    localStorage.setItem("dil3", JSON.stringify(AGN));
  } catch (e) {}
}

export function mg(sid, arr, idx, customSave) {
  const sel = $(sid);
  if (!sel) return;
  const box = mk("div", { className: "note", style: "display:none;margin:6px 0" });
  const b = mk("button", { textContent: "Add or remove options", style: "margin-top:4px" });

  function paint() {
    const cur = sel.value;
    sel.innerHTML = "";
    arr.forEach((a, i) => {
      sel.append(mk("option", { textContent: idx ? a.slice(0, 58) + "…" : a, value: idx ? i : a }));
    });
    if (!idx && arr.indexOf(cur) > -1) sel.value = cur;
    box.innerHTML = "";
    arr.forEach((a, i) => {
      const r = mk("div", { className: "item" });
      r.append(
        mk("span", { textContent: a, style: "flex:1" }),
        mk("button", {
          textContent: "×",
          title: "Remove",
          onclick: () => {
            arr.splice(i, 1);
            paint();
            (customSave || sv)();
          }
        })
      );
      box.append(r);
    });
    const r = mk("div", { className: "item" });
    const inp = mk("input", { placeholder: "New option" });
    r.append(inp, mk("button", {
      textContent: "Add",
      onclick: () => {
        if (inp.value.trim()) {
          arr.push(inp.value.trim());
          paint();
          (customSave || sv)();
        }
      }
    }));
    box.append(r);
  }

  b.onclick = () => {
    box.style.display = box.style.display === "none" ? "block" : "none";
  };
  sel.after(b, box);
  paint();
}

export function sr() {
  const st = $("state")?.value;
  const h = $("strules");
  if (!h) return;
  h.innerHTML = "";
  if (!st) {
    h.textContent = "Select the State first. Its rules and a preparation checklist will appear here.";
    return;
  }
  STN[st] = STN[st] || (RULES[st] || []).slice();

  function sec(t, arr) {
    h.append(mk("b", { textContent: t }));
    arr.forEach((a, i) => {
      const r = mk("div", { className: "item", style: "align-items:flex-start" });
      r.append(
        mk("span", { textContent: "• " + a, style: "flex:1" }),
        mk("button", {
          textContent: "×",
          title: "Remove",
          onclick: () => {
            arr.splice(i, 1);
            sv();
            sr();
          }
        })
      );
      h.append(r);
    });
    const r = mk("div", { className: "item" });
    const inp = mk("input", { placeholder: "Add a line" });
    r.append(inp, mk("button", {
      textContent: "Add",
      onclick: () => {
        if (inp.value.trim()) {
          arr.push(inp.value.trim());
          sv();
          sr();
        }
      }
    }));
    h.append(r);
  }

  sec("Rules for " + st + (RULES[st] ? " (verify against the current Act and amendments)" : " (none built in yet: add its Court Fees Act, rent law, civil courts act and High Court rules)"), STN[st]);
  sec("Make sure of these in every State", UNI);
  h.append(mk("button", {
    textContent: "Show State checklist on page",
    onclick: () => {
      const L = a => a.map(x => "<p>• " + esc(x) + "</p>").join("");
      if ($("sheet")) {
        $("sheet").innerHTML = "<h3>STATE CHECKLIST – " + esc(st.toUpperCase()) + "</h3><p><b>Rules to check</b></p>" + L(STN[st]) + "<p><b>Make sure of these</b></p>" + L(UNI) + "<p><i>Verify every rule against the current Act, rules and High Court notifications before filing.</i></p><p class='r'>" + advBlock() + "</p>";
      }
      style();
    }
  }));
}

export function dr() {
  const q = $("dq")?.value.toLowerCase() || "";
  const h = $("dres");
  if (!h) return;
  h.innerHTML = "";
  D.map(x => ["Term", ...x])
    .concat(M.map(x => ["Maxim", ...x]))
    .filter(x => !q || (x[1] + " " + x[2]).toLowerCase().indexOf(q) > -1)
    .forEach(x => {
      const d = mk("div", { className: "item", style: "align-items:flex-start" });
      d.append(mk("span", {
        innerHTML: "<b>" + x[1] + "</b> (" + x[0] + "): " + x[2],
        style: "flex:1;font-size:13px"
      }));
      if (x[0] === "Maxim") {
        d.append(mk("button", {
          textContent: "Add",
          title: "Add to grounds",
          onclick: () => {
            addTo("grounds", "The maxim “" + x[1] + "” applies: " + x[2]);
          }
        }));
      }
      h.append(d);
    });
}

let isVoiceActive = false;

function initEditorBar() {
  const WB_EL = $("wbar");
  if (!WB_EL) return;
  const wgrp = () => {
    const d = document.createElement("span");
    d.className = "grp";
    WB_EL.append(d);
    return d;
  };
  const wbtn = (p, t, title, fn) => {
    const b = mk("button", { textContent: t, title, type: "button" });
    b.onmousedown = e => e.preventDefault();
    b.onclick = fn;
    p.append(b);
    return b;
  };
  const wsel = (p, id, opts, fn, title, keep) => {
    const s = mk("select", { id, title: title || "" });
    opts.forEach(o => {
      s.append(mk("option", { textContent: Array.isArray(o) ? o[0] : o, value: Array.isArray(o) ? o[1] : o }));
    });
    s.onchange = function () {
      const v = this.value;
      if (v === "") return;
      fn(v);
      if (!keep) this.selectedIndex = 0;
    };
    p.append(s);
    return s;
  };
  const winp = (p, id, type, ph, w) => {
    const i = mk("input", { id, type, placeholder: ph || "", title: ph || "" });
    if (w) i.style.width = w;
    p.append(i);
    return i;
  };
  const wlab = (p, t) => {
    p.append(mk("span", { className: "lb", textContent: t }));
  };

  let g = wgrp();
  wbtn(g, "↶", "Undo (Ctrl+Z)", () => ex("undo"));
  wbtn(g, "↷", "Redo (Ctrl+Y)", () => ex("redo"));
  wbtn(g, "Clear", "Clear formatting", () => ex("removeFormat"));
  wbtn(g, "Select all", "Select all (Ctrl+A)", () => ex("selectAll"));

  g = wgrp();
  wsel(g, "w_sty", [["Style", ""], ["Normal", "p"], ["Heading 1", "h1"], ["Heading 2", "h2"], ["Heading 3", "h3"], ["Heading 4", "h4"]], v => {
    act(() => { document.execCommand("formatBlock", false, "<" + v + ">"); });
  }, "Paragraph style");
  wsel(g, "w_font", [["Font", ""]].concat(FONTS), v => ex("fontName", v), "Font");
  wsel(g, "w_size", [["Size", ""], 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 36, 48, 72], v => fsz(+v), "Font size (pt)");
  wbtn(g, "A+", "Increase font size", () => fsd(1));
  wbtn(g, "A−", "Decrease font size", () => fsd(-1));
  wsel(g, "w_case", [["Aa", ""], ["UPPERCASE", "u"], ["lowercase", "l"], ["Title Case", "t"], ["Sentence case", "s"]], cs, "Change case");

  g = wgrp();
  [
    ["B", "bold", "Bold (Ctrl+B)", "font-weight:700"],
    ["I", "italic", "Italic (Ctrl+I)", "font-style:italic"],
    ["U", "underline", "Underline (Ctrl+U)", "text-decoration:underline"],
    ["S", "strikeThrough", "Strikethrough", "text-decoration:line-through"],
    ["x₂", "subscript", "Subscript", ""],
    ["x²", "superscript", "Superscript", ""]
  ].forEach(a => {
    const b = wbtn(g, a[0], a[2], () => ex(a[1]));
    b.dataset.c = a[1];
    if (a[3]) b.style.cssText = a[3];
  });
  wlab(g, "Text");
  const fc = winp(g, "w_fc", "color", "Text colour");
  fc.value = "#000000";
  fc.oninput = function () { ex("foreColor", this.value); };
  wlab(g, "Fill");
  const hc = winp(g, "w_hc", "color", "Highlight colour");
  hc.value = "#ffff00";
  hc.oninput = function () { ex("hiliteColor", this.value); };
  wbtn(g, "No fill", "Remove highlight", () => ex("hiliteColor", "#ffffff"));

  g = wgrp();
  [
    ["Left", "justifyLeft", "Align left (Ctrl+L)"],
    ["Centre", "justifyCenter", "Centre (Ctrl+E)"],
    ["Right", "justifyRight", "Align right (Ctrl+R)"],
    ["Justify", "justifyFull", "Justify (Ctrl+J)"]
  ].forEach(a => {
    const b = wbtn(g, a[0], a[2], () => ex(a[1]));
    b.dataset.c = a[1];
  });

  g = wgrp();
  const b1 = wbtn(g, "• List", "Bullet list", () => ex("insertUnorderedList"));
  b1.dataset.c = "insertUnorderedList";
  const b2 = wbtn(g, "1. List", "Numbered list", () => ex("insertOrderedList"));
  b2.dataset.c = "insertOrderedList";
  wsel(g, "w_ls", [
    ["List style", ""], ["1, 2, 3", "decimal"], ["a, b, c", "lower-alpha"],
    ["i, ii, iii", "lower-roman"], ["A, B, C", "upper-alpha"], ["I, II, III", "upper-roman"],
    ["• bullet", "disc"], ["◦ circle", "circle"], ["▪ square", "square"]
  ], v => {
    act(() => {
      const n = getSelection().anchorNode;
      const l = n && (n.nodeType === 1 ? n : n.parentNode).closest("ol,ul");
      if (l) l.style.listStyleType = v;
      else wmsg("Click inside a list first.");
    });
  }, "List style");
  wbtn(g, "Outdent", "Decrease indent", () => ex("outdent"));
  wbtn(g, "Indent", "Increase indent", () => ex("indent"));
  wbtn(g, "1st line", "Toggle first-line indent", () => {
    bs(b => { b.style.textIndent = b.style.textIndent ? "" : "12.7mm"; });
  });
  wsel(g, "w_lh", [["Line spacing", ""], "1", "1.15", "1.5", "2", "2.5", "3"], v => {
    bs(b => { b.style.lineHeight = v; });
  }, "Line spacing");

  g = wgrp();
  wlab(g, "Paragraph: left mm");
  winp(g, "w_pl", "number", "Left indent (mm)");
  wlab(g, "right");
  winp(g, "w_pr", "number", "Right indent (mm)");
  wlab(g, "first line");
  winp(g, "w_pf", "number", "First-line indent (mm)");
  wlab(g, "before pt");
  winp(g, "w_pb", "number", "Space before (pt)");
  wlab(g, "after pt");
  winp(g, "w_pa", "number", "Space after (pt)");
  wbtn(g, "Apply", "Apply paragraph settings to the selected paragraphs", wpar);

  g = wgrp();
  wlab(g, "Table");
  winp(g, "w_r", "number", "Rows").value = 3;
  wlab(g, "×");
  winp(g, "w_c", "number", "Columns").value = 3;
  wbtn(g, "Insert table", "Insert table", tins);
  wsel(g, "w_tt", [
    ["Table tools", ""], ["Row above", "ra"], ["Row below", "rb"], ["Column left", "cl"],
    ["Column right", "cr"], ["Delete row", "dr"], ["Delete column", "dc"],
    ["Delete table", "dt"], ["Merge with right cell", "mg"], ["Borders on/off", "bd"]
  ], tt, "Table tools");

  g = wgrp();
  wbtn(g, "Page break", "Insert page break", () => {
    act(() => {
      document.execCommand("insertHTML", false, '<div class="pb" contenteditable="false"></div><p><br></p>');
    });
  });
  wbtn(g, "Line", "Insert horizontal line", () => ex("insertHorizontalRule"));
  wbtn(g, "Date", "Insert today’s date", () => {
    act(() => { document.execCommand("insertText", false, new Date().toLocaleDateString("en-GB")); });
  });
  wsel(g, "w_sym", [["Symbol", ""], "§", "¶", "₹", "©", "®", "™", "°", "±", "×", "÷", "—", "–", "“", "”"], v => {
    act(() => { document.execCommand("insertText", false, v); });
  }, "Insert symbol");

  g = wgrp();
  wlab(g, "Find");
  winp(g, "w_f", "text", "Find");
  winp(g, "w_g", "text", "Replace with");
  winp(g, "w_mc", "checkbox", "Match case");
  wlab(g, "Aa");
  wbtn(g, "Next", "Find next", () => wfind(false));
  wbtn(g, "Previous", "Find previous", () => wfind(true));
  wbtn(g, "Replace", "Replace", wrep);
  wbtn(g, "Replace all", "Replace all", wall);

  g = wgrp();
  wlab(g, "Layout");
  wsel(g, "w_paper", Array.from($("paper")?.options || []).map(o => [o.textContent, o.value]), v => {
    $("paper").value = v; save(); style();
  }, "Paper size", true);
  wsel(g, "w_orient", [["Portrait", "p"], ["Landscape", "l"]], v => {
    $("orient").value = v; save(); style();
  }, "Orientation", true);
  wsel(g, "w_marg", [["Margins", ""], ["Court standard", "25,25,38,25"], ["Normal", "25,25,25,25"], ["Narrow", "13,13,13,13"], ["Moderate", "25,25,19,19"], ["Wide", "25,25,50,50"]], v => {
    const a = v.split(",");
    ["mt", "mb", "ml", "mr"].forEach((k, i) => { if ($(k)) $(k).value = a[i]; });
    save(); style();
  }, "Margin presets");
  wsel(g, "w_cols", [["1 column", "1"], ["2 columns", "2"], ["3 columns", "3"]], v => {
    $("cols").value = v; save(); style();
  }, "Columns", true);
  wsel(g, "w_zoom", [["50%", "50"], ["75%", "75"], ["100%", "100"], ["125%", "125"], ["150%", "150"]], v => {
    if (SCR()) SCR().style.zoom = v / 100;
    wcount();
  }, "Zoom", true);
  if ($("w_zoom")) $("w_zoom").value = "100";

  g = wgrp();
  const micBtn = wbtn(g, "🎙️ Dictate", "Voice dictation (English/Tamil)", () => {
    if (!isSpeechSupported()) {
      wmsg("Speech recognition not supported in this browser.");
      return;
    }
    if (isVoiceActive) {
      stopDictation();
      isVoiceActive = false;
      micBtn.classList.remove("on");
      micBtn.textContent = "🎙️ Dictate";
      wmsg("Dictation stopped.");
    } else {
      const lang = $("w_mic_lang")?.value || "en-IN";
      startDictation({
        lang,
        onResult: ({ final }) => {
          if (final) {
            act(() => { document.execCommand("insertText", false, final + " "); });
          }
        },
        onError: () => {
          isVoiceActive = false;
          micBtn.classList.remove("on");
          micBtn.textContent = "🎙️ Dictate";
        },
        onEnd: () => {
          isVoiceActive = false;
          micBtn.classList.remove("on");
          micBtn.textContent = "🎙️ Dictate";
        }
      });
      isVoiceActive = true;
      micBtn.classList.add("on");
      micBtn.textContent = "🔴 Listening...";
      wmsg(`Listening in ${lang}...`);
    }
  });

  wsel(g, "w_mic_lang", [["EN (India)", "en-IN"], ["TA (Tamil)", "ta-IN"]], () => {}, "Dictation Language", true);

  const sp = wbtn(g, "Spelling", "Turn spell check on or off", () => {
    if (SH()) {
      SH().spellcheck = !SH().spellcheck;
      sp.classList.toggle("on", SH().spellcheck);
    }
  });
  wbtn(g, "Page guides", "Show where pages end", () => { $("guide")?.onclick(); });
  wbtn(g, "Save as DOCX", "Download modern Microsoft Word (.docx)", () => {
    if (SH()) exportHtmlToDocx(SH().innerHTML, "Diligent-in-Law-" + new Date().toISOString().slice(0, 10) + ".docx");
  }).className = "p";
  wbtn(g, "Save as DOC", "Download legacy Word (.doc)", wdoc);
  wbtn(g, "Print preview", "Open print preview", () => pvOpen(false));
  g.append(mk("span", { id: "wcnt", className: "lb" }), mk("span", { id: "wmsg", className: "lb", style: "color:var(--acc)" }));
}

function initPrintBar() {
  const PB = $("prbar");
  if (!PB) return;
  const pgrp = () => {
    const d = document.createElement("span");
    d.className = "grp";
    PB.append(d);
    return d;
  };
  const wbtn = (p, t, title, fn) => {
    const b = mk("button", { textContent: t, title, type: "button" });
    b.onclick = fn;
    p.append(b);
    return b;
  };
  const wsel = (p, id, opts, fn, title, keep) => {
    const s = mk("select", { id, title: title || "" });
    opts.forEach(o => {
      s.append(mk("option", { textContent: Array.isArray(o) ? o[0] : o, value: Array.isArray(o) ? o[1] : o }));
    });
    s.onchange = function () {
      const v = this.value;
      if (v === "") return;
      fn(v);
      if (!keep) this.selectedIndex = 0;
    };
    p.append(s);
    return s;
  };
  const winp = (p, id, type, ph) => {
    const i = mk("input", { id, type, placeholder: ph || "", title: ph || "" });
    p.append(i);
    return i;
  };
  const wlab = (p, t) => {
    p.append(mk("span", { className: "lb", textContent: t }));
  };

  let g = pgrp();
  wbtn(g, "Print", "Print the whole document", () => doPrint(false)).className = "p";
  wbtn(g, "Print selection", "Print only the text you have selected", () => doPrint(true));
  const pbPrev = wbtn(g, "Print preview", "Open print preview", () => {
    if (document.body.classList.contains("pv")) pvClose();
    else pvOpen(false);
  });
  pbPrev.id = "pr_prev";
  wbtn(g, "Save as PDF", "Open the print window and choose Save as PDF there", () => {
    if ($("prmsg")) $("prmsg").textContent = "In the print window, choose Save as PDF as the printer.";
    doPrint(false);
  });
  const pr = winp(g, "pr_proof", "checkbox", "Draft watermark");
  wlab(g, "Draft watermark");
  pr.onchange = function () {
    PVP = this.checked;
    if ($("p_proof")) $("p_proof").checked = PVP;
  };

  g = pgrp();
  wsel(g, "pr_paper", Array.from($("paper")?.options || []).map(o => [o.textContent, o.value]), v => {
    $("paper").value = v; save(); style();
  }, "Paper size", true);
  wsel(g, "pr_orient", [["Portrait", "p"], ["Landscape", "l"]], v => {
    $("orient").value = v; save(); style();
  }, "Orientation", true);
  wsel(g, "pr_marg", [["Margins", ""], ["Court standard", "25,25,38,25"], ["Normal", "25,25,25,25"], ["Narrow", "13,13,13,13"], ["Moderate", "25,25,19,19"], ["Wide", "25,25,50,50"]], v => {
    const a = v.split(",");
    ["mt", "mb", "ml", "mr"].forEach((k, i) => { if ($(k)) $(k).value = a[i]; });
    save(); style();
  }, "Margin presets", false);
  wsel(g, "pr_hshow", [["Header: show", "1"], ["Header: removed", "0"]], v => {
    $("hshow").value = v; save(); style();
  }, "Header", true);
  wsel(g, "pr_fshow", [["Footer: show", "1"], ["Footer: removed", "0"]], v => {
    $("fshow").value = v; save(); style();
  }, "Footer", true);
  wsel(g, "pr_pn", [["Custom page number", ""], ["Page X of Y", "Page {page} of {pages}"], ["Page X", "Page {page}"], ["No page number", "none"]], v => {
    $("fc").value = v === "none" ? "" : v;
    if (v !== "none") $("fshow").value = "1";
    save(); style();
  }, "Page numbers", true);

  g = pgrp();
  g.append(
    mk("span", { id: "prpages", className: "tot", textContent: "Total pages: 1" }),
    mk("span", { id: "prsum", className: "lb" }),
    mk("span", { id: "prmsg", className: "lb", style: "color:var(--acc)" })
  );
  PB.append(mk("div", {
    className: "lb",
    textContent: "For a page range or number of copies, use the Pages and Copies boxes in the print window. To print part of the text, select it and press Print selection."
  }));
}

function initChamberHub() {
  const modal = $("chamber_modal");
  if (!modal) return;

  const openTab = tabName => {
    modal.style.display = "flex";
    document.querySelectorAll(".hub-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    document.querySelectorAll(".hub-tab-pane").forEach(p => {
      p.classList.toggle("active", p.id === `pane_${tabName}`);
    });
  };

  $("btn_hub_bns")?.addEventListener("click", () => openTab("bns"));
  $("btn_hub_calc")?.addEventListener("click", () => openTab("calc"));
  $("btn_hub_diary")?.addEventListener("click", () => openTab("diary"));
  $("btn_hub_index")?.addEventListener("click", () => openTab("index"));
  $("btn_hub_ledger")?.addEventListener("click", () => openTab("ledger"));
  $("hub_close")?.addEventListener("click", () => { modal.style.display = "none"; });

  document.querySelectorAll(".hub-tab").forEach(t => {
    t.addEventListener("click", () => openTab(t.dataset.tab));
  });

  const renderBnsResults = () => {
    const q = $("bns_query")?.value || "";
    const priority = $("bns_priority")?.value === "new";
    const results = searchCriminalCodes(q);
    const box = $("bns_results");
    if (!box) return;
    box.innerHTML = "";
    if (!results.length) {
      box.innerHTML = `<div class="note">No matching sections found for "${esc(q)}". Try searching "420", "bail", "theft", or "murder".</div>`;
      return;
    }
    results.forEach(item => {
      const citation = formatDualCitation(item, priority);
      const row = mk("div", { className: "item", style: "align-items:flex-start;background:var(--bg);padding:8px;border-radius:4px;margin-bottom:6px;" });
      const info = mk("div", { style: "flex:1;" });
      info.innerHTML = `<div><span class="badge-tag">${item.newSec}</span> <span class="badge-tag" style="background:#374151;color:#e5e7eb;">${item.oldSec}</span> <b>${item.title}</b></div><div style="font-size:12px;color:var(--mute);margin-top:4px;">${citation}</div>`;
      const btnCopy = mk("button", {
        textContent: "Copy",
        onclick: () => {
          navigator.clipboard.writeText(citation);
          btnCopy.textContent = "Copied!";
          setTimeout(() => { btnCopy.textContent = "Copy"; }, 1500);
        }
      });
      const btnInsert = mk("button", {
        textContent: "Insert in Grounds",
        className: "p",
        onclick: () => {
          addTo("grounds", `That the allegations do not satisfy the essential ingredients of ${citation}.`);
          btnInsert.textContent = "Inserted!";
          setTimeout(() => { btnInsert.textContent = "Insert in Grounds"; }, 1500);
        }
      });
      row.append(info, btnCopy, btnInsert);
      box.append(row);
    });
  };

  $("bns_query")?.addEventListener("input", renderBnsResults);
  $("bns_priority")?.addEventListener("change", renderBnsResults);
  renderBnsResults();

  $("ni_calc_btn")?.addEventListener("click", () => {
    const memo = $("ni_memo")?.value;
    const dispatch = $("ni_dispatch")?.value;
    const receipt = $("ni_receipt")?.value;
    const res = calculateNI138Timeline(memo, dispatch, receipt);
    const outBox = $("ni_result");
    if (!outBox) return;
    if (!res) {
      outBox.style.display = "block";
      outBox.innerHTML = "<b>Please enter at least the Cheque Return Memo Date.</b>";
      return;
    }
    outBox.style.display = "block";
    outBox.innerHTML = `<b>NI Act Sec. 138 Statutory Calculation:</b><br>` +
      res.summary.map(s => `• ${esc(s)}`).join("<br>") +
      `<div style="margin-top:8px;"><button id="btn_ni_inject" class="p" style="font-size:12px;">Insert Timeline into Facts</button></div>`;
    $("btn_ni_inject")?.addEventListener("click", () => {
      res.summary.forEach(s => addTo("facts", s));
      alert("Timeline statements inserted into Facts of the Case!");
    });
  });

  $("cf_calc_btn")?.addEventListener("click", () => {
    const type = $("cf_type")?.value || "money";
    const val = $("cf_val")?.value || 0;
    const res = calculateTnCourtFees(type, val);
    const box = $("cf_result");
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = `<b>TNCF Act, 1955 Calculation:</b><br>` +
      `Formula: ${res.formula}<br>` +
      `Court Fee: <b>Rs. ${res.courtFee.toLocaleString("en-IN")}</b><br>` +
      `Advocates Welfare Fund Stamp: Rs. ${res.advocatesWelfare}<br>` +
      `Total Payable: <b style="color:var(--acc);">Rs. ${res.totalPayable.toLocaleString("en-IN")}</b>`;
  });

  $("cf_inject_btn")?.addEventListener("click", () => {
    const type = $("cf_type")?.value || "money";
    const val = $("cf_val")?.value || 0;
    const res = calculateTnCourtFees(type, val);
    if ($("val")) $("val").value = val;
    if ($("fee")) $("fee").value = res.totalPayable;
    if ($("jur")) {
      $("jur").value = `Valuation under the Tamil Nadu Court-Fees and Suits Valuation Act, 1955. ${res.formula}. Total court fee paid: Rs. ${res.totalPayable.toLocaleString("en-IN")}.`;
    }
    save();
    style();
    alert("Valuation, Court Fee, and Jurisdiction section updated!");
  });

  const stageSel = $("cd_stage");
  if (stageSel) {
    stageSel.innerHTML = "";
    CASE_STAGES.forEach(st => {
      stageSel.append(mk("option", { textContent: st, value: st }));
    });
  }

  const renderHearingsList = async () => {
    const listEl = $("cd_hearings_list");
    if (!listEl) return;
    const cases = await getAllItems("cases");
    if (!cases.length) {
      listEl.innerHTML = `<div class="note">No hearings scheduled yet in the diary.</div>`;
      return;
    }
    listEl.innerHTML = `<b>Scheduled Cases (${cases.length}):</b>`;
    cases.forEach(cs => {
      const row = mk("div", { className: "item", style: "background:var(--bg);padding:8px;border-radius:4px;margin-bottom:6px;" });
      const details = mk("div", { style: "flex:1;" });
      details.innerHTML = `<div><b>${cs.caseNumber || "Pending"}</b> · <span class="badge-tag">${cs.courtName || "Court"}</span> · <small>${cs.nextHearingDate || "No date"}</small></div>
        <div style="font-size:12px;color:var(--mute);">${cs.partyNames || ""} (${cs.client || ""}) · Stage: <b>${cs.currentStage || "Hearing"}</b></div>
        ${cs.notes ? `<div style="font-size:11px;color:var(--acc);">Note: ${cs.notes}</div>` : ""}`;
      
      const btnRemind = mk("button", {
        textContent: "WhatsApp Reminder",
        onclick: () => {
          const msg = formatClientHearingReminder({
            client: cs.client,
            cno: cs.caseNumber,
            court: cs.courtName,
            date: cs.nextHearingDate,
            stage: cs.currentStage
          });
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
        }
      });
      const btnDel = mk("button", {
        textContent: "×",
        title: "Delete",
        onclick: async () => {
          await deleteItem("cases", cs.id);
          renderHearingsList();
        }
      });
      row.append(details, btnRemind, btnDel);
      listEl.append(row);
    });
  };

  $("cd_add_btn")?.addEventListener("click", async () => {
    const cnr = $("cd_cnr")?.value.trim();
    if (cnr && !/^[A-Za-z0-9]{16}$/.test(cnr)) {
      alert("Invalid CNR Number: must be exactly 16 alphanumeric characters (e.g. TNCO010012342026).");
      return;
    }
    const cno = $("cd_cno")?.value.trim();
    const court = $("cd_court")?.value.trim();
    const hall = $("cd_hall")?.value.trim();
    const parties = $("cd_parties")?.value.trim();
    const client = $("cd_client")?.value.trim();
    const date = $("cd_date")?.value;
    const stage = $("cd_stage")?.value;
    const notes = $("cd_notes")?.value.trim();

    if (!cno || !date) {
      alert("Please enter at least the Case Number and Hearing Date.");
      return;
    }

    await putItem("cases", {
      cnrNumber: cnr,
      caseNumber: cno,
      courtName: court,
      courtHall: hall,
      partyNames: parties,
      client,
      nextHearingDate: date,
      currentStage: stage,
      notes,
      updatedAt: new Date().toISOString()
    });

    $("cd_cno").value = "";
    $("cd_parties").value = "";
    $("cd_notes").value = "";
    renderHearingsList();
    alert("Case hearing scheduled in Diary!");
  });

  $("cd_view_cause_btn")?.addEventListener("click", async () => {
    const filterDate = $("cd_filter_date")?.value || new Date().toISOString().slice(0, 10);
    const cases = await getAllItems("cases");
    const matched = cases.filter(c => c.nextHearingDate === filterDate).map(c => ({
      court: c.courtName,
      hall: c.courtHall,
      cno: c.caseNumber,
      parties: c.partyNames,
      client: c.client,
      stage: c.currentStage,
      advocate: "Advocate Thangaraju",
      notes: c.notes
    }));

    const causeListHtml = generateDailyCauseListHtml(matched, new Date(filterDate).toLocaleDateString("en-GB"));
    if ($("sheet")) $("sheet").innerHTML = causeListHtml;
    modal.style.display = "none";
    style();
    pvOpen(false);
  });

  renderHearingsList();

  const idxRows = $("idx_rows");
  const defaultIdxItems = [
    { title: "Synopsis & List of Dates", pages: 2, annexure: "-" },
    { title: "Main Plaint / Petition", pages: 8, annexure: "-" },
    { title: "Supporting Affidavit", pages: 2, annexure: "-" },
    { title: "Vakalatnama", pages: 2, annexure: "-" },
    { title: "Sale Deed / Primary Document", pages: 4, annexure: "A-1" }
  ];

  const renderIdxInputs = () => {
    if (!idxRows) return;
    idxRows.innerHTML = "";
    defaultIdxItems.forEach((item, idx) => {
      const r = mk("div", { className: "item", style: "margin-bottom:4px;" });
      const inpAnn = mk("input", { value: item.annexure, placeholder: "Annexure", style: "width:80px;" });
      inpAnn.oninput = () => { item.annexure = inpAnn.value; };
      const inpTitle = mk("input", { value: item.title, placeholder: "Document Title", style: "flex:1;" });
      inpTitle.oninput = () => { item.title = inpTitle.value; };
      const inpPages = mk("input", { type: "number", value: item.pages, min: "1", style: "width:70px;" });
      inpPages.oninput = () => { item.pages = parseInt(inpPages.value, 10) || 1; };
      const btnDel = mk("button", {
        textContent: "×",
        onclick: () => {
          defaultIdxItems.splice(idx, 1);
          renderIdxInputs();
        }
      });
      r.append(inpAnn, inpTitle, inpPages, btnDel);
      idxRows.append(r);
    });
  };

  $("idx_add_btn")?.addEventListener("click", () => {
    defaultIdxItems.push({ title: "New Document", pages: 1, annexure: "-" });
    renderIdxInputs();
  });

  $("idx_gen_btn")?.addEventListener("click", () => {
    const res = generateEfilingIndex(defaultIdxItems);
    const prev = $("idx_preview");
    if (prev) {
      prev.style.display = "block";
      prev.innerHTML = res.html;
    }
  });

  $("idx_inject_btn")?.addEventListener("click", () => {
    const res = generateEfilingIndex(defaultIdxItems);
    if ($("sheet")) {
      $("sheet").innerHTML = res.html + "<p><br></p>" + $("sheet").innerHTML;
      style();
      modal.style.display = "none";
      alert("e-Filing Index inserted at the top of your draft!");
    }
  });

  renderIdxInputs();

  const updateLedgerCalc = () => {
    const fee = parseFloat($("cl_fee")?.value) || 0;
    const adv = parseFloat($("cl_adv")?.value) || 0;
    const exp = parseFloat($("cl_exp")?.value) || 0;
    const bal = (fee + exp) - adv;
    const box = $("cl_calc_box");
    if (box) {
      box.innerHTML = `Total Agreed Fee: Rs. ${fee.toLocaleString("en-IN")} · Court Expenses: Rs. ${exp.toLocaleString("en-IN")}<br>` +
        `Advance Received: Rs. ${adv.toLocaleString("en-IN")}<br>` +
        `Net Balance Due: <span style="color:${bal > 0 ? '#EAB308' : '#14B8A6'};font-size:15px;">Rs. ${bal.toLocaleString("en-IN")}</span>`;
    }
  };

  ["cl_fee", "cl_adv", "cl_exp"].forEach(id => {
    $(id)?.addEventListener("input", updateLedgerCalc);
  });
  updateLedgerCalc();

  const renderLedgerList = async () => {
    const box = $("cl_ledger_list");
    if (!box) return;
    const ledger = await getAllItems("ledger");
    if (!ledger.length) {
      box.innerHTML = `<div class="note">No client accounts in fee ledger yet.</div>`;
      return;
    }
    box.innerHTML = `<b>Client Fee Accounts (${ledger.length}):</b>`;
    ledger.forEach(item => {
      const row = mk("div", { className: "item", style: "background:var(--bg);padding:8px;border-radius:4px;margin-bottom:6px;" });
      const info = mk("div", { style: "flex:1;" });
      info.innerHTML = `<div><b>${item.clientName}</b> · <span>${item.caseTitle}</span></div>
        <div style="font-size:12px;color:var(--mute);">Fee: Rs. ${(item.agreedFee||0).toLocaleString("en-IN")} | Advance: Rs. ${(item.advancePaid||0).toLocaleString("en-IN")} | Balance: <b style="color:var(--acc);">Rs. ${(item.balanceDue||0).toLocaleString("en-IN")}</b></div>`;
      const btnStmt = mk("button", {
        textContent: "Statement PDF",
        className: "p",
        onclick: () => {
          if ($("sheet")) {
            $("sheet").innerHTML = `
              <div style="font-family:'Times New Roman',serif;padding:16px;">
                <h2 style="text-align:center;margin:0 0 4px;">CHAMBER OF ADVOCATE THANGARAJU</h2>
                <h3 style="text-align:center;margin:0 0 16px;text-decoration:underline;">STATEMENT OF PROFESSIONAL ACCOUNT</h3>
                <p><b>Client:</b> ${item.clientName}<br><b>Matter:</b> ${item.caseTitle}<br><b>Date:</b> ${new Date().toLocaleDateString("en-GB")}</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;" border="1">
                  <tr><th>Description</th><th style="text-align:right;">Amount (Rs.)</th></tr>
                  <tr><td>Agreed Professional Fee</td><td style="text-align:right;">${(item.agreedFee||0).toLocaleString("en-IN")}</td></tr>
                  <tr><td>Filing, Batta & Court Expenses</td><td style="text-align:right;">${(item.courtExpenses||0).toLocaleString("en-IN")}</td></tr>
                  <tr style="background:#f1f5f9;"><td><b>Total Charges</b></td><td style="text-align:right;"><b>${((item.agreedFee||0)+(item.courtExpenses||0)).toLocaleString("en-IN")}</b></td></tr>
                  <tr><td>Less: Advance Received</td><td style="text-align:right;">(-) ${(item.advancePaid||0).toLocaleString("en-IN")}</td></tr>
                  <tr style="font-weight:bold;font-size:16px;background:#fafafa;"><td>Net Balance Payable</td><td style="text-align:right;color:#b45309;">Rs. ${(item.balanceDue||0).toLocaleString("en-IN")}</td></tr>
                </table>
                <p style="margin-top:20px;"><i>Please settle the balance through bank transfer or scan the UPI QR code on your receipt.</i></p>
                <p class='r'><br><br>Advocate Thangaraju<br>Signature</p>
              </div>
            `;
            modal.style.display = "none";
            style();
            pvOpen(false);
          }
        }
      });
      const btnDel = mk("button", {
        textContent: "×",
        title: "Delete",
        onclick: async () => {
          await deleteItem("ledger", item.id);
          renderLedgerList();
        }
      });
      row.append(info, btnStmt, btnDel);
      box.append(row);
    });
  };

  $("cl_save_btn")?.addEventListener("click", async () => {
    const name = $("cl_name")?.value.trim();
    const cTitle = $("cl_case")?.value.trim();
    const fee = parseFloat($("cl_fee")?.value) || 0;
    const adv = parseFloat($("cl_adv")?.value) || 0;
    const exp = parseFloat($("cl_exp")?.value) || 0;
    const bal = (fee + exp) - adv;

    if (!name || !cTitle) {
      alert("Please enter Client Name and Case Title.");
      return;
    }

    await putItem("ledger", {
      clientName: name,
      caseTitle: cTitle,
      agreedFee: fee,
      advancePaid: adv,
      courtExpenses: exp,
      balanceDue: bal,
      updatedAt: new Date().toISOString()
    });

    renderLedgerList();
    alert("Fee account record saved to Ledger!");
  });

  renderLedgerList();
}

document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  migrateFromLocalStorage();

  function fill(id, arr) {
    const el = $(id);
    if (!el) return;
    arr.forEach(a => {
      const o = document.createElement("option");
      o.textContent = a;
      el.appendChild(o);
    });
  }
  
  fill("court", COURTS);
  fill("ftype", FT);
  fill("font", FONTS);
  
  LANGS.forEach(l => {
    const o = document.createElement("option");
    o.textContent = l[0];
    $("lang")?.appendChild(o);
  });
  
  STATES.forEach(x => {
    const o = document.createElement("option");
    o.textContent = x;
    $("state")?.appendChild(o);
  });
  
  PC.forEach(x => {
    const o = document.createElement("option");
    o.textContent = x[0];
    $("aprop")?.appendChild(o);
  });
  
  const aadv = $("aadv");
  if (aadv) {
    aadv.append(mk("option", { textContent: "No advance", value: "0" }));
    for (let mi = 1; mi <= 12; mi++) {
      aadv.append(mk("option", { textContent: mi + (mi === 1 ? " month" : " months"), value: String(mi) }));
    }
  }

  load();
  render();
  
  mg("court", COURTS);
  mg("ftype", FT);
  mg("font", FONTS);
  mg("ph", PH, true);
  mg("atype", AGN, false, svAgn);

  initEditorBar();
  initPrintBar();
  initChamberHub();

  IDS.forEach(i => {
    const el = $(i);
    if (el) {
      el.addEventListener("input", () => { save(); style(); });
      el.addEventListener("change", () => { save(); style(); });
    }
  });

  $("lang")?.addEventListener("change", function () {
    const l = LANGS.find(x => x[0] === this.value);
    if (l) {
      const fontEl = $("font");
      if (fontEl) fontEl.value = FONTS.indexOf(l[2]) > -1 ? l[2] : l[1];
    }
    style();
    save();
  });

  ["caveat", "docket", "sign", "showlaws", "showsecs", "rqr"].forEach(id => {
    $(id)?.addEventListener("change", save);
  });

  $("adddoc")?.addEventListener("click", () => { S.docs.push({ t: "" }); renderDocs(); save(); });
  $("addlaw")?.addEventListener("click", () => { S.laws.push({ c: "", ct: "", h: "", p: "" }); renderLaws(); save(); });
  $("addsec")?.addEventListener("click", () => { S.secs.push({ a: "", s: "", r: "" }); renderSecs(); save(); });
  $("addadv")?.addEventListener("click", () => { S.advs.push({ n: "", e: "" }); renderAdvs(); save(); });

  $("gen")?.addEventListener("click", gen);
  $("print")?.addEventListener("click", () => pvOpen(false));
  $("proof")?.addEventListener("click", () => pvOpen(true));
  $("hfprev")?.addEventListener("click", () => pvOpen(false));
  $("pvclose")?.addEventListener("click", pvClose);
  $("pvprint")?.addEventListener("click", () => doPrint(false));
  $("hfreset")?.addEventListener("click", hfreset);
  $("pvreset")?.addEventListener("click", hfreset);

  $("vak")?.addEventListener("click", () => {
    if ($("sheet")) {
      $("sheet").innerHTML = "<h3>VAKALATNAMA</h3><p class='c'><b>" + hd() + "</b><br>" + (esc($("cno")?.value) || "Case No. ____________ of 20____") + "</p><p>I/We, " + (esc($("client")?.value) || "__________") + ", do hereby appoint and retain " + advBlock() + " to appear, act and plead for me/us in the above matter, to file and withdraw pleadings, applications and documents, to deposit and receive money, to compromise only with my/our written consent, and to do all acts necessary for the conduct of the case, and I/we agree to ratify all acts done by the said Advocate(s) in pursuance of this authority.</p><p>Place: " + esc($("place")?.value) + "<br>Date: " + new Date().toLocaleDateString("en-GB") + "</p><p class='r'>Signature of the client</p><p>Accepted:<br>" + advBlock() + "</p>";
    }
    style();
  });

  $("adv")?.addEventListener("click", () => {
    if ($("sheet")) {
      $("sheet").innerHTML = "<h3>LEGAL OPINION</h3><p><b>Client:</b> " + (esc($("client")?.value) || "__________") + "<br><b>Subject:</b> __________<br><b>Date:</b> " + new Date().toLocaleDateString("en-GB") + "</p><p><b>1. Facts furnished by the client</b></p>" + lines("facts").map((f, i) => "<p>" + (i + 1) + ". " + esc(f) + "</p>").join("") + "<p><b>2. Documents examined</b></p>" + S.docs.filter(x => x.t).map((x, i) => "<p>" + (i + 1) + ". " + esc(x.t) + "</p>").join("") + "<p><b>3. Questions of law</b></p><p>__________</p><p><b>4. Opinion and advice</b></p><p>__________</p><p><i>This opinion is confined to the facts and documents furnished and is given only by the Advocate named below. Consultation is only with Advocate Thangaraju.</i></p><p class='r'>" + advBlock() + "</p>";
    }
    style();
  });

  $("agr")?.addEventListener("click", ag);
  $("agr2")?.addEventListener("click", ag);
  $("aff")?.addEventListener("click", af);

  $("theme")?.addEventListener("click", () => {
    const r = document.documentElement;
    r.dataset.theme = (r.dataset.theme === "dark") ? "light" : "dark";
  });

  $("sugb")?.addEventListener("click", () => {
    const res = suggestCourt({
      facts: $("facts")?.value || "",
      grounds: $("grounds")?.value || "",
      prayer: $("prayer")?.value || "",
      p1: $("p1")?.value || "",
      p2: $("p2")?.value || "",
      ftype: $("ftype")?.value || "",
      val: $("val")?.value || 0,
      lim1: $("lim1")?.value || 0,
      lim2: $("lim2")?.value || 0
    });
    const sugBox = $("sug");
    if (sugBox) {
      sugBox.innerHTML = "<b>Suggested court: " + esc(res.court) + "</b><br>" + res.rationale.map(esc).join("<br>") + "<br><i>This is a pointer from keywords in your text and your entries, not a legal opinion. Confirm the State limits, the statute and the territorial limits before filing.</i><br>";
      sugBox.append(mk("button", {
        textContent: "Use this court",
        onclick: () => {
          if ($("court")) $("court").value = res.court;
          if ($("jur") && !$("jur").value.trim()) $("jur").value = res.summary;
          save();
          style();
          gen();
        }
      }));
    }
  });

  $("chkb")?.addEventListener("click", () => {
    const res = validateDraft({
      place: $("place")?.value || "",
      p1: $("p1")?.value || "",
      p2: $("p2")?.value || "",
      client: $("client")?.value || "",
      facts: lines("facts"),
      prayer: lines("prayer"),
      grounds: lines("grounds"),
      docs: S.docs,
      laws: S.laws,
      advs: S.advs,
      ftype: $("ftype")?.value || "",
      val: $("val")?.value || "",
      fee: $("fee")?.value || "",
      jur: $("jur")?.value || "",
      factsRaw: $("facts")?.value || "",
      sheetText: $("sheet")?.innerText || ""
    });
    const chk = $("chk");
    if (chk) {
      chk.innerHTML = res.issues.length
        ? "<b>Fix before filing:</b><br>" + res.issues.map(x => "• " + x).join("<br>")
        : "No problems found in these checks. Read the printed proof once more.";
    }
  });

  $("phf")?.addEventListener("click", () => { addTo("facts", PH[$("ph")?.value || 0]); });
  $("phg")?.addEventListener("click", () => { addTo("grounds", PH[$("ph")?.value || 0]); });
  $("t1")?.addEventListener("click", () => tidy("facts"));
  $("t2")?.addEventListener("click", () => tidy("grounds"));
  $("t3")?.addEventListener("click", () => tidy("prayer"));

  $("sq")?.addEventListener("click", () => {
    const q = $("q")?.value.trim();
    if (q) window.open("https://indiankanoon.org/search/?formInput=" + encodeURIComponent(q), "_blank", "noopener");
  });

  const imp = k => {
    const val = $("imp")?.value || "";
    val.split("\n").filter(s => s.trim()).forEach(s => {
      const p = s.split("|").map(x => x.trim());
      if (k === "l") S.laws.push({ c: p[0] || "", ct: p[1] || "", h: p[2] || "", p: p[3] || "" });
      else S.secs.push({ a: p[0] || "", s: p[1] || "", r: p[2] || "" });
    });
    if ($("imp")) $("imp").value = "";
    render();
    save();
  };
  $("impl")?.addEventListener("click", () => imp("l"));
  $("imps")?.addEventListener("click", () => imp("s"));

  LM.forEach(x => {
    const d = mk("div", { className: "item", style: "align-items:flex-start" });
    d.append(
      mk("span", { innerHTML: "<b>" + x[0] + "</b> – " + x[1] + ". " + x[2], style: "flex:1;font-size:13px" }),
      mk("button", {
        textContent: "Add",
        title: "Add to case laws",
        onclick: () => { S.laws.push({ c: x[0], ct: x[1], h: x[2], p: "" }); renderLaws(); save(); }
      })
    );
    $("lm")?.append(d);
  });

  $("state")?.addEventListener("change", sr);
  $("dq")?.addEventListener("input", dr);
  dr();

  $("rgen")?.addEventListener("click", () => {
    const r = rbuild(true);
    if (!r) return;
    RT = r;
    RL.unshift({ no: r.no, nm: r.nm, am: r.am, dt: r.dt });
    rsv();
    rlg();
    putItem("receipts", {
      no: r.no,
      nm: r.nm,
      am: r.am,
      dt: r.dt,
      words: r.words,
      rp: r.rp,
      per: r.per,
      pr: r.pr,
      mo: r.mo,
      ref: r.ref,
      by: r.by,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    let qrSvgHtml = "";
    if ($("rqr")?.checked) {
      qrSvgHtml = `
        <div style="text-align:center;margin-top:12px;padding:8px;border:1px dashed #cbd5e1;border-radius:4px;">
          ${renderUpiQrSvg(r.upiId, "Advocate Thangaraju", r.rawAmount, `Receipt ${r.no}`, 120)}
          <div style="font-size:11px;margin-top:4px;color:#475569;"><b>Scan to Pay via UPI (GPay / PhonePe / Paytm)</b><br>UPI ID: ${esc(r.upiId)}</div>
        </div>
      `;
    }

    if ($("sheet")) {
      $("sheet").innerHTML = `
        <h3>RECEIPT</h3>
        <table>
          <tr><td><b>Receipt No.</b> ${esc(r.no)}</td><td><b>Date and time</b> ${esc(r.dt)}</td></tr>
        </table>
        <p>Received with thanks <b>Rs. ${esc(r.am)}</b> (Rupees ${esc(r.words)} only) from <b>${esc(r.nm)}</b> towards ${esc($("rp")?.value)}${r.per ? " for " + esc(r.per) : ""}${r.pr ? " for the property: " + esc(r.pr) : ""}.</p>
        <p>Mode of payment: ${esc($("rmo")?.value)}${r.ref ? " – reference " + esc(r.ref) : ""}</p>
        ${qrSvgHtml}
        <p class='r'><br><br>Received by: ${esc(r.by)}<br>Signature</p>
        <p><i>This receipt is computer prepared and is valid with the signature of the person who received the payment.</i></p>
      `;
    }
    style();
  });

  $("rwa")?.addEventListener("click", () => {
    const r = rneed();
    if (!r) return;
    if (num().length < 11) {
      if ($("rlog")) $("rlog").innerHTML = "Enter a valid mobile number.";
      return;
    }
    window.open("https://wa.me/" + num() + "?text=" + encodeURIComponent(r.tx), "_blank", "noopener");
  });

  $("rsms")?.addEventListener("click", () => {
    const r = rneed();
    if (!r) return;
    if (num().length < 11) {
      if ($("rlog")) $("rlog").innerHTML = "Enter a valid mobile number.";
      return;
    }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    window.location.href = "sms:+" + num() + (ios ? "&" : "?") + "body=" + encodeURIComponent(r.tx);
  });

  $("rcp")?.addEventListener("click", () => {
    const r = rneed();
    if (!r) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(r.tx).then(() => {
        $("rlog")?.insertAdjacentText("afterbegin", "Copied. ");
      }, () => {
        $("rlog")?.insertAdjacentText("afterbegin", "Could not copy. ");
      });
    }
  });

  $("rpdf")?.addEventListener("click", () => {
    const r = rneed();
    if (!r) return;
    const f = generateReceiptPdf(r);
    const u = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = u;
    a.download = f.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => { URL.revokeObjectURL(u); }, 4000);
    $("rlog")?.insertAdjacentText("afterbegin", "PDF " + f.name + " saved to your downloads. ");
  });

  $("rshare")?.addEventListener("click", async () => {
    const r = rneed();
    if (!r) return;
    const f = generateReceiptPdf(r);
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({
          files: [f],
          title: `Receipt ${r.no}`,
          text: r.tx
        });
        $("rlog")?.insertAdjacentText("afterbegin", "Shared successfully via Web Share. ");
      } catch (err) {
        if (err.name !== "AbortError") {
          $("rlog")?.insertAdjacentText("afterbegin", "Share failed. Use Download PDF. ");
        }
      }
    } else {
      const waNumber = num();
      if (waNumber.length >= 11) {
        window.open("https://wa.me/" + waNumber + "?text=" + encodeURIComponent(r.tx), "_blank", "noopener");
        $("rlog")?.insertAdjacentText("afterbegin", "Opened WhatsApp text. Please attach the downloaded PDF. ");
      } else {
        $("rlog")?.insertAdjacentText("afterbegin", "Web Share not supported on this device. Use Download PDF. ");
      }
    }
  });

  $("rmine")?.addEventListener("click", () => {
    const r = rneed();
    if (!r) return;
    let d = dg($("rmy")?.value);
    if (d.length === 10) d = "91" + d;
    if (d.length < 11) {
      if ($("rlog")) $("rlog").innerHTML = "Enter your own WhatsApp number.";
      return;
    }
    window.open("https://wa.me/" + d + "?text=" + encodeURIComponent(r.tx), "_blank", "noopener");
  });

  ["rn", "ra", "rp", "rper", "rmo", "rref", "rprop", "rby", "rupi"].forEach(i => {
    $(i)?.addEventListener("input", () => { RT = ""; });
  });

  let G = false;
  $("guide")?.addEventListener("click", () => {
    G = !G;
    const sh = SH();
    if (!sh) return;
    const h = +pdim()[1] - (+$("mt")?.value || 25) - (+$("mb")?.value || 25);
    sh.style.backgroundOrigin = "content-box";
    sh.style.backgroundClip = "content-box";
    sh.style.backgroundImage = G
      ? "repeating-linear-gradient(to bottom,transparent 0,transparent calc(" + h + "mm - 2px),#e33 calc(" + h + "mm - 2px),#e33 " + h + "mm)"
      : "none";
  });

  $("cbtn")?.addEventListener("click", () => {
    const t = $("ctype")?.value || "Individual";
    const co = t !== "Individual";
    const L = a => a.map(x => "<p>• " + x + "</p>").join("");
    const DO = [
      "Keep all original documents safe and give clear copies to your advocate.",
      "Give a true and complete account of the facts, including facts that seem unfavourable.",
      "Attend every hearing, or tell your advocate in advance.",
      "Give any court or legal notice to your advocate on the day you receive it.",
      "Follow your advocate’s advice on dates, fees and stamp duty.",
      "Keep proof of every payment and communication: bank records, letters, messages.",
      "Keep a dated note of events and the names of witnesses.",
      "Tell your advocate if your address, phone or e-mail changes.",
      "Consider lawful settlement through negotiation, mediation or Lok Adalat when advised."
    ];
    const DN = [
      "Do not destroy, change or hide any document or message.",
      "Do not threaten, pressure or pay any witness or the other side.",
      "Do not sign blank papers or papers you have not read.",
      "Do not discuss the case on social media or with the press.",
      "Do not take the law into your own hands: no force, no forcible possession.",
      "Do not give false facts or false documents to the court. It can lead to prosecution and can lose the case.",
      "Do not miss deadlines. Limitation periods can end your right to sue or appeal.",
      "Do not pay anyone who claims to “fix” the case."
    ];
    const CD = [
      "Authorise one officer by board resolution to sign pleadings, vakalat and affidavits.",
      "Once a dispute begins, preserve minutes, registers, accounts, contracts, e-mails and backups.",
      "File statutory returns, financial statements and tax returns on time.",
      "Tell your advocate of every pending tax, regulatory, labour or insolvency matter.",
      "Route all communication on the dispute through one named officer.",
      "Have contracts reviewed by your advocate before signing."
    ];
    const CN = [
      "Do not let directors or staff speak to the other side or the press about the dispute.",
      "Do not delete e-mails, accounting data or backups.",
      "Do not sign for the company without board authority.",
      "Do not make false statements in any filing or disclosure.",
      "Do not transfer or burden disputed assets without advice."
    ];
    const PU = [
      "If the company is listed, make the disclosures that SEBI rules and stock exchange requirements demand, including material litigation.",
      "If the company is listed, do not trade on unpublished price-sensitive information.",
      "Hold board and committee meetings as the law requires and minute them."
    ];
    if ($("sheet")) {
      $("sheet").innerHTML = "<h3>CLIENT INSTRUCTIONS – " + esc(t.toUpperCase()) + "</h3><p><b>Client:</b> " + (esc($("client")?.value) || "__________") + "<br><b>Date:</b> " + new Date().toLocaleDateString("en-GB") + "</p><p><b>What you should do</b></p>" + L(DO.concat(co ? CD : []).concat(t === "Public limited company" ? PU : [])) + "<p><b>What you should not do</b></p>" + L(DN.concat(co ? CN : [])) + "<p><i>This is general guidance. Advice on your own facts is given only in consultation with Advocate Thangaraju.</i></p><p class='r'>" + advBlock() + "</p>";
    }
    style();
  });

  $("spset")?.addEventListener("click", () => {
    const v = $("spw")?.value;
    if (!v || v.length < 6) {
      if ($("slog")) $("slog").innerHTML = "Use 6 or more characters.";
      return;
    }
    const sl = String(Math.random()).slice(2) + Date.now();
    hs(sl + v).then(h => {
      LP = { s: sl, h };
      try { localStorage.setItem("dilp", JSON.stringify(LP)); } catch (e) {}
      if ($("spw")) $("spw").value = "";
      logev("Passcode set");
    });
  });

  $("splock")?.addEventListener("click", lock);

  $("spoff")?.addEventListener("click", () => {
    if (!LP) return;
    hs(LP.s + $("spw")?.value).then(h => {
      if (h === LP.h) {
        LP = null;
        try { localStorage.removeItem("dilp"); } catch (e) {}
        if ($("spw")) $("spw").value = "";
        logev("Passcode removed");
      } else {
        if ($("slog")) $("slog").innerHTML = "Enter the current passcode in the box first.";
        logev("Failed passcode removal");
      }
    });
  });

  $("sclear")?.addEventListener("click", () => {
    if (confirm("Delete all saved cases, lists and settings from this browser?")) {
      try {
        ["dil1", "dil2", "dil3", "dil4", "dil5", "dill", "dilp"].forEach(k => {
          localStorage.removeItem(k);
        });
      } catch (e) {}
      location.reload();
    }
  });

  $("lku")?.addEventListener("click", () => {
    if (!LP) return;
    hs(LP.s + $("lkp")?.value).then(h => {
      if (h === LP.h) {
        if ($("lk")) $("lk").style.display = "none";
        if ($("lkm")) $("lkm").textContent = "";
        logev("Unlocked");
      } else {
        if ($("lkm")) $("lkm").textContent = "Wrong passcode.";
        logev("Failed unlock attempt");
      }
    });
  });

  $("lkp")?.addEventListener("keydown", e => {
    if (e.key === "Enter") $("lku")?.click();
  });

  $("db_save")?.addEventListener("click", async () => {
    const title = prompt("Enter a name/title for this draft:", $("client")?.value || "Case Draft");
    if (!title) return;
    const draftData = {
      title,
      ftype: $("ftype")?.value,
      court: $("court")?.value,
      client: $("client")?.value,
      place: $("place")?.value,
      cno: $("cno")?.value,
      p1: $("p1")?.value,
      p2: $("p2")?.value,
      val: $("val")?.value,
      fee: $("fee")?.value,
      jur: $("jur")?.value,
      facts: $("facts")?.value,
      grounds: $("grounds")?.value,
      prayer: $("prayer")?.value,
      S: JSON.parse(JSON.stringify(S)),
      html: $("sheet")?.innerHTML || "",
      updatedAt: new Date().toISOString()
    };
    try {
      const id = await putItem("drafts", draftData);
      alert(`Draft saved to IndexedDB (ID: ${id})!`);
    } catch (e) {
      alert("Failed to save draft to IndexedDB: " + e.message);
    }
  });

  $("db_load")?.addEventListener("click", async () => {
    try {
      const drafts = await getAllItems("drafts");
      if (!drafts.length) {
        alert("No drafts found in IndexedDB.");
        return;
      }
      const choices = drafts.map((d, i) => `${i + 1}: ${d.title} (${d.ftype || 'Draft'}, ${new Date(d.updatedAt).toLocaleDateString()})`).join("\n");
      const chosen = prompt("Select draft number to load:\n" + choices);
      const idx = parseInt(chosen, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= drafts.length) return;
      const d = drafts[idx];
      if (d.ftype && $("ftype")) $("ftype").value = d.ftype;
      if (d.court && $("court")) $("court").value = d.court;
      if (d.client && $("client")) $("client").value = d.client;
      if (d.place && $("place")) $("place").value = d.place;
      if (d.cno && $("cno")) $("cno").value = d.cno;
      if (d.p1 && $("p1")) $("p1").value = d.p1;
      if (d.p2 && $("p2")) $("p2").value = d.p2;
      if (d.val && $("val")) $("val").value = d.val;
      if (d.fee && $("fee")) $("fee").value = d.fee;
      if (d.jur && $("jur")) $("jur").value = d.jur;
      if (d.facts && $("facts")) $("facts").value = d.facts;
      if (d.grounds && $("grounds")) $("grounds").value = d.grounds;
      if (d.prayer && $("prayer")) $("prayer").value = d.prayer;
      if (d.S) {
        S.docs = d.S.docs || S.docs;
        S.laws = d.S.laws || S.laws;
        S.secs = d.S.secs || S.secs;
        S.advs = d.S.advs || S.advs;
        render();
      }
      if (d.html && $("sheet")) $("sheet").innerHTML = d.html;
      style();
      save();
      alert(`Loaded draft: ${d.title}`);
    } catch (e) {
      alert("Failed to load drafts: " + e.message);
    }
  });

  $("btn_export_diligent")?.addEventListener("click", async () => {
    const pw = prompt("Enter passcode to encrypt this backup file:");
    if (!pw || pw.length < 6) {
      alert("Passcode must be at least 6 characters.");
      return;
    }
    try {
      const blob = await exportEncryptedBackup(pw);
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = `Diligent-Backup-${new Date().toISOString().slice(0, 10)}.diligent`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      alert("Encrypted .diligent backup saved to Downloads!");
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  });

  $("btn_import_trigger")?.addEventListener("click", () => {
    $("inp_import_diligent")?.click();
  });

  $("inp_import_diligent")?.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;
    const pw = prompt("Enter passcode to decrypt this backup file:");
    if (!pw) return;
    try {
      const result = await importEncryptedBackup(file, pw);
      alert(`Restored ${result.draftsCount} drafts, ${result.receiptsCount} receipts, and ${result.casesCount || 0} cases into IndexedDB!`);
      location.reload();
    } catch (e) {
      alert("Import failed: Incorrect passcode or corrupt file. " + e.message);
    }
    this.value = "";
  });

  $("btn_lan_sync")?.addEventListener("click", async () => {
    const url = $("sync_url")?.value.trim() || "http://localhost:8080";
    const pw = prompt("Enter office passcode to encrypt LAN sync bundle:");
    if (!pw || pw.length < 6) {
      alert("Passcode must be at least 6 characters.");
      return;
    }
    const msgEl = $("sync_msg");
    if (msgEl) msgEl.textContent = "Syncing with office server...";
    try {
      const res = await syncWithLanServer(url, pw);
      if (msgEl) msgEl.textContent = `Sync successful (${res.status})!`;
    } catch (e) {
      if (msgEl) msgEl.textContent = "Sync error: " + e.message;
    }
  });

  document.addEventListener("selectionchange", () => {
    if (inSh()) {
      LR = getSelection().getRangeAt(0).cloneRange();
      wst();
    }
  });

  const sh = SH();
  if (sh) {
    sh.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      const AL = { l: "justifyLeft", e: "justifyCenter", r: "justifyRight", j: "justifyFull" };
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && AL[k]) {
        e.preventDefault();
        document.execCommand(AL[k]);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const s = getSelection();
        const n = s.anchorNode;
        const el = n && (n.nodeType === 1 ? n : n.parentNode);
        if (el && el.closest("li")) {
          document.execCommand(e.shiftKey ? "outdent" : "indent");
          return;
        }
        const c = el && el.closest("td,th");
        if (c) {
          const t = e.shiftKey ? c.previousElementSibling : c.nextElementSibling;
          if (t) {
            const r = document.createRange();
            r.selectNodeContents(t);
            r.collapse(true);
            s.removeAllRanges();
            s.addRange(r);
          }
          return;
        }
        document.execCommand("insertText", false, "   ");
      }
    });

    sh.addEventListener("keyup", e => {
      if (e.key === " " || e.key === "Enter") {
        const text = sh.innerHTML;
        const expanded = expandSnippets(text, {
          place: $("place")?.value || "Chennai",
          date: new Date().toLocaleDateString("en-GB")
        });
        if (expanded !== text) {
          sh.innerHTML = expanded;
        }
      }
    });

    sh.addEventListener("dblclick", e => {
      if (e.target.classList && e.target.classList.contains("pb")) e.target.remove();
    });

    sh.addEventListener("input", wcount);
    new MutationObserver(() => {
      clearTimeout(WT);
      WT = setTimeout(wcount, 300);
    }).observe(sh, { childList: true, subtree: true, characterData: true });
  }

  function tick() {
    const d = new Date();
    const clk = $("clk");
    if (clk) {
      clk.innerHTML = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + "<br>" + d.toLocaleTimeString("en-GB");
    }
  }
  tick();
  setInterval(tick, 1000);

  window.addEventListener("beforeprint", style);
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("proof", "psel");
    const ps = $("psel");
    if (ps) ps.innerHTML = "";
    if (SCR()) SCR().style.zoom = ($("w_zoom")?.value / 100) || "";
  });
  window.addEventListener("resize", prh);

  ["mousemove", "keydown", "click", "touchstart"].forEach(ev => {
    document.addEventListener(ev, idle, true);
  });

  rlg();
  lgs();
  idle();
  if (LP) lock();
  sr();
  gen();
});
