export function suggestCourt({ facts = "", grounds = "", prayer = "", p1 = "", p2 = "", ftype = "", val = 0, lim1 = 0, lim2 = 0 }) {
  const f = [facts, grounds, prayer, p1, p2].join(" ").toLowerCase();
  const v = parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
  const j = parseFloat(String(lim1).replace(/[^0-9.]/g, "")) || 0;
  const k = parseFloat(String(lim2).replace(/[^0-9.]/g, "")) || 0;
  const has = r => r.test(f);

  let c = "";
  const why = [];
  let note = "";

  if (ftype === "Special Leave Petition") {
    c = "Supreme Court of India";
    why.push("An SLP lies to the Supreme Court under Article 136.");
  } else if (ftype === "Writ Petition") {
    c = "High Court";
    why.push("A writ against a State authority lies to the High Court under Article 226. The Supreme Court is approached under Article 32 only for direct enforcement of fundamental rights.");
  } else if (has(/senior citizen|maintenance tribunal|welfare of parents/)) {
    c = "Tribunal";
    why.push("Applications under the Maintenance and Welfare of Parents and Senior Citizens Act, 2007 go to the Maintenance Tribunal, with appeal to the Appellate Tribunal. A High Court writ lies against their orders.");
  } else if (has(/consumer|deficiency in service|defective goods|unfair trade/)) {
    c = "Consumer Commission";
    why.push("Consumer disputes go to the District, State or National Commission according to the value of the goods or services paid for. Check the current Jurisdiction Rules for the limits.");
  } else if (has(/divorce|conjugal|custody|guardianship|maintenance of (the )?wife|matrimonial/)) {
    c = "Family Court";
    why.push("Matrimonial, custody and related disputes go to the Family Court under the Family Courts Act, 1984.");
  } else if (has(/cheque|section 138|dishonour/)) {
    c = "Magistrate Court";
    why.push("A cheque dishonour complaint under Section 138 of the Negotiable Instruments Act, 1881 goes to the Magistrate. Under Section 142(2) the court where the payee holds the account has jurisdiction.");
  } else if (has(/oppression|mismanagement|insolvency|winding up|nclt/)) {
    c = "Tribunal";
    why.push("Company law and insolvency matters go to the National Company Law Tribunal.");
  } else if (has(/industrial dispute|wrongful termination|workman/)) {
    c = "Tribunal";
    why.push("Industrial disputes go to the Labour Court or Industrial Tribunal.");
  } else if (ftype === "Bail Application" && has(/murder|rape|dowry death|culpable homicide/)) {
    c = "Sessions Court";
    why.push("Offences triable by the Court of Session need bail from the Sessions Court or the High Court.");
  } else if (ftype === "Bail Application" || ftype === "Complaint") {
    c = "Magistrate Court";
    why.push("Complaints and bail for offences triable by a Magistrate go to the Magistrate.");
  } else if (ftype === "Appeal" || ftype === "Revision Petition") {
    c = "Additional District Court";
    why.push("The appellate court depends on the court that passed the order. An appeal from a Munsif or Sub-Court decree usually goes to the District Court, and from a District Court decree to the High Court. Select the court by the order appealed against.");
  } else {
    if (v && j && v <= j) {
      c = "Munsif / Civil Judge (Junior Division)";
    } else if (v && k && v <= k) {
      c = "Sub-Court / Civil Judge (Senior Division)";
    } else if (v && j && k) {
      c = "Principal District Court";
    } else {
      c = "Sub-Court / Civil Judge (Senior Division)";
      note = " Enter the claim value and your State’s court limits in section 2 for a firmer suggestion.";
    }
    why.push("For a civil suit the court depends on the claim value and the State’s pecuniary limits, which differ from State to State." + note);
  }

  if (has(/property|land|plot|house|partition|possession|gift deed|sale deed|settlement deed|eviction/)) {
    why.push("For immovable property the suit lies where the property is situated (Section 16, Code of Civil Procedure).");
  } else {
    why.push("Otherwise the suit lies where the defendant lives or works for gain, or where the cause of action arose (Sections 19 and 20, Code of Civil Procedure).");
  }

  if (has(/tenant|landlord|rent control/)) {
    why.push("Rent and eviction cases may lie before the Rent Controller or Small Causes Court under the State rent law. Check the State Act.");
  }

  return {
    court: c,
    rationale: why,
    summary: why.join(" ")
  };
}

