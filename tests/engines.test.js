import { numberToWords } from '../js/engines/number-to-words.js';
import { suggestCourt } from '../js/engines/court-suggester.js';
import { validateDraft } from '../js/engines/validator.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${testName}`);
  }
}

// 1. Test numberToWords (Indian format)
assert(numberToWords(0) === "zero", "0 should be zero");
assert(numberToWords(25) === "twenty five", "25 should be twenty five");
assert(numberToWords(1000) === "one thousand", "1000 should be one thousand");
assert(numberToWords(150000) === "one lakh fifty thousand", "150000 should be one lakh fifty thousand");
assert(numberToWords(25000000) === "two crore fifty lakh", "25000000 should be two crore fifty lakh");

// 2. Test suggestCourt
const resCheque = suggestCourt({ facts: "dishonour of cheque under section 138" });
assert(resCheque.court === "Magistrate Court", "Cheque dishonour should suggest Magistrate Court");

const resSenior = suggestCourt({ facts: "senior citizen maintenance tribunal" });
assert(resSenior.court === "Tribunal", "Senior citizen should suggest Tribunal");

const resCivil = suggestCourt({ val: 50000, lim1: 100000, lim2: 500000 });
assert(resCivil.court === "Munsif / Civil Judge (Junior Division)", "Civil suit within lim1 should suggest Munsif");

// 3. Test validateDraft
const emptyValidation = validateDraft({});
assert(!emptyValidation.isValid, "Empty draft should be invalid");
assert(emptyValidation.issues.length > 0, "Empty draft should have multiple issues reported");

const validValidation = validateDraft({
  place: "Madurai",
  p1: "Plaintiff Name",
  p2: "Defendant Name",
  client: "Plaintiff",
  facts: ["Fact 1", "Fact 2"],
  prayer: ["Prayer A"],
  grounds: ["Ground A"],
  docs: [{ t: "Sale deed" }],
  laws: [{ c: "Citation", p: "12" }],
  advs: [{ n: "Thangaraju", e: "MS/123/2020" }],
  ftype: "Plaint",
  val: "50000",
  fee: "1500",
  jur: "Pecuniary and territorial",
  factsRaw: "Fact 1. Fact 2.",
  sheetText: "Draft content..."
});
assert(validValidation.isValid, "Complete draft should be valid");

console.log(`Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

