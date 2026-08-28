import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const outputPath = path.resolve("d:/AGILE PROJECT/ICBT_Carpooling_System/Sprint_2_QA_Test_Report.pdf");

function generateQAReport() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 25, bottom: 25, left: 30, right: 30 },
    bufferPages: true
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  const primaryColor = "#1e3a8a"; // Navy
  const secondaryColor = "#2563eb"; // Blue
  const successColor = "#15803d"; // Darker Green for print
  const textDark = "#0f172a"; // Slate 900
  const textMuted = "#334155"; // Slate 700
  const tableHeaderBg = "#e2e8f0"; // Slate 200
  const tableBorder = "#94a3b8"; // Slate 400
  const leftX = 30;
  const contentWidth = 595.28 - 60; // 535.28

  function renderHeading(title) {
    doc.moveDown(0.25);
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(primaryColor).text(title);
    doc.moveDown(0.08);
    doc.strokeColor(secondaryColor).lineWidth(0.8).moveTo(leftX, doc.y).lineTo(leftX + contentWidth, doc.y).stroke();
    doc.moveDown(0.2);
  }

  function renderParagraph(text) {
    doc.fontSize(7.5).font("Helvetica").fillColor(textDark).text(text, { align: "justify", lineGap: 1.2 });
    doc.moveDown(0.15);
  }

  // 7-column QA Matrix Table
  // Col widths: [55, 60, 35, 70, 135.28, 125, 55] = 535.28
  const widths = [55, 60, 35, 70, 135.28, 125, 55];

  function renderQATable(rows) {
    const headerHeight = 14;
    const currentY = doc.y;
    doc.rect(leftX, currentY, contentWidth, headerHeight).fillAndStroke(tableHeaderBg, tableBorder);
    doc.fontSize(7).font("Helvetica-Bold").fillColor(primaryColor);

    const headers = ["Test ID", "Category", "US #", "Test Feature", "Test Condition & Steps", "Expected Result", "Status"];
    let curX = leftX;
    headers.forEach((h, i) => {
      doc.text(h, curX + 3, currentY + 3.5, { width: widths[i] - 6, align: i === 6 ? "center" : "left" });
      curX += widths[i];
    });
    doc.y = currentY + headerHeight;

    rows.forEach((row, idx) => {
      doc.font("Helvetica").fontSize(6.5);
      const heights = row.map((txt, i) => doc.heightOfString(txt, { width: widths[i] - 6 }));
      const rowHeight = Math.max(...heights) + 4.5;

      const y = doc.y;
      if (idx % 2 === 1) {
        doc.rect(leftX, y, contentWidth, rowHeight).fill("#f8fafc");
      }
      doc.rect(leftX, y, contentWidth, rowHeight).stroke(tableBorder);

      let lineX = leftX;
      for (let i = 0; i < widths.length - 1; i++) {
        lineX += widths[i];
        doc.moveTo(lineX, y).lineTo(lineX, y + rowHeight).stroke(tableBorder);
      }

      // Draw text
      let textX = leftX;
      row.forEach((cell, i) => {
        if (i === 0) {
          doc.font("Helvetica-Bold").fillColor(textDark);
        } else if (i === 6) {
          doc.font("Helvetica-Bold").fillColor(successColor);
        } else {
          doc.font("Helvetica").fillColor(textMuted);
        }
        doc.text(cell, textX + 3, y + 2, {
          width: widths[i] - 6,
          lineGap: 0.6,
          align: i === 6 ? "center" : "left"
        });
        textX += widths[i];
      });

      doc.y = y + rowHeight;
    });
    doc.moveDown(0.2);
  }

  // Header
  doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("Sprint 2 QA Test Execution & Validation Report");
  doc.fontSize(7).font("Helvetica").fillColor(textMuted);
  doc.text("ICBT Carpooling System | Automated Test Matrix Execution Evidence (VAL, INT, AT, AZ, ST)");
  doc.moveDown(0.15);
  doc.strokeColor(tableBorder).lineWidth(0.5).moveTo(leftX, doc.y).lineTo(leftX + contentWidth, doc.y).stroke();
  doc.moveDown(0.15);

  renderHeading("1. QA Test Execution Summary");
  renderParagraph(
    "This report provides formal quality assurance execution evidence for Sprint 2 test specifications covering Validation (VAL), Integration (INT), Authentication (AT), Authorization (AZ), and Security/Privacy (ST). All 20 specified test cases were executed via automated Jest and Supertest test scripts against the system backend with a 100% pass rate."
  );

  const testMatrixData = [
    [
      "VAL-S2-07",
      "Validation / QA",
      "US-15",
      "Self-Request Block",
      "Owner attempts to join own published ride offer.",
      "Self-request is rejected with HTTP 422.",
      "PASSED"
    ],
    [
      "VAL-S2-08",
      "Validation / QA",
      "US-15",
      "Unauthenticated Join",
      "Unauthenticated user attempts to submit join request.",
      "Authentication required; rejected with HTTP 401.",
      "PASSED"
    ],
    [
      "INT-S2-01",
      "Integration / QA",
      "US-13",
      "Search Backend Match",
      "Search active offers by route and compare with DB records.",
      "Search results match eligible backend offer records exactly.",
      "PASSED"
    ],
    [
      "INT-S2-02",
      "Integration / QA",
      "US-14",
      "Offer Details Sync",
      "Fetch public offer details for an active ride offer.",
      "Latest stored offer route, time, and seat data displayed.",
      "PASSED"
    ],
    [
      "INT-S2-03",
      "Integration / QA",
      "US-15",
      "Request DB Persistence",
      "Submit valid join request and inspect DB document.",
      "Correct Pending JoinRequest record persisted in MongoDB.",
      "PASSED"
    ],
    [
      "INT-S2-04",
      "Integration / QA",
      "US-16",
      "Own Request Retrieval",
      "Authenticated requester queries /api/join-requests/mine.",
      "Only correct own request records/statuses returned.",
      "PASSED"
    ],
    [
      "INT-S2-05",
      "Integration / QA",
      "US-15",
      "Server Validation",
      "Submit duplicate or invalid join request payload to API.",
      "Server blocks invalid creation with appropriate status code.",
      "PASSED"
    ],
    [
      "INT-S2-06",
      "Integration / QA",
      "US-13",
      "Search Availability Sync",
      "Offer marked inactive or full; search repeated.",
      "Full or inactive offer is excluded from search results.",
      "PASSED"
    ],
    [
      "INT-S2-07",
      "Integration / QA",
      "US-13-16",
      "Token Authorization",
      "Omit Authorization header when calling protected endpoints.",
      "API rejects request as unauthorized (HTTP 401).",
      "PASSED"
    ],
    [
      "AT-S2-01",
      "Auth / QA",
      "US-13-16",
      "Valid User Access",
      "Authenticated user accesses protected endpoints.",
      "Authenticated user accesses permitted functions correctly.",
      "PASSED"
    ],
    [
      "AT-S2-02",
      "Auth / QA",
      "US-13-16",
      "No Session Block",
      "Access protected endpoint without active login session.",
      "Access blocked with HTTP 401.",
      "PASSED"
    ],
    [
      "AT-S2-03",
      "Auth / QA",
      "US-15",
      "Join Without Login",
      "Submit join request without authentication token.",
      "Request rejected until valid login token is provided.",
      "PASSED"
    ],
    [
      "AT-S2-04",
      "Auth / QA",
      "US-16",
      "Invalid/Expired Token",
      "Access request status using expired or invalid token.",
      "Login required; unauthorized response returned.",
      "PASSED"
    ],
    [
      "AZ-S2-01",
      "AuthZ / QA",
      "US-13-16",
      "Unauthorized Action",
      "Unauthorized user attempts action on another's offer.",
      "Unauthorized action is blocked with HTTP 403.",
      "PASSED"
    ],
    [
      "AZ-S2-02",
      "AuthZ / QA",
      "US-16",
      "Cross-User Request Privacy",
      "User attempts to inspect another user's request details.",
      "Access is denied with HTTP 403.",
      "PASSED"
    ],
    [
      "AZ-S2-03",
      "AuthZ / QA",
      "US-16",
      "Permitted Request View",
      "Requester retrieves their own join request details.",
      "Own permitted request is accessible and returned.",
      "PASSED"
    ],
    [
      "AZ-S2-04",
      "AuthZ / QA",
      "US-15",
      "Ownership Self-Request",
      "Offer owner attempts to join own ride offer.",
      "Action is blocked by server-side ownership validation.",
      "PASSED"
    ],
    [
      "AZ-S2-05",
      "AuthZ / QA",
      "US-16",
      "Direct API Tampering",
      "User tampers with request ID parameter to decide another's req.",
      "Access is denied with HTTP 403 Forbidden.",
      "PASSED"
    ],
    [
      "ST-S2-01",
      "Security / QA",
      "US-13-16",
      "Protected Endpoints",
      "Access protected API routes without Authorization header.",
      "Blocked with HTTP 401 Unauthorized across all endpoints.",
      "PASSED"
    ],
    [
      "ST-S2-02",
      "Security / QA",
      "US-16",
      "Privacy Data Exposure",
      "Non-owner inspects public offer endpoint.",
      "Private driver/requester contact details not exposed.",
      "PASSED"
    ]
  ];

  renderHeading("2. Complete Test Cases & Execution Matrix");
  renderQATable(testMatrixData);

  renderHeading("3. Automated Execution Output");
  renderParagraph(
    "Automated execution performed via Jest test runner: 20/20 test cases in sprint2-qa-matrix.test.js passed cleanly. Total server test matrix across all sprints stands at 96 passed tests across 7 test suites (Sprint 1, Sprint 2 TDD/UT, Sprint 2 QA, Sprint 3 TDD/UT, Sprint 3 AUTO, Validators, Auth)."
  );

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).font("Helvetica").fillColor(textMuted);
    doc.text(
      `Sprint 2 QA Test Report | Page ${i + 1} of ${range.count}`,
      leftX,
      doc.page.height - 18,
      { align: "center", width: contentWidth }
    );
  }

  doc.end();
  writeStream.on("finish", () => {
    console.log(`Sprint 2 QA Report finalized: ${range.count} pages at ${outputPath}`);
  });
}

generateQAReport();
