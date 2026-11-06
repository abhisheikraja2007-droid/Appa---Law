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

// 1. Test PBKDF2 + AES-GCM Key Derivation and Encryption/Decryption
async function testCrypto() {
  const passcode = "OfficeSecret123!";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sampleData = JSON.stringify({ case: "WP 1024/2026", client: "Thangaraju" });

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(sampleData)
  );

  assert(cipher.byteLength > 0, "Ciphertext should be produced");

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );

  const dec = new TextDecoder();
  const decryptedText = dec.decode(decrypted);
  assert(decryptedText === sampleData, "Decrypted text should match original plaintext");

  // Incorrect passcode should fail
  let decryptFailed = false;
  try {
    const wrongKeyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode("WrongPasscode!"),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    const wrongKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      wrongKeyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrongKey, cipher);
  } catch (e) {
    decryptFailed = true;
  }
  assert(decryptFailed, "Decryption with incorrect passcode must fail");
}

await testCrypto();
console.log(`Crypto & Storage Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
