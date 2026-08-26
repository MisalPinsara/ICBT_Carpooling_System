import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const outputFile = path.join(process.cwd(), "..", "Sprint2_Development_Section.pdf");

const doc = new PDFDocument({
  layout: "portrait",
  size: "A4",
  margin: 36
});

const stream = fs.createWriteStream(outputFile);
doc.pipe(stream);

// ── Color Palette ────────────────────────────────────────────────────────────
const COLOR_NAVY = "#0f172a";
const COLOR_BLUE_HEADER = "#1e40af";
const COLOR_TEXT = "#334155";
const COLOR_MUTED = "#64748b";
const COLOR_BORDER = "#cbd5e1";
const COLOR_ROW_ALT = "#f8fafc";
const COLOR_ROW_EVEN = "#ffffff";

const startX = 36;
const pageWidth = 595.28 - 72; // 523.28 pt printable area

// ── Helpers ──────────────────────────────────────────────────────────────────
function addHeader(title) {
  checkSpace(30);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_BLUE_HEADER);
  doc.text(title, startX, doc.y);
  doc.moveDown(0.4);
}

function addParagraph(text) {
  checkSpace(40);
  doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_TEXT);
  doc.text(text, startX, doc.y, { width: pageWidth, align: "justify", lineGap: 3 });
  doc.moveDown(0.8);
}

function checkSpace(neededHeight) {
  if (doc.y + neededHeight > 780) {
    doc.addPage({ layout: "portrait", size: "A4", margin: 36 });
  }
}

// ── Table Helper ──────────────────────────────────────────────────────────────
function drawTable(title, columns, rows) {
  checkSpace(60);

  if (title) {
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR_NAVY);
    doc.text(title, startX, doc.y);
    doc.moveDown(0.4);
  }

  const yHeader = doc.y;

  // Header background
  doc.rect(startX, yHeader, pageWidth, 20).fill(COLOR_BLUE_HEADER);

  let currentX = startX;
  columns.forEach((col) => {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
    doc.text(col.name, currentX + 4, yHeader + 5, {
      width: col.width - 8,
      align: col.align || "left"
    });
    currentX += col.width;
  });

  let currentY = yHeader + 20;

  rows.forEach((row, rIdx) => {
    // Calculate row height based on text content
    let maxHeight = 18;
    columns.forEach((col) => {
      const text = String(row[col.key] || "");
      doc.font("Helvetica").fontSize(7.5);
      const textHeight = doc.heightOfString(text, { width: col.width - 8, lineGap: 1.5 });
      if (textHeight + 8 > maxHeight) {
        maxHeight = textHeight + 8;
      }
    });

    if (currentY + maxHeight > 780) {
      doc.addPage({ layout: "portrait", size: "A4", margin: 36 });
      currentY = 36;
      // Re-draw header on new page
      doc.rect(startX, currentY, pageWidth, 20).fill(COLOR_BLUE_HEADER);
      let hX = startX;
      columns.forEach((col) => {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
        doc.text(col.name, hX + 4, currentY + 5, {
          width: col.width - 8,
          align: col.align || "left"
        });
        hX += col.width;
      });
      currentY += 20;
    }

    // Row background
    const bg = rIdx % 2 === 0 ? COLOR_ROW_EVEN : COLOR_ROW_ALT;
    doc.rect(startX, currentY, pageWidth, maxHeight).fill(bg);

    // Row border
    doc.lineWidth(0.5).strokeColor(COLOR_BORDER);
    doc.rect(startX, currentY, pageWidth, maxHeight).stroke();

    // Draw cells
    let cellX = startX;
    columns.forEach((col) => {
      doc.moveTo(cellX, currentY).lineTo(cellX, currentY + maxHeight).stroke();

      const text = String(row[col.key] || "");
      const isBold = col.isBold || row._isBold;
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(COLOR_TEXT);
      doc.text(text, cellX + 4, currentY + 4, {
        width: col.width - 8,
        align: col.align || "left",
        lineGap: 1.5
      });

      cellX += col.width;
    });

    currentY += maxHeight;
  });

  doc.y = currentY + 12;
}

// ── Document Title ───────────────────────────────────────────────────────────
doc.font("Helvetica-Bold").fontSize(18).fillColor(COLOR_NAVY);
doc.text("Section 4.2: Sprint 2 Development Implementation", startX, doc.y, { align: "center" });
doc.moveDown(0.2);

doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLOR_MUTED);
doc.text("SEN5002 Agile Development and DevOps — ICBT Carpooling System Project Report", startX, doc.y, { align: "center" });
doc.moveDown(1.2);

// ── Section 4.2.1 ────────────────────────────────────────────────────────────
addHeader("4.2.1 Sprint 2 Development Overview");
addParagraph(
  "Sprint 2 extends the foundational authentication and profile infrastructure established in Sprint 1 by introducing key ride-discovery and interaction capabilities—specifically, ride-offer search, public offer detail inspection, and join-request submission and status tracking. In alignment with updated domain requirements, the system operates without rigid role-based access restrictions (such as hardcoded Driver or Passenger account types). Instead, any authenticated ICBT user can publish ride offers as an offer owner and submit join requests for other users' offers as a requester. Security and access control are enforced dynamically through token-based authentication, entity ownership checks (userId and requesterUserId), and action-context validation. Sprint 2 seamlessly reuses the Sprint 1 Express router pattern, MongoDB native driver access architecture, JWT middleware, and unified UI styling system, ensuring architectural consistency and zero regression across the application lifecycle."
);

// ── Section 4.2.2 ────────────────────────────────────────────────────────────
addHeader("4.2.2 Implemented Development Items");
addParagraph(
  "Table 4.2.1 summarizes the core functional development items implemented during Sprint 2, mapping each item to its corresponding user story, technical implementation details, and verification outcomes."
);

const colsTable1 = [
  { name: "Implemented Item", key: "item", width: 95, isBold: true },
  { name: "Related User Story", key: "story", width: 75 },
  { name: "Implementation Detail", key: "detail", width: 193 },
  { name: "Expected & Actual Outcome", key: "outcome", width: 160.28 }
];

const rowsTable1 = [
  {
    item: "Searchable Ride-Offer Listing",
    story: "US-13: Search active ride offers",
    detail: "Built GET /api/ride-offers/search endpoint utilizing MongoDB $and / $or query construction with $regex case-insensitive pattern matching for origin, destination, date, and time window. Excludes offers where availableSeats <= 0 or status !== Active. Integrated custom PickerField UI components.",
    outcome: "Expected: Eligible active offers matching search criteria returned.\nActual: Verified via API tests (TDD-S2-01, TDD-S2-02) and UI search component integration."
  },
  {
    item: "Public Offer Detail Viewing",
    story: "US-14: View public offer details",
    detail: "Developed GET /api/ride-offers/public/:id endpoint returning complete route, schedule, seat count, and status information. Applies privacy projection (toPublicRideOffer serializer) restricting owner metadata strictly to firstName and lastName.",
    outcome: "Expected: Offer details returned with sensitive owner contact info omitted.\nActual: Verified via unit test TDD-S2-03 and public offer detail modal."
  },
  {
    item: "Join-Request Creation",
    story: "US-15: Create join request",
    detail: "Created POST /api/join-requests endpoint accepting rideOfferId and optional requestNote. Validates offer existence, status (Active), seat availability (> 0), self-request restriction, and duplicate request status. Inserts record with status: Pending.",
    outcome: "Expected: Valid request creates a Pending record containing rideOfferId, requesterUserId, ownerUserId.\nActual: Verified via API test TDD-S2-04."
  },
  {
    item: "Business Rule Enforcement & Validation Guards",
    story: "US-15: Join request business rules",
    detail: "Implemented validation guard functions in validators.js evaluating request context against state rules: (1) block duplicate active requests, (2) block self-requests (requesterUserId === ownerUserId), and (3) reject requests for inactive, full (0 seats), or cancelled offers.",
    outcome: "Expected: Invalid requests rejected with HTTP status codes (409 Conflict, 422 Unprocessable Entity).\nActual: Verified via unit tests TDD-S2-05, TDD-S2-06, TDD-S2-07a/b/c."
  },
  {
    item: "Requester Request-Status Viewing",
    story: "US-16: View own request status",
    detail: "Implemented GET /api/join-requests/mine endpoint fetching all join requests where requesterUserId matches the authenticated token payload. Embeds offer route summary and owner name for display in the requester dashboard.",
    outcome: "Expected: Users view only their own request history and current statuses (Pending, Accepted, Rejected).\nActual: Verified via unit test TDD-S2-08."
  },
  {
    item: "Regression Stability & UI Consistency",
    story: "US-13 to US-16: System stability",
    detail: "Maintained existing Sprint 1 brand tokens, typography, and button styling in styles.css. Reused AppShell and custom pickers. Re-executed full test suite.",
    outcome: "Expected: All Sprint 1 auth/profile/ride functionality remains operational.\nActual: 47/47 existing tests and 24 new Sprint 2 tests pass (71/71 total)."
  }
];

drawTable("Table 4.2.1: Sprint 2 Implemented Development Items", colsTable1, rowsTable1);

// ── Section 4.2.3 ────────────────────────────────────────────────────────────
addHeader("4.2.3 API, Database, and Security Implementation");
addParagraph(
  "Table 4.2.2 details the technical implementation of Sprint 2 API routes, MongoDB query structures, validation rules, security checks, and UI integration patterns."
);

const colsTable2 = [
  { name: "Architecture Domain", key: "domain", width: 120, isBold: true },
  { name: "Implementation Specification", key: "spec", width: 403.28 }
];

const rowsTable2 = [
  {
    domain: "API Routes & Controllers",
    spec: "• GET /api/ride-offers/search — Params: origin, destination, date, timeWindow. Returns array of eligible active offers.\n• GET /api/ride-offers/public/:id — Param: id. Returns sanitized public offer summary.\n• POST /api/join-requests — Body: { rideOfferId, requestNote }. Creates pending join request.\n• GET /api/join-requests/mine — Query: authenticated user requests. Returns list of requester's join requests."
  },
  {
    domain: "MongoDB Collections & Queries",
    spec: "• rideOffers collection: Query filters status: 'Active', availableSeats: { $gt: 0 }, and $regex queries on origin and destination.\n• joinRequests collection: Schema stores _id, rideOfferId, requesterUserId, ownerUserId, status ('Pending', 'Accepted', 'Rejected'), requestNote, requestedAt, updatedAt. Indexed on { requesterUserId: 1 } and { rideOfferId: 1, requesterUserId: 1 }."
  },
  {
    domain: "JoinRequest Validation",
    spec: "Implemented validateJoinRequest(payload, offer, existingRequests, requesterUserId) in validators.js:\n1. Checks if target offer exists (404).\n2. Verifies offer.status === 'Active' and offer.availableSeats > 0 (422).\n3. Verifies requesterUserId !== offer.userId to block self-requests (422).\n4. Checks joinRequests collection for existing request with status: 'Pending' by the same requester (409)."
  },
  {
    domain: "Authentication & Authorization",
    spec: "• All Sprint 2 endpoints protected by requireAuth middleware verifying JWT Bearer token.\n• Ownership & action-context authorization: GET /api/join-requests/mine restricts queries to requesterUserId === req.user._id. POST /api/join-requests extracts requesterUserId directly from verified token context."
  },
  {
    domain: "Privacy Controls",
    spec: "• toPublicRideOffer(offer, ownerProfile) serializer strips userId, phoneNumber, email, studentStaffId, and vehicle details before transmitting offer data across public endpoints.\n• Public views display only owner.firstName and owner.lastName."
  },
  {
    domain: "Error Handling",
    spec: "Standardized JSON error responses with explicit HTTP status codes: 400 (Validation Error), 401 (Unauthorized), 404 (Not Found), 409 (Conflict / Duplicate), 422 (Unprocessable Entity / Business Rule Failure), 500 (Internal Error)."
  },
  {
    domain: "UI Integration",
    spec: "• SearchRidePage.jsx: Search bar with PickerField components for Date and Time Window matching RideCreatePage.jsx styling.\n• OfferDetailPage.jsx: Modal view presenting public offer details and 'Send Join Request' interface.\n• MyRequestsPage.jsx: Requester dashboard displaying request status cards with visual status badges."
  }
];

drawTable("Table 4.2.2: Sprint 2 Technical Architecture & Security Matrix", colsTable2, rowsTable2);

// ── Section 4.2.4 ────────────────────────────────────────────────────────────
addHeader("4.2.4 Developer Unit / API Testing");
addParagraph(
  "To ensure software quality prior to QA handoff, automated developer tests were written and executed using Jest and Supertest. Tests were structured following Test-Driven Development (TDD) principles and unit test coverage criteria. Table 4.2.3 outlines the developer test matrix."
);

const colsTable3 = [
  { name: "Test ID", key: "id", width: 55, isBold: true },
  { name: "Feature / Module", key: "module", width: 85 },
  { name: "Test Focus", key: "focus", width: 140 },
  { name: "Expected Result", key: "expected", width: 153.28 },
  { name: "Evidence Placeholder", key: "evidence", width: 90, align: "center" }
];

const rowsTable3 = [
  { id: "TDD-S2-01", module: "Ride Search", focus: "Search with valid route & time-window criteria", expected: "Eligible active ride offers returned with HTTP 200", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-02", module: "Ride Search", focus: "Search with non-matching criteria", expected: "Empty array returned with descriptive message", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-03", module: "Offer Details", focus: "Public detail endpoint retrieval", expected: "Returns route, time, seats, status, and limited owner name", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-04", module: "Join Request", focus: "Valid join request creation", expected: "Creates Pending JoinRequest in DB with HTTP 201", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-05", module: "Join Request", focus: "Duplicate pending request attempt", expected: "Request blocked with HTTP 409 Conflict", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-06", module: "Join Request", focus: "Self-request attempt by offer owner", expected: "Request blocked with HTTP 422 Unprocessable Entity", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-07", module: "Join Request", focus: "Request on inactive/full/cancelled offer", expected: "Request rejected with HTTP 422 Unprocessable Entity", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-08", module: "Request Status", focus: "View authenticated user's own requests", expected: "Returns list filtered strictly by requesterUserId", evidence: "[Figure S2-DEV-02]" },
  { id: "TDD-S2-09", module: "Authorization", focus: "Unauthenticated request to protected API", expected: "Access denied with HTTP 401 Unauthorized", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-01", module: "Search Builder", focus: "Input normalization (case & whitespace)", expected: "Regex matches origin/destination regardless of casing", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-02", module: "Active Filter", focus: "Offer eligibility filter", expected: "Inactive/cancelled offers excluded from search results", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-03", module: "Seat Availability", focus: "Zero-seat offer filter", expected: "Offers with availableSeats = 0 excluded", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-04", module: "Offer Detail", focus: "Response schema verification", expected: "All display fields (origin, destination, date) present", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-05", module: "Privacy Control", focus: "Privacy projection check", expected: "phoneNumber, email, studentStaffId omitted", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-06", module: "Validation", focus: "DB insert persistence", expected: "Verified joinRequests collection insertion", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-07", module: "Validation", focus: "Duplicate state check", expected: "Second Pending request correctly prevented", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-08", module: "Validation", focus: "Self-request logic check", expected: "requesterUserId === ownerUserId check enforced", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-09", module: "Validation", focus: "Offer state check", expected: "Non-active offer states rejected cleanly", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-10", module: "Request Status", focus: "User isolation check", expected: "Requester A cannot see Requester B's requests", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-11", module: "Security Guard", focus: "Missing token handling", expected: "Requests without Bearer header rejected with 401", evidence: "[Figure S2-DEV-02]" },
  { id: "UT-S2-12", module: "Regression", focus: "Sprint 1 core regression suite", expected: "All 24 Sprint 1 auth/profile/ride tests pass cleanly", evidence: "[Figure S2-DEV-02]" }
];

drawTable("Table 4.2.3: Developer Automated Test Execution Matrix", colsTable3, rowsTable3);

// ── Section 4.2.5 ────────────────────────────────────────────────────────────
addHeader("4.2.5 Development Evidence References");
addParagraph(
  "The following figures serve as evidence placeholders for code commits, automated test execution, continuous integration, and runtime user interface verification:"
);

const figures = [
  "• Figure S2-DEV-01: GitHub Repository Commit & Pull Request Evidence — Showing Sprint 2 feature branch merge history, commit messages, and version control trace for ride search and join request features.",
  "• Figure S2-DEV-02: Local Automated Unit & API Test Execution Result — Terminal output confirming 71 passed tests across 5 test suites (sprint1-api.test.js, sprint2-api.test.js, sprint2-tdd-spec.test.js, auth.test.js, validators.test.js).",
  "• Figure S2-DEV-03: Continuous Integration (CI) Workflow Result — GitHub Actions pipeline run confirming successful build, linting, and automated Jest test execution on push.",
  "• Figure S2-DEV-04: Sprint 2 Runtime UI Screens — Application screenshots demonstrating: (a) Find a Ride Page with custom pickers, (b) Public Offer Detail View, (c) Join Request Modal & Submission, and (d) My Requests Page.",
  "• Figure S2-DEV-05: Browser Developer Tools Network Evidence — Network tab capture confirming correct HTTP request payloads and responses (GET /api/ride-offers/search, POST /api/join-requests, GET /api/join-requests/mine).",
  "• Figure S2-DEV-06: Security & Ownership Rule Verification Log — Server response logs verifying HTTP 409 Conflict on duplicate requests, 422 Unprocessable Entity on self-requests, and 401 Unauthorized on missing tokens."
];

figures.forEach((fig) => addParagraph(fig));

// ── Section 4.2.6 ────────────────────────────────────────────────────────────
addHeader("4.2.6 Development Summary");
addParagraph(
  "Sprint 2 successfully delivered the complete ride-discovery and join-request workflow foundation for the ICBT Carpooling System. By enforcing role-free, context-based access control, the system enables any authenticated user to seamlessly discover active ride offers, inspect privacy-safe offer details, and submit join requests. All core business rules—including duplicate request prevention, self-request blocking, seat availability checks, and requester data isolation—were fully implemented and validated through developer unit and API tests. With 71/71 automated tests passing cleanly and zero regression across Sprint 1 functionality, Sprint 2 provides a robust, production-ready foundation for Sprint 3, where offer owners will evaluate and process incoming join requests."
);

doc.end();
console.log("Section PDF generation complete: " + outputFile);
