import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const outputFile = path.join(process.cwd(), "..", "Sprint2_Development_Report.pdf");

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

  // Header background fill
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
      const isCenter = col.align === "center";
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

// ── Title ────────────────────────────────────────────────────────────────────
doc.font("Helvetica-Bold").fontSize(18).fillColor(COLOR_NAVY);
doc.text("Sprint 2 Development Report", startX, doc.y, { align: "center" });
doc.moveDown(0.2);

doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(COLOR_MUTED);
doc.text("ICBT Carpooling System — SEN5002 Agile Development and DevOps Project Report", startX, doc.y, { align: "center" });
doc.moveDown(1.2);

// ── Section 1: Development Overview ─────────────────────────────────────────
addHeader("1. Development Overview");
addParagraph(
  "Sprint 2 extends the foundational authentication and profile management architecture established in Sprint 1 by delivering core ride-discovery and interaction capabilities for the ICBT Carpooling System. The primary objective of Sprint 2 is to enable authenticated users to discover active ride offers matching their commute criteria and submit join requests to share rides. Building upon the Sprint 1 Node.js/Express backend, MongoDB native driver data access layer, JWT middleware, and React/Vite frontend UI design system, Sprint 2 introduces comprehensive search query filtering, privacy-conscious public offer inspection, robust join-request creation, and requester request-status tracking. In accordance with system design principles, access control operates strictly on token authentication, entity ownership (userId and requesterUserId), and action context—avoiding hardcoded role restrictions such as Driver or Passenger accounts. Consequently, any authenticated ICBT user can publish ride offers as an offer owner and request to join another user's offer as a requester."
);

// ── Section 2: Implemented Development Items ────────────────────────────────
addHeader("2. Implemented Development Items");
addParagraph(
  "Table 4.2.1 details the functional features and technical components developed during Sprint 2, along with their respective sprint outcomes."
);

const colsTable1 = [
  { name: "Implemented Development Item", key: "item", width: 145, isBold: true },
  { name: "Sprint 2 Outcome", key: "outcome", width: 378.28 }
];

const rowsTable1 = [
  {
    item: "Searchable Active Ride-Offer Listing (US-13)",
    outcome: "Developed GET /api/ride-offers/search API endpoint supporting multi-criteria filtering by origin, destination, date, and time window. Integrated case-insensitive MongoDB $regex pattern matching and enforced filters to return only active offers with available seats (availableSeats > 0). Integrated custom PickerField dropdown components in the frontend search bar."
  },
  {
    item: "Public Offer Detail Viewing with Privacy Controls (US-14)",
    outcome: "Implemented GET /api/ride-offers/public/:id endpoint returning complete route, schedule, seat availability, and status details. Applied a privacy serializer (toPublicRideOffer) to restrict owner metadata strictly to firstName and lastName, protecting sensitive contact details (email, phone, student ID)."
  },
  {
    item: "Join-Request Creation & Persistence (US-15)",
    outcome: "Created POST /api/join-requests API endpoint allowing authenticated users to submit a join request with an optional note. Implemented database insertion into the joinRequests collection with an initial status of Pending."
  },
  {
    item: "Business Rule Enforcement & Validation Guards (US-15)",
    outcome: "Implemented validation logic in validators.js to enforce business constraints: (1) preventing duplicate pending requests for the same offer, (2) blocking self-requests where requesterUserId === ownerUserId, and (3) rejecting requests for inactive, full (0 seats), or cancelled offers."
  },
  {
    item: "Requester Request-Status Viewing (US-16)",
    outcome: "Built GET /api/join-requests/mine API endpoint allowing users to view all join requests submitted under their account context (requesterUserId). Developed the MyRequestsPage.jsx dashboard displaying request history, embedded route summaries, and visual status badges (Pending, Accepted, Rejected)."
  },
  {
    item: "Regression Stability & UI Consistency",
    outcome: "Maintained complete backward compatibility with Sprint 1 auth, profile, and ride creation endpoints. Preserved the established UI component design tokens, custom pickers, and layout shells in styles.css."
  }
];

drawTable("Table 4.2.1: Sprint 2 Implemented Development Items", colsTable1, rowsTable1);

// ── Section 3: API, Database, Security and Deployment Implementation ─────────
addHeader("3. API, Database, Security and Deployment Implementation");
addParagraph(
  "Table 4.2.2 summarizes the technical architecture, data storage structures, security guards, and deployment configurations implemented for Sprint 2."
);

const colsTable2 = [
  { name: "Area", key: "area", width: 125, isBold: true },
  { name: "Implementation Detail", key: "detail", width: 398.28 }
];

const rowsTable2 = [
  {
    area: "Frontend Implementation",
    detail: "Developed using React and Vite. Updated SearchRidePage.jsx with custom PickerField selectors for Date and Time Window matching RideCreatePage.jsx styling; built OfferDetailPage.jsx modal for public offer inspection and request submission; created MyRequestsPage.jsx dashboard for requester status tracking."
  },
  {
    area: "Backend / API Implementation",
    detail: "Developed using Node.js and Express RESTful API routing pattern. Created endpoints:\n• GET /api/ride-offers/search\n• GET /api/ride-offers/public/:id\n• POST /api/join-requests\n• GET /api/join-requests/mine"
  },
  {
    area: "MongoDB Collections & Data Structures",
    detail: "Direct data access via MongoDB Node.js native driver (no ORM/ODM). Utilized collections:\n• rideOffers: Indexed on { status: 1, availableSeats: 1 } and $regex text query fields.\n• joinRequests: Stores documents containing _id, rideOfferId, requesterUserId, ownerUserId, status ('Pending', 'Accepted', 'Rejected'), requestNote, requestedAt, and updatedAt. Indexed on { requesterUserId: 1 } and { rideOfferId: 1, requesterUserId: 1 }."
  },
  {
    area: "Authentication & Security Controls",
    detail: "Enforced requireAuth middleware on all Sprint 2 endpoints to verify JWT Bearer tokens. Enforced ownership checks on GET /api/join-requests/mine (requesterUserId === req.user._id). Applied privacy projection serializers (toPublicRideOffer) to strip email, phone number, student ID, and internal database keys before returning public offer data."
  },
  {
    area: "Validation & Business Rules",
    detail: "Implemented validateJoinRequest(payload, offer, existingRequests, requesterUserId) in validators.js enforcing:\n1. Offer existence and active status (status === 'Active').\n2. Seat availability check (availableSeats > 0).\n3. Self-request prevention (requesterUserId !== offer.userId).\n4. Duplicate active request prevention (status !== 'Pending' for existing user request)."
  },
  {
    area: "Deployment & Environment Configuration",
    detail: "Server containerized using Docker; backend deployed to Railway cloud hosting; frontend SPA built via Vite and deployed to Vercel hosting; CI pipeline automated via GitHub Actions executing linting and Jest test suites on push."
  }
];

drawTable("Table 4.2.2: Sprint 2 Architecture, Security and Deployment Specifications", colsTable2, rowsTable2);

// ── Section 4: Developer Testing ─────────────────────────────────────────────
addHeader("4. Developer Testing");
addParagraph(
  "Prior to handing off Sprint 2 functionality for QA review, automated developer unit and API integration tests were authored and executed using Jest and Supertest. Following Test-Driven Development (TDD) principles, tests were constructed to verify input normalization, boundary constraints, business validation rules, and security controls across all Sprint 2 components."
);

const colsTable3 = [
  { name: "Test Area", key: "area", width: 110, isBold: true },
  { name: "What Was Tested", key: "tested", width: 263.28 },
  { name: "Evidence Placeholder", key: "evidence", width: 150, align: "center" }
];

const rowsTable3 = [
  { area: "Search Query Builder", tested: "Normalization of origin/destination strings (casing and whitespace handling) (UT-S2-01).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Search Filtering", tested: "Verification that search results include only Active offers (UT-S2-02) and exclude zero-seat offers (UT-S2-03).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Public Offer Detail Retrieval", tested: "Retrieval of route, date, time, and seat details (UT-S2-04) and verification that owner phone, email, and student ID are stripped (UT-S2-05).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Join Request Validation", tested: "Persistence of valid Pending request in joinRequests collection (UT-S2-06).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Duplicate Request Guard", tested: "Blocking of duplicate Pending join requests for the same offer by the same user (UT-S2-07).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Self-Request Guard", tested: "Rejection of join requests where requesterUserId === ownerUserId (UT-S2-08).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Unavailable Offer Guard", tested: "Rejection of requests submitted for full, inactive, or cancelled offers (UT-S2-09).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Request Status Isolation", tested: "Verification that GET /api/join-requests/mine returns only requests matching the token holder's requesterUserId (UT-S2-10).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Protected Endpoint Guard", tested: "Rejection of unauthenticated requests with HTTP 401 (UT-S2-11).", evidence: "[Insert terminal output screenshot here]" },
  { area: "Sprint 1 Regression Suite", tested: "Execution of all 24 Sprint 1 auth, profile, and ride tests to confirm zero regression (UT-S2-12).", evidence: "[Insert terminal output screenshot here]" }
];

drawTable("Table 4.2.3: Developer Automated Test Execution Matrix", colsTable3, rowsTable3);

// ── Section 5: Development Evidence Summary ─────────────────────────────────
addHeader("5. Development Evidence Summary");
addParagraph(
  "Table 4.2.4 lists the development evidence artifacts confirming source control history, automated test execution, continuous integration, runtime UI behavior, and security rule enforcement."
);

const colsTable4 = [
  { name: "Evidence Reference", key: "ref", width: 110, isBold: true },
  { name: "What the Evidence Should Demonstrate", key: "demo", width: 413.28 }
];

const rowsTable4 = [
  {
    ref: "Figure S2-DEV-01",
    demo: "GitHub Commit History & Pull Request Evidence — Demonstrates feature branch development, commit messages, and clean pull request merge history for Sprint 2 features."
  },
  {
    ref: "Figure S2-DEV-02",
    demo: "Local Automated Unit / API Test Execution Output — Demonstrates terminal screenshot of Jest execution confirming 71 passed tests across 5 test suites (sprint1-api.test.js, sprint2-api.test.js, sprint2-tdd-spec.test.js, auth.test.js, validators.test.js)."
  },
  {
    ref: "Figure S2-DEV-03",
    demo: "GitHub Actions CI Workflow Result — Demonstrates successful automated continuous integration pipeline execution, running lint checks and Jest unit tests on push."
  },
  {
    ref: "Figure S2-DEV-04",
    demo: "Runtime Application UI Screens — Demonstrates application interface screenshots: (a) Find a Ride search form with custom pickers, (b) Public Offer Detail modal, (c) Join Request form, and (d) My Requests dashboard displaying request status badges."
  },
  {
    ref: "Figure S2-DEV-05",
    demo: "Browser Developer Tools Network Evidence — Demonstrates Chrome DevTools Network tab captures confirming correct RESTful API endpoint calls and JSON payloads."
  },
  {
    ref: "Figure S2-DEV-06",
    demo: "Security & Ownership Validation Log — Demonstrates server HTTP response logs verifying enforcement of HTTP 409 Conflict (duplicate request), 422 Unprocessable Entity (self-request / full offer), and 401 Unauthorized (missing token)."
  }
];

drawTable("Table 4.2.4: Development Evidence Artifact Summary", colsTable4, rowsTable4);

// ── Section 6: Known Limitations / Carry Forward ────────────────────────────
addHeader("6. Known Limitations / Carry Forward");
addParagraph(
  "While Sprint 2 successfully delivered the ride-discovery, join-request creation, and requester status-tracking workflow, certain downstream features were intentionally scoped for subsequent iterations:\n\n" +
  "1. Offer-Owner Decision Workflow (Sprint 3 Scope): In Sprint 2, join requests remain in a Pending state. The capability for offer owners to review pending requests, approve or reject requesters, and automatically decrement availableSeats upon acceptance is scheduled for implementation in Sprint 3.\n\n" +
  "2. Real-Time Status Notifications: Request status changes currently refresh on navigation or manual dashboard reload. Automated web-socket or push notifications for status updates are carried forward to future enhancements.\n\n" +
  "3. Advanced Distance/Map Filtering: Search filters currently operate on route text criteria (origin and destination). Geospatial spatial proximity search is identified as a potential post-release enhancement."
);

doc.end();
console.log("Sprint 2 Development Report PDF generation complete: " + outputFile);
