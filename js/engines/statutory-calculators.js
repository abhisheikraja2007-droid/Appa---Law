export function calculateNI138Timeline(memoDateStr, dispatchDateStr, receiptDateStr) {
  if (!memoDateStr) return null;

  const memoDate = new Date(memoDateStr);
  const noticeDeadline = new Date(memoDate);
  noticeDeadline.setDate(noticeDeadline.getDate() + 30);

  let dispatchValid = null;
  let dispatchDate = null;
  if (dispatchDateStr) {
    dispatchDate = new Date(dispatchDateStr);
    dispatchValid = dispatchDate <= noticeDeadline;
  }

  let curePeriodEnd = null;
  let causeOfAction = null;
  let filingDeadline = null;

  if (receiptDateStr) {
    const receiptDate = new Date(receiptDateStr);
    curePeriodEnd = new Date(receiptDate);
    curePeriodEnd.setDate(curePeriodEnd.getDate() + 15);

    causeOfAction = new Date(curePeriodEnd);
    causeOfAction.setDate(causeOfAction.getDate() + 1);

    filingDeadline = new Date(causeOfAction);
    filingDeadline.setMonth(filingDeadline.getMonth() + 1);
  }

  return {
    memoDate: memoDate.toLocaleDateString("en-GB"),
    noticeDeadline: noticeDeadline.toLocaleDateString("en-GB"),
    dispatchValid,
    curePeriodEnd: curePeriodEnd ? curePeriodEnd.toLocaleDateString("en-GB") : "Pending receipt date",
    causeOfAction: causeOfAction ? causeOfAction.toLocaleDateString("en-GB") : "Pending receipt date",
    filingDeadline: filingDeadline ? filingDeadline.toLocaleDateString("en-GB") : "Pending receipt date",
    summary: [
      `Cheque return memo: ${memoDate.toLocaleDateString("en-GB")}`,
      `Statutory demand notice must be dispatched on or before: ${noticeDeadline.toLocaleDateString("en-GB")} (30 days)`,
      curePeriodEnd ? `15-day statutory payment cure period expires on: ${curePeriodEnd.toLocaleDateString("en-GB")}` : "",
      causeOfAction ? `Cause of action for filing complaint arises on: ${causeOfAction.toLocaleDateString("en-GB")}` : "",
      filingDeadline ? `Last date to file criminal complaint before Magistrate: ${filingDeadline.toLocaleDateString("en-GB")} (1 month window)` : ""
    ].filter(Boolean)
  };
}

export function calculateTnCourtFees(suitType, valuation) {
  const val = parseFloat(String(valuation).replace(/[^0-9.]/g, "")) || 0;
  if (val <= 0) return { courtFee: 0, formula: "No valuation provided", advocatesWelfare: 100 };

  let courtFee = 0;
  let formula = "";

  if (suitType === "money") {
    if (val <= 100000) {
      courtFee = val * 0.03;
      formula = "3% on Rs. " + val.toLocaleString("en-IN");
    } else if (val <= 500000) {
      courtFee = 3000 + (val - 100000) * 0.05;
      formula = "Rs. 3,000 + 5% on excess above Rs. 1,00,000";
    } else if (val <= 1000000) {
      courtFee = 23000 + (val - 500000) * 0.07;
      formula = "Rs. 23,000 + 7% on excess above Rs. 5,00,000";
    } else {
      courtFee = 58000 + (val - 1000000) * 0.075;
      formula = "Rs. 58,000 + 7.5% on excess above Rs. 10,00,000";
    }
  } else if (suitType === "partition_joint") {
    courtFee = val > 1000000 ? 5000 : 1000;
    formula = "Fixed fee under Section 37(2) TNCF Act (Joint possession): Rs. " + courtFee;
  } else if (suitType === "partition_separate") {
    courtFee = (val * 0.5) * 0.03;
    formula = "Ad-valorem on plaintiff's share under Section 37(1) TNCF Act";
  } else if (suitType === "declaration") {
    courtFee = val * 0.03;
    formula = "3% on market value under Section 25(a)/(b) TNCF Act";
  } else if (suitType === "injunction") {
    courtFee = Math.max(1000, val * 0.01);
    formula = "Valuation under Section 27 TNCF Act (Min Rs. 1,000)";
  }

  const roundedFee = Math.ceil(courtFee);
  const advocatesWelfare = 100;
  const totalPayable = roundedFee + advocatesWelfare;

  return {
    courtFee: roundedFee,
    formula,
    advocatesWelfare,
    totalPayable
  };
}

export const LIMITATION_PERIODS = [
  { subject: "Money recovery / breach of contract", period: "3 Years", startingPoint: "Date of breach or when money becomes due (Art. 19/55)", act: "Limitation Act, 1963" },
  { subject: "Specific performance of contract", period: "3 Years", startingPoint: "Date fixed for performance, or notice of refusal (Art. 54)", act: "Limitation Act, 1963" },
  { subject: "Declaration of title or rights", period: "3 Years", startingPoint: "When right to sue first accrues (Art. 58)", act: "Limitation Act, 1963" },
  { subject: "Cancellation of deed or instrument", period: "3 Years", startingPoint: "When facts entitling cancellation become known (Art. 59)", act: "Limitation Act, 1963" },
  { subject: "Possession based on prior title", period: "12 Years", startingPoint: "When defendant's possession becomes adverse (Art. 65)", act: "Limitation Act, 1963" },
  { subject: "Redemption of mortgage", period: "30 Years", startingPoint: "When right to redeem or recover possession accrues (Art. 61)", act: "Limitation Act, 1963" },
  { subject: "Appeal to High Court (Civil/Criminal)", period: "90 Days", startingPoint: "Date of decree, sentence, or order (Art. 116(a))", act: "Limitation Act, 1963" },
  { subject: "Appeal to District Court", period: "30 Days", startingPoint: "Date of decree or order (Art. 116(b))", act: "Limitation Act, 1963" },
  { subject: "Execution of civil decree", period: "12 Years", startingPoint: "When decree or order becomes enforceable (Art. 136)", act: "Limitation Act, 1963" },
  { subject: "Cheque Dishonour Complaint (NI Act)", period: "1 Month", startingPoint: "Day following expiry of 15-day statutory notice (Sec. 142 NI Act)", act: "NI Act, 1881" }
];

