import { generateUpiUri, renderUpiQrSvg } from '../js/engines/upi-qr.js';

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

// 1. UPI URI Generation Test
const upiUri = generateUpiUri("thangaraju@oksbi", "Advocate Thangaraju", 25000, "Receipt R-0012/2026");
assert(upiUri.includes("pa=thangaraju%40oksbi") || upiUri.includes("pa=thangaraju@oksbi"), "Payee address should be included");
assert(upiUri.includes("am=25000.00"), "Amount should be formatted to 2 decimals");
assert(upiUri.includes("cu=INR"), "Currency should be INR");

// 2. UPI QR Code SVG Matrix Render Test
const svg = renderUpiQrSvg("thangaraju@oksbi", "Advocate Thangaraju", 25000, "Fees", 160);
assert(svg.startsWith("<svg"), "Output should be an SVG element");
assert(svg.includes("viewBox=\"0 0 160 160\""), "ViewBox dimensions should match specified pixel size");
assert(svg.includes("<rect"), "SVG should contain encoded QR module rects");

console.log(`UPI & Ledger Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

