# Diligent in Law – Advocate Thangarajus

An offline-first, zero-cloud Indian Legal Chamber Management Workstation and Drafting Suite designed for advocates, senior counsel, and junior associates.

---

## Key Features

1. **Modular Legal Drafting Suite**
   - High-contrast dark theme (#0B0F17 / #111827 / #06B6D4).
   - Strict Indian Legal paper rules (216x356mm Legal & A4, 38mm left binding margin, double spacing).
   - Presets for High Court of Judicature at Madras and Coimbatore District Courts.
   - 12 major Indian regional languages with local font cascades.

2. **2024 New Criminal Laws Engine (BNS / BNSS / BSA)**
   - Real-time statutory mapping from IPC, CrPC, and Indian Evidence Act to Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA).
   - Dual-citation generator for transitional pleadings.

3. **Statutory Calculators**
   - **Section 138 NI Act Timeline Calculator:** Calculates 30-day notice, 15-day grace period, cause of action date, and Section 142(1)(b) filing deadlines.
   - **TNCF Act 1955 Ad-Valorem Calculator:** Tamil Nadu Court-Fees and Suits Valuation Act rates for money suits, partition, and injunctions.

4. **Digital Case Diary & Daily Cause List**
   - 16-character alphanumeric e-Courts CNR validation.
   - Daily cause list grouping by court complex and hall.
   - One-click WhatsApp hearing notice templates for clients.

5. **Chamber Fee Ledger & Dynamic UPI QR**
   - Client case ledger tracking agreed fees, advances, expenses (stamp duty, batta, clerkage), and dues.
   - Zero-dependency client-side SVG QR matrix generator encoding `upi://pay` strings for instant fee collection on receipts.

6. **E-Filing Indexer & Document Dispatch**
   - High Court & District Court v3.0 cumulative page index calculation.
   - Native client-side OpenXML `.docx` generator and binary PDF-1.4 generator.
   - Native Web Share API integration.

7. **Voice Dictation**
   - Web Speech API integration for Indian English (`en-IN`) and Tamil (`ta-IN`).
   - Legal shortcode expansion (`/verify`, `/prayer`, `/affidavit`, `/bail`, `/inj`).

8. **Offline-First Security & Encrypted Backup**
   - Client-side IndexedDB persistence across 6 stores.
   - AES-GCM 256-bit PBKDF2 encrypted `.diligent` manual export and restore.
   - Zero external cloud dependencies.
   - Progressive Web App (PWA) with Service Worker offline caching.

9. **Zero-Cloud Office LAN Sync**
   - Python HTTP + Sync server on port 8080.
   - P2P local network synchronization between senior advocate and junior associates.

---

## Quick Start

### 1. Launch Server
Double-click `start-office.bat` or run:
```powershell
python sync_server.py
```
Access the workstation in Chrome or Edge at:
```
http://localhost:8080
```

### 2. Run Test Suite
```powershell
node tests/engines.test.js
node tests/encryption.test.js
node tests/calculators.test.js
node tests/ledger.test.js
```

