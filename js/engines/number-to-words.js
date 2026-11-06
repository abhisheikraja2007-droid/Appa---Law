export function numberToWords(n) {
  const o = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const t = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  
  function b(x) {
    return x < 20 ? o[x] : t[Math.floor(x / 10)] + (x % 10 ? " " + o[x % 10] : "");
  }
  
  function c(x) {
    return x > 99 ? o[Math.floor(x / 100)] + " hundred" + (x % 100 ? " " + b(x % 100) : "") : b(x);
  }
  
  n = Math.floor(n);
  if (!n) return "zero";
  
  const r = [];
  const scales = [[1e7, "crore"], [1e5, "lakh"], [1e3, "thousand"]];
  
  scales.forEach(([q, label]) => {
    if (n >= q) {
      r.push(c(Math.floor(n / q)) + " " + label);
      n %= q;
    }
  });
  
  if (n) r.push(c(n));
  return r.join(" ");
}

