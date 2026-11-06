import { calculateNI138Timeline, calculateTnCourtFees, LIMITATION_PERIODS } from '../js/engines/statutory-calculators.js';
import { formatDualCitation, searchCriminalCodes } from '../js/data/criminal-codes-2024.js';
import { generateEfilingIndex } from '../js/engines/efiling-index.js';
import { expandSnippets } from '../js/engines/voice-dictation.js';

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

// 1. NI Act Section 138 Timeline Test
const niRes = calculateNI138Timeline("2026-03-01", "2026-03-15", "2026-03-18");
assert(niRes !== null, "NI 138 result should not be null");
assert(niRes.dispatchValid === true, "Dispatch within 30 days should be valid");
assert(niRes.memoDate.includes("01/03/2026") || niRes.memoDate.includes("1/3/2026"), "Memo date should match");
assert(niRes.noticeDeadline.includes("31/03/2026"), "30-day notice deadline should be March 31");

// 2. TNCF Court Fee Calculator Test
const cfMoney1 = calculateTnCourtFees("money", 50000);
assert(cfMoney1.courtFee === 1500, "50k money suit should have 3% fee (1500)");
assert(cfMoney1.totalPayable === 1600, "Total payable should include Rs. 100 welfare stamp");

const cfMoney2 = calculateTnCourtFees("money", 200000);
// 100k @ 3% = 3000, remaining 100k @ 5% = 5000 -> 8000
assert(cfMoney2.courtFee === 8000, "200k money suit should calculate correctly (8000)");

const cfPartitionJoint = calculateTnCourtFees("partition_joint", 500000);
assert(cfPartitionJoint.courtFee === 1000, "Joint partition suit should be fixed Rs. 1000");

// 3. Criminal Law Dual-Citation Mapper Test
const found420 = searchCriminalCodes("420");
assert(found420.length > 0, "Searching 420 should return IPC 420");
const citation420 = formatDualCitation(found420[0], true);
assert(citation420.includes("318(4) of the Bharatiya Nyaya Sanhita, 2023"), "BNS section should be formatted");
assert(citation420.includes("420 of the Indian Penal Code, 1860"), "IPC section should be referenced");

const found438 = searchCriminalCodes("438");
assert(found438.length > 0, "Searching 438 should return CrPC 438");
const citation438 = formatDualCitation(found438[0], true);
assert(citation438.includes("482 of the Bharatiya Nagarik Suraksha Sanhita, 2023"), "BNSS section should be formatted");

// 4. e-Filing Index Cumulative Page Range Test
const indexResult = generateEfilingIndex([
  { title: "Synopsis", pages: 2 },
  { title: "Main Petition", pages: 10 },
  { title: "Vakalatnama", pages: 2 }
]);
assert(indexResult.totalPages === 14, "Total pages should be 14");
assert(indexResult.items[0].pageRange === "1 – 2", "Item 1 range should be 1-2");
assert(indexResult.items[1].pageRange === "3 – 12", "Item 2 range should be 3-12");
assert(indexResult.items[2].pageRange === "13 – 14", "Item 3 range should be 13-14");

// 5. Voice Snippet Expansion Test
const expanded = expandSnippets("Here is the prayer: /prayer", { place: "Madurai" });
assert(expanded.includes("It is therefore most humbly prayed"), "Shortcode /prayer should expand");
assert(!expanded.includes("/prayer"), "Original token should be replaced");

console.log(`Calculators & Mapping Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

