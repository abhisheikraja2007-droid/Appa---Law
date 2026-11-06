export function validateDraft({
  place = "",
  p1 = "",
  p2 = "",
  client = "",
  facts = [],
  prayer = [],
  grounds = [],
  docs = [],
  laws = [],
  advs = [],
  ftype = "",
  val = "",
  fee = "",
  jur = "",
  factsRaw = "",
  sheetText = ""
}) {
  const issues = [];
  const check = (condition, msg) => {
    if (condition) issues.push(msg);
  };

  check(!place.trim(), "Place is blank.");
  check(!p1.trim() || !p2.trim(), "Parties are incomplete.");
  check(!client.trim(), "Your client is not stated.");
  check(!facts.length, "No facts entered.");
  check(!prayer.length, "No prayer entered.");
  check(!grounds.length, "No grounds entered.");
  check(!docs.some(x => x.t && x.t.trim()), "No documents listed.");
  check(laws.some(x => x.c && x.c.trim() && (!x.p || !x.p.trim())), "A case law has no paragraph number.");
  check(advs.some(x => x.n && x.n.trim() && (!x.e || !x.e.trim())), "An advocate has no enrolment number.");
  check(/Plaint|Execution|Complaint/.test(ftype) && (!val || !fee), "Valuation or court fee is blank.");
  check(!jur.trim(), "Jurisdiction basis is blank.");
  check(/\s{2,}\S/.test(factsRaw), "Facts have double spaces. Use Tidy facts.");
  check(/undefined|NaN/.test(sheetText), "The draft contains an error word (undefined or NaN).");
  check(!sheetText.trim(), "The draft is empty. Click Generate draft.");

  return {
    isValid: issues.length === 0,
    issues: issues
  };
}

