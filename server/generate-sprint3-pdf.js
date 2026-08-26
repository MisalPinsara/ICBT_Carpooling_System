import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const outputFile = path.join(process.cwd(), "..", "Sprint3_Development_Section.pdf");

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
  let currentX = startX;

  // Header background
  doc.rect(startX, yHeader, pageWidth, 20).fill("#1e293b");

  columns.forEach((col) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#ffffff")
      .text(col.title, currentX + 4, yHeader + 5, { width: col.width - 8, align: col.align || "left" });
    currentX += col.width;
  });

  let currentY = yHeader + 20;

  rows.forEach((row, rowIndex) => {
    // Calculate required row height
    let maxHeight = 18;
    columns.forEach((col, cIndex) => {
      const text = String(row[cIndex] ?? "");
      const cellHeight = doc.heightOfString(text, { width: col.width - 8, font: "Helvetica", size: 8 });
      if (cellHeight + 8 > maxHeight) maxHeight = cellHeight + 8;
    });

    if (currentY + maxHeight > 780) {
      doc.addPage({ layout: "portrait", size: "A4", margin: 36 });
      currentY = 36;
      // Re-draw header on new page
      let rx = startX;
      doc.rect(startX, currentY, pageWidth, 20).fill("#1e293b");
      columns.forEach((col) => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff").text(col.title, rx + 4, currentY + 5, { width: col.width - 8, align: col.align || "left" });
        rx += col.width;
      });
      currentY += 20;
    }

    // Row background
    doc.rect(startX, currentY, pageWidth, maxHeight).fill(rowIndex % 2 === 0 ? COLOR_ROW_EVEN : COLOR_ROW_ALT);
    doc.rect(startX, currentY, pageWidth, maxHeight).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();

    currentX = startX;
    columns.forEach((col, cIndex) => {
      const isBold = col.bold || false;
      const fontName = isBold ? "Helvetica-Bold" : "Helvetica";
      const text = String(row[cIndex] ?? "");
      doc.font(fontName).fontSize(8).fillColor(COLOR_TEXT).text(text, currentX + 4, currentY + 4, {
        width: col.width - 8,
        align: col.align || "left"
      });
      currentX += col.width;
    });

    currentY += maxHeight;
  });

  doc.y = currentY;
  doc.moveDown(1);
}

// ── Document Content ─────────────────────────────────────────────────────────

// Title
doc.font("Helvetica-Bold").fontSize(18).fillColor(COLOR_NAVY);
doc.text("Sprint 3 Development Section: Carpooling App", startX, doc.y);
doc.font("Helvetica").fontSize(10).fillColor(COLOR_MUTED);
doc.text("Offer-Owner Request Management, Accept/Reject Decisions & Capacity Enforcement", startX, doc.y);
doc.moveDown(1.2);

// 1. Scope
addHeader("1. Developer Scope and Testing Ownership");
addParagraph(
  "Sprint 3 builds upon the foundational user authentication and ride-offer publishing from Sprint 1 and the passenger search and join-request workflows from Sprint 2. The primary objective is to implement offer-owner request management. Authenticated ride-offer owners can view join requests submitted for their active rides, inspect detailed requester information, accept or reject requests, view accepted participants, and ensure available-seat capacity stays completely accurate."
);

// Table 1: Testing Ownership
drawTable(
  "Table 1: Sprint 3 testing ownership for the Developer",
  [
    { title: "Testing activity", width: 110, bold: true },
    { title: "Primary owner", width: 80 },
    { title: "Developer responsibility", width: 333.28 }
  ],
  [
    ["TDD / test-first", "QA + Dev", "Use QA/BA expected behaviour to write or update automated unit/API tests before or during implementation, then implement until tests pass."],
    ["Unit/API testing", "Dev", "Write and run automated tests for ownership filtering, accepted-requester filtering, accept/reject transitions, capacity rules and protected endpoints."],
    ["Functional testing", "QA", "Support QA by explaining implemented behaviour, fixing reported defects and updating tests if implementation rules change."],
    ["Security and authorization", "QA", "Implement JWT route guards and ownership/requester checks; provide code/test evidence for denied unauthorized access."],
    ["Automated regression / CI", "QA + Dev", "Add Sprint 3 tests to the automated test command and ensure Sprint 1 and Sprint 2 regression tests still pass."]
  ]
);

// Table 2: Tech Stack
drawTable(
  "Table 2: Recommended technology stack for Sprint 3 development",
  [
    { title: "Layer", width: 90, bold: true },
    { title: "Recommended technology", width: 140 },
    { title: "Sprint 3 use", width: 293.28 }
  ],
  [
    ["Frontend", "React + Vite", "Build owner-side join-request screens, accepted requester views and request-decision UI. Follow the current UI theme."],
    ["Styling / UI", "Tailwind CSS + lucide-react", "Reuse existing visual language and component patterns. Do not introduce an unrelated layout style for Sprint 3."],
    ["Backend", "Node.js + Express", "Expose REST endpoints for received requests, accepted requester lists, request decisions and requester decision-status retrieval."],
    ["Database", "MongoDB", "Use existing users, profiles, rideOffers and joinRequests collections."],
    ["Data access", "MongoDB Node.js driver", "Use direct collection operations and ObjectId references without adding an ORM layer."],
    ["Authentication", "bcrypt + JWT/session token", "Reuse protected route middleware and enforce ownership/requester checks in server routes."],
    ["Unit/API testing", "Jest + Supertest", "Run automated code-level tests for request decisions, ownership filtering, capacity rules and regression."],
    ["DevOps", "GitHub Actions, Docker, Vercel", "Maintain feature branches, pull requests, CI test evidence and deployment compatibility."]
  ]
);

// Table 3: User Stories
drawTable(
  "Table 3: Sprint 3 user stories and acceptance criteria",
  [
    { title: "Story", width: 50, bold: true },
    { title: "Points", width: 45, align: "center" },
    { title: "User story", width: 170 },
    { title: "Acceptance criteria", width: 258.28 }
  ],
  [
    ["US-09", "3", "As a ride-offer owner, I want to view accepted users for my offer, so that I know who will travel with me.", "Owner can open an offer and view accepted requesters; only Accepted join requests are displayed; an empty state is shown when no accepted requesters exist; other users cannot view private accepted-requester data for offers they do not own."],
    ["US-10", "5", "As a ride-offer owner, I want to view join requests for my ride offers, so that I can manage people who want to travel.", "Owner can view requests linked to their own offers; requests for other users' offers are excluded; each request displays requester summary, offer summary, request status and request date; empty state is displayed when no requests exist."],
    ["US-11", "5", "As a ride-offer owner, I want to accept or reject a join request, so that I can control who joins my ride.", "Owner can accept a Pending request when the offer is active and has seats; owner can reject a Pending request; non-owner decision attempts are denied; already decided requests cannot be decided again; requester can see the decision status."],
    ["US-12", "5", "As a ride-offer owner, I want available-seat information to stay accurate, so that users do not request full rides.", "Accepting a request decrements availableSeats exactly once; rejection does not consume a seat; acceptance is blocked when seats are zero; seat count never becomes negative; relevant views show the updated capacity."]
  ]
);

// Table 5: Business Rules
drawTable(
  "Table 5: Sprint 3 business and validation rules",
  [
    { title: "Rule ID", width: 75, bold: true },
    { title: "Rule description", width: 448.28 }
  ],
  [
    ["S3-BR-01", "Only authenticated users can access request-management functions."],
    ["S3-BR-02", "Users can view received requests only for ride offers they own."],
    ["S3-BR-03", "Accepted participant lists include only joinRequests with status Accepted."],
    ["S3-BR-04", "Only Pending requests can be accepted or rejected."],
    ["S3-BR-05", "Only the owner of the ride offer can accept or reject requests for that offer."],
    ["S3-BR-06", "Acceptance is blocked when the offer is full, unavailable, inactive or has availableSeats less than or equal to zero."],
    ["S3-BR-07", "Acceptance decrements availableSeats exactly once and seat count must never become negative."],
    ["S3-BR-08", "Rejecting a request does not consume a seat."],
    ["S3-BR-09", "A requester can view only their own request status and outcome."],
    ["S3-BR-10", "Decision actions update status, decidedAt, updatedAt and optional decisionNote as applicable."]
  ]
);

// Table 7: TDD Cases
drawTable(
  "Table 7: Sprint 3 TDD/test-first cases",
  [
    { title: "TDD ID", width: 65, bold: true },
    { title: "Feature", width: 85 },
    { title: "Test scenario", width: 175 },
    { title: "Expected result", width: 198.28 }
  ],
  [
    ["TDD-S3-01", "Request Visibility", "Owner opens the received requests view for an owned offer.", "Only requests linked to the owner's offers are returned."],
    ["TDD-S3-02", "Accepted Users", "Owner opens accepted participants for an owned offer.", "Only JoinRequests with Accepted status are shown."],
    ["TDD-S3-03", "Accept Request", "Owner accepts a Pending request on an active offer with available seats.", "Request status becomes Accepted and decision timestamp is recorded."],
    ["TDD-S3-04", "Reject Request", "Owner rejects a Pending request on an owned offer.", "Request status becomes Rejected and decision timestamp is recorded."],
    ["TDD-S3-05", "Requester Visibility", "Requester checks their own request after owner decision.", "Requester sees Accepted or Rejected status for their own request."],
    ["TDD-S3-06", "Ownership Check", "User attempts to decide a request for another user's offer.", "Decision is denied."],
    ["TDD-S3-07", "Status Transition", "Owner attempts to decide an already Accepted or Rejected request.", "Action is blocked and existing status remains unchanged."],
    ["TDD-S3-08", "Capacity Check", "Owner accepts a request when availableSeats is zero.", "Acceptance is rejected and seat count stays zero."],
    ["TDD-S3-09", "Seat Decrement", "Owner accepts one Pending request while seats are available.", "availableSeats decreases by exactly one."],
    ["TDD-S3-10", "No Negative Seats", "Repeated or near simultaneous acceptance reaches capacity.", "Seat count never becomes negative and excess acceptance is blocked."],
    ["TDD-S3-11", "Rejection Capacity", "Owner rejects a Pending request.", "Request is rejected without reducing availableSeats."],
    ["TDD-S3-12", "Empty State", "Owner has no received requests.", "UI/API returns a clean empty state result."]
  ]
);

// Table 8: Unit and API Test Cases
drawTable(
  "Table 8: Sprint 3 unit/API test cases for the Developer",
  [
    { title: "Unit/API ID", width: 70, bold: true },
    { title: "Function / logic", width: 110 },
    { title: "Test input", width: 150 },
    { title: "Expected result", width: 193.28 }
  ],
  [
    ["UT-S3-01", "Ownership filter", "ownerUserId equals authenticated user ID", "Only requests for the authenticated owner's offers are returned."],
    ["UT-S3-02", "Cross-owner exclusion", "Requests exist for another owner", "Other owner's requests are excluded."],
    ["UT-S3-03", "Accepted filter", "Requests include Pending, Accepted and Rejected statuses", "Accepted participant view returns only Accepted records."],
    ["UT-S3-04", "Accept transition", "Pending request, valid owner, active offer and seats available", "Status changes to Accepted."],
    ["UT-S3-05", "Reject transition", "Pending request and valid owner", "Status changes to Rejected."],
    ["UT-S3-06", "Already decided request", "Accepted or Rejected request is submitted for another decision", "Action is rejected and status remains unchanged."],
    ["UT-S3-07", "Decision timestamps", "Valid accept or reject action", "decidedAt and updatedAt are set or updated."],
    ["UT-S3-08", "Zero-seat acceptance", "availableSeats equals 0", "Acceptance is blocked."],
    ["UT-S3-09", "Seat decrement", "availableSeats equals 2 and one request is accepted", "availableSeats becomes 1."],
    ["UT-S3-10", "No negative seats", "Acceptance attempted at capacity limit", "availableSeats never drops below 0."],
    ["UT-S3-11", "Reject does not decrement", "Pending request is rejected while seats are available", "availableSeats remains unchanged."],
    ["UT-S3-12", "Requester status filter", "requesterUserId equals authenticated user ID", "Requester sees only their own request records."],
    ["UT-S3-13", "Protected route guard", "No token/session for request-management endpoint", "Request is denied."],
    ["UT-S3-14", "Regression check", "Run Sprint 1 and Sprint 2 automated tests with Sprint 3 tests", "All previous sprint tests still pass."]
  ]
);

// Table 9: Suggested API Contract
drawTable(
  "Table 9: Suggested Sprint 3 API contract",
  [
    { title: "Endpoint purpose", width: 130, bold: true },
    { title: "Suggested route", width: 180 },
    { title: "Required behaviour", width: 213.28 }
  ],
  [
    ["Received requests", "GET /api/join-requests/received", "Return requests for ride offers owned by the authenticated user only."],
    ["Accepted requesters", "GET /api/ride-offers/:id/accepted-passengers", "Return accepted requester summaries for an owned ride offer."],
    ["Decision action", "PATCH /api/join-requests/:id/decision", "Accept or reject a Pending request after verifying ownership, status and seat capacity."],
    ["Own request status", "GET /api/join-requests/mine", "Return request records submitted by the authenticated requester only."],
    ["Offer capacity update", "Internal helper or route logic", "Decrement availableSeats only during valid acceptance and never below zero."]
  ]
);

doc.end();

console.log("Generated Sprint 3 Development Section PDF:", outputFile);
