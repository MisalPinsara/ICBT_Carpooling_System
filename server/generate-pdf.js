import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const outputFile = path.join(process.cwd(), "..", "Developer_Test_Case_Table.pdf");

const doc = new PDFDocument({
  layout: "landscape",
  size: "A4",
  margin: 25
});

const stream = fs.createWriteStream(outputFile);
doc.pipe(stream);

// ── Colors ───────────────────────────────────────────────────────────────────
const COLOR_HEADER_BG = "#1e50bb"; // Royal Blue matching reference screenshot
const COLOR_HEADER_TEXT = "#ffffff";
const COLOR_ROW_ALT = "#f8fafc";
const COLOR_ROW_EVEN = "#ffffff";
const COLOR_BORDER = "#cbd5e1";
const COLOR_TEXT = "#0f172a";
const COLOR_STATUS_PASS = "#000000"; // Black font for Passed status matching reference screenshot

// ── Column Definitions ───────────────────────────────────────────────────────
const columns = [
  { name: "Test ID", width: 52, align: "left" },
  { name: "Related User Story", width: 78, align: "left" },
  { name: "Feature/Module", width: 70, align: "left" },
  { name: "Test Scenario", width: 115, align: "left" },
  { name: "Test Data", width: 90, align: "left" },
  { name: "Test Steps / Test Script", width: 110, align: "left" },
  { name: "Expected Result", width: 110, align: "left" },
  { name: "Actual Result", width: 70, align: "left" },
  { name: "Status", width: 42, align: "center" },
  { name: "Evidence Reference", width: 54, align: "left" }
];

const startX = 25;
const pageWidth = 791.89; // 841.89 - 50 margin

// ── All 45 Test Rows ─────────────────────────────────────────────────────────
const testCases = [
  // Sprint 1
  {
    id: "UT-01",
    userStory: "User registration/login",
    module: "Email validation",
    scenario: "Reject invalid email addresses",
    data: "student@gmail.com; student@icbt.lk",
    steps: "Run automated validator test in server/__tests__/validators.test.js",
    expected: "Only valid ICBT email is accepted",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-02",
    userStory: "User registration",
    module: "Password validation",
    scenario: "Reject weak password and mismatched passwords",
    data: "short; mismatched confirm password",
    steps: "Run automated validator test in server/__tests__/validators.test.js",
    expected: "Validation errors returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-03",
    userStory: "User registration",
    module: "Registration API",
    scenario: "Block duplicate email registration",
    data: "Existing registered email",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns duplicate email error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-01",
    userStory: "User registration",
    module: "Registration API",
    scenario: "Create account with valid details",
    data: "Valid ICBT email, password, profile data",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Account, token, and profile are created",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-02",
    userStory: "User registration",
    module: "Registration API",
    scenario: "Reject registration with invalid email",
    data: "Invalid email address",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns validation error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-04A",
    userStory: "Authentication",
    module: "Password security",
    scenario: "Hash passwords and verify without storing plain text",
    data: "Password123",
    steps: "Run auth unit test in server/__tests__/auth.test.js",
    expected: "Password hash differs from plain text and verifies correctly",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-04B",
    userStory: "User registration",
    module: "Password security",
    scenario: "Store hashed registration password",
    data: "New user registration payload",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Database stores hash, not plain password",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-05",
    userStory: "User login",
    module: "Login API",
    scenario: "Authenticate valid login credentials",
    data: "Existing email and correct password",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns 200 and token",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-06",
    userStory: "User login",
    module: "Login API",
    scenario: "Reject incorrect password",
    data: "Existing email and wrong password",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns unauthorized response",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-07",
    userStory: "Authentication",
    module: "Protected routes",
    scenario: "Deny access without token",
    data: "No authorization token",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns unauthorized response",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-06",
    userStory: "Profile handling",
    module: "Profile API",
    scenario: "Display authenticated user's own profile",
    data: "Valid driver token",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Own user/profile data is returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-07",
    userStory: "Profile handling",
    module: "Profile API",
    scenario: "Update valid profile details",
    data: "Valid profile update payload",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Profile and user name update successfully",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-08A",
    userStory: "Profile handling",
    module: "Profile validation",
    scenario: "Reject invalid profile data",
    data: "Empty first name / phone number",
    steps: "Run automated validator test in server/__tests__/validators.test.js",
    expected: "Validation errors returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-08B",
    userStory: "Profile handling",
    module: "Profile API",
    scenario: "Reject invalid profile update data",
    data: "Invalid profile payload",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns validation error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-09",
    userStory: "Privacy access control",
    module: "Profile privacy",
    scenario: "Deny access to another user's profile",
    data: "Driver token requesting passenger profile",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns forbidden response",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-10A",
    userStory: "Ride-offer creation",
    module: "Ride validation",
    scenario: "Reject ride offer with zero seats",
    data: "availableSeats: 0",
    steps: "Run automated validator test in server/__tests__/validators.test.js",
    expected: "Validation error returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-10B",
    userStory: "Ride-offer creation",
    module: "Ride API",
    scenario: "Reject ride offer with zero seats",
    data: "Driver token, zero seats",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns validation error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-11",
    userStory: "Ride-offer creation",
    module: "Ride API",
    scenario: "Reject ride offer with negative seats",
    data: "Driver token, availableSeats: -1",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns validation error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-12",
    userStory: "Ride-offer creation",
    module: "Ride API",
    scenario: "Reject ride offer missing origin",
    data: "Empty origin",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns validation error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-13",
    userStory: "Ride-offer creation",
    module: "Ride API",
    scenario: "Reject ride offer missing destination",
    data: "Empty destination",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns validation error",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-14",
    userStory: "Ride-offer creation",
    module: "Ride API",
    scenario: "Link created ride offer to authenticated driver",
    data: "Valid ride offer payload + driver token",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Created offer contains authenticated driver ID",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-15",
    userStory: "Ride-offer listing",
    module: "Ride API",
    scenario: "Return only active offers for authenticated driver",
    data: "Driver token with active/completed offers",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Only active own offers are returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-16",
    userStory: "Authorization",
    module: "Driver-only access",
    scenario: "Deny passenger access to ride-offer creation",
    data: "Passenger token + ride payload",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "API returns forbidden response",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "API-17",
    userStory: "Privacy access control",
    module: "Ride details API",
    scenario: "Return only authenticated driver's own ride detail",
    data: "Own ride ID and another driver's ride ID",
    steps: "Run API test in server/__tests__/sprint1-api.test.js",
    expected: "Own offer returns success; other driver's offer is blocked",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },

  // Sprint 2
  {
    id: "TDD-S2-01",
    userStory: "US-13 Search Ride Offers",
    module: "Ride Search API",
    scenario: "Search with valid route and time-window criteria",
    data: "origin=Maharagama&destination=ICBT",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Eligible active ride offers are displayed",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-02",
    userStory: "US-13 Search Ride Offers",
    module: "Ride Search API",
    scenario: "Search with no matching route/time criteria",
    data: "origin=Galle&destination=Kandy",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "No-result message or empty result response is returned cleanly",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-03",
    userStory: "US-14 Offer Details",
    module: "Public Offer Detail API",
    scenario: "Open a matching offer",
    data: "Valid rideOfferId",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Correct route, time, seats, status and limited owner/profile data displayed",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-04",
    userStory: "US-15 Join Request Creation",
    module: "JoinRequest API",
    scenario: "Submit valid join request for another user's active offer",
    data: "rideOfferId + requestNote",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Pending JoinRequest is created with rideOfferId, requesterUserId, ownerUserId",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-05",
    userStory: "US-15 Join Request Creation",
    module: "JoinRequest API",
    scenario: "Submit duplicate active request for the same offer",
    data: "Existing Pending request for same offer",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Duplicate request is blocked (409 Conflict)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-06",
    userStory: "US-15 Join Request Creation",
    module: "JoinRequest API",
    scenario: "Owner attempts to request own offer",
    data: "requesterUserId === ownerUserId",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Self-request is blocked (422 Unprocessable Entity)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-07",
    userStory: "US-15 Join Request Creation",
    module: "JoinRequest API",
    scenario: "Request full, inactive or cancelled offer",
    data: "inactiveOffer / fullOffer / cancelledOffer ID",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Request is rejected (422 Unprocessable Entity)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-08",
    userStory: "US-16 Request Status Viewing",
    module: "My Requests API",
    scenario: "View own requests",
    data: "Authenticated passenger token",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Authenticated requester sees only their own request records and statuses",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "TDD-S2-09",
    userStory: "Authorization",
    module: "Protected Routes",
    scenario: "Unauthenticated user attempts protected request action",
    data: "No authorization token",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Access/action is denied (401 Unauthorized)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-01",
    userStory: "US-13 Search Ride Offers",
    module: "Search query builder",
    scenario: "Origin/destination with extra spaces or case differences",
    data: "maharagama / icbt campus",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Input is normalised and matching offers can still be found",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-02",
    userStory: "US-13 Search Ride Offers",
    module: "Active offer filter",
    scenario: "Active and inactive offers exist",
    data: "Active + inactive offers in DB",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Only eligible active offers are returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-03",
    userStory: "US-13 Search Ride Offers",
    module: "Seat availability filter",
    scenario: "Offer with availableSeats = 0",
    data: "availableSeats: 0",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Offer is excluded from request eligibility",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-04",
    userStory: "US-14 Offer Details",
    module: "Offer detail retrieval",
    scenario: "Valid rideOfferId",
    data: "Valid rideOfferId",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Offer detail response returns approved route/time/status fields",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-05",
    userStory: "US-14 Offer Details",
    module: "Offer detail privacy",
    scenario: "Offer owner profile includes private contact data",
    data: "Owner profile with phone/email",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Unapproved private fields are not returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-06",
    userStory: "US-15 Join Request Creation",
    module: "JoinRequest validation",
    scenario: "Valid requester and active offer",
    data: "Valid passenger token + rideOfferId",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Pending JoinRequest is inserted successfully",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-07",
    userStory: "US-15 Join Request Creation",
    module: "Duplicate request check",
    scenario: "Existing Pending request for same requester and offer",
    data: "Duplicate request payload",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Second request is rejected (409)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-08",
    userStory: "US-15 Join Request Creation",
    module: "Self-request check",
    scenario: "requesterUserId equals ownerUserId",
    data: "Owner token + own rideOfferId",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Request is rejected (422)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-09",
    userStory: "US-15 Join Request Creation",
    module: "Unavailable offer check",
    scenario: "Cancelled/inactive/full offer",
    data: "Inactive/full/cancelled offer IDs",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Join request is rejected (422)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-10",
    userStory: "US-16 Request Status Viewing",
    module: "Request-status filtering",
    scenario: "User has own requests and other users' requests exist",
    data: "Multiple user tokens & requests",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Only authenticated user's own requests are returned",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-11",
    userStory: "Authorization",
    module: "Protected endpoint guard",
    scenario: "No token/session",
    data: "Missing Authorization header",
    steps: "Run API test in server/__tests__/sprint2-tdd-spec.test.js",
    expected: "Request action is denied (401)",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  },
  {
    id: "UT-S2-12",
    userStory: "Quality & Stability",
    module: "Sprint 1 regression",
    scenario: "Run existing auth/profile/ride-offer tests",
    data: "Full test suite execution",
    steps: "Run existing tests in server/__tests__/sprint1-api.test.js",
    expected: "Existing Sprint 1 tests still pass",
    actual: "Passed in Jest npm test",
    status: "Passed",
    evidence: "Terminal screenshot: npm test passed"
  }
];

function drawWrappedCell(text, x, y, width, height, fontName = "Helvetica", fontSize = 6.5, align = "left", textColor = COLOR_TEXT) {
  doc.font(fontName).fontSize(fontSize).fillColor(textColor);
  doc.text(text, x + 3, y + 3, {
    width: width - 6,
    align: align,
    lineGap: 1
  });
}

function getRowHeight(row) {
  let maxHeight = 16;
  columns.forEach((col) => {
    let text = "";
    switch (col.name) {
      case "Test ID": text = row.id; break;
      case "Related User Story": text = row.userStory; break;
      case "Feature/Module": text = row.module; break;
      case "Test Scenario": text = row.scenario; break;
      case "Test Data": text = row.data; break;
      case "Test Steps / Test Script": text = row.steps; break;
      case "Expected Result": text = row.expected; break;
      case "Actual Result": text = row.actual; break;
      case "Status": text = row.status; break;
      case "Evidence Reference": text = row.evidence; break;
    }
    doc.font("Helvetica").fontSize(6.5);
    const textHeight = doc.heightOfString(text, { width: col.width - 6, lineGap: 1 });
    if (textHeight + 6 > maxHeight) {
      maxHeight = textHeight + 6;
    }
  });
  return maxHeight;
}

function drawHeader(y) {
  let currentX = startX;
  doc.rect(startX, y, pageWidth, 20).fill(COLOR_HEADER_BG);

  columns.forEach((col) => {
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_HEADER_TEXT);
    doc.text(col.name, currentX + 3, y + 5, {
      width: col.width - 6,
      align: col.align
    });
    currentX += col.width;
  });

  return y + 20;
}

let currentY = 25;

// Title
doc.font("Helvetica-Bold").fontSize(16).fillColor("#0f172a");
doc.text("Sprint 1 & Sprint 2 Developer Test Case Table", startX, currentY, { align: "center" });
currentY += 22;

// Subtitle
doc.font("Helvetica").fontSize(8).fillColor("#475569");
doc.text(
  "This developer test case table documents the Sprint 1 & Sprint 2 automated TDD, unit, and API tests created and executed at code level. The tests were executed using Jest through npm test. The terminal evidence confirms 5 passed test suites and 71 passed automated tests.",
  startX,
  currentY,
  { align: "left", width: pageWidth }
);
currentY += 16;

// Subtitle note
doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#334155");
doc.text(
  "Evidence reference for all rows: terminal screenshot showing npm test completed successfully with 5 passed test suites and 71 passed automated tests.",
  startX,
  currentY,
  { align: "left", width: pageWidth }
);
currentY += 16;

currentY = drawHeader(currentY);

testCases.forEach((row, idx) => {
  const rowHeight = getRowHeight(row);

  if (currentY + rowHeight > 565) {
    doc.addPage({ layout: "landscape", size: "A4", margin: 25 });
    currentY = 25;
    currentY = drawHeader(currentY);
  }

  const bg = idx % 2 === 0 ? COLOR_ROW_EVEN : COLOR_ROW_ALT;
  doc.rect(startX, currentY, pageWidth, rowHeight).fill(bg);

  doc.lineWidth(0.5).strokeColor(COLOR_BORDER);
  doc.rect(startX, currentY, pageWidth, rowHeight).stroke();

  let cellX = startX;
  columns.forEach((col) => {
    doc.moveTo(cellX, currentY).lineTo(cellX, currentY + rowHeight).stroke();

    let text = "";
    let fontName = "Helvetica";
    let textColor = COLOR_TEXT;

    switch (col.name) {
      case "Test ID":
        text = row.id;
        fontName = "Helvetica-Bold";
        break;
      case "Related User Story":
        text = row.userStory;
        break;
      case "Feature/Module":
        text = row.module;
        break;
      case "Test Scenario":
        text = row.scenario;
        break;
      case "Test Data":
        text = row.data;
        break;
      case "Test Steps / Test Script":
        text = row.steps;
        break;
      case "Expected Result":
        text = row.expected;
        break;
      case "Actual Result":
        text = row.actual;
        break;
      case "Status":
        text = row.status;
        fontName = "Helvetica";
        textColor = COLOR_STATUS_PASS;
        break;
      case "Evidence Reference":
        text = row.evidence;
        break;
    }

    drawWrappedCell(text, cellX, currentY, col.width, rowHeight, fontName, 6.5, col.align, textColor);
    cellX += col.width;
  });

  currentY += rowHeight;
});

doc.end();
console.log("PDF generation complete: " + outputFile);
