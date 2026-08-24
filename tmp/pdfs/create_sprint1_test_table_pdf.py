from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from pathlib import Path

project = Path(r"C:\Users\misal\OneDrive\Documents\git remote\ICBT_Carpooling_System")
out = project / "output" / "pdf" / "sprint1-developer-test-case-table.pdf"
evidence = Path(r"C:\Users\misal\AppData\Local\Temp\codex-clipboard-075e0f86-d0a7-4d59-844d-d4f968996851.png")

font_name = "Helvetica"
bold_font = "Helvetica-Bold"
try:
    arial = Path(r"C:\Windows\Fonts\arial.ttf")
    arial_bold = Path(r"C:\Windows\Fonts\arialbd.ttf")
    if arial.exists() and arial_bold.exists():
        pdfmetrics.registerFont(TTFont("Arial", str(arial)))
        pdfmetrics.registerFont(TTFont("Arial-Bold", str(arial_bold)))
        font_name = "Arial"
        bold_font = "Arial-Bold"
except Exception:
    pass

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "TitleCustom", parent=styles["Title"], fontName=bold_font, fontSize=18,
    leading=22, textColor=colors.HexColor("#111827"), spaceAfter=10
)
subtitle_style = ParagraphStyle(
    "SubtitleCustom", parent=styles["BodyText"], fontName=font_name, fontSize=9,
    leading=12, textColor=colors.HexColor("#4b5563"), spaceAfter=10
)
cell_style = ParagraphStyle(
    "Cell", parent=styles["BodyText"], fontName=font_name, fontSize=6.4,
    leading=7.8, textColor=colors.HexColor("#111827"), alignment=TA_LEFT
)
header_style = ParagraphStyle(
    "Header", parent=cell_style, fontName=bold_font, fontSize=6.4,
    leading=7.8, textColor=colors.white, alignment=TA_CENTER
)
small_style = ParagraphStyle(
    "Small", parent=styles["BodyText"], fontName=font_name, fontSize=8,
    leading=10, textColor=colors.HexColor("#374151"), spaceAfter=8
)

summary = (
    "This developer test case table documents the Sprint 1 automated TDD, unit, and API tests created and executed at code level. "
    "The tests were executed using Jest through npm test. The terminal evidence confirms 3 passed test suites and 24 passed automated tests."
)

columns = [
    "Test ID", "Related User Story", "Feature/Module", "Test Scenario", "Test Data",
    "Test Steps / Test Script", "Expected Result", "Actual Result", "Status", "Evidence Reference"
]
rows = [
    ["UT-01", "User registration/login", "Email validation", "Reject invalid email addresses", "student@gmail.com; student@icbt.lk", "Run automated validator test in server/__tests__/validators.test.js", "Only valid ICBT email is accepted", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-02", "User registration", "Password validation", "Reject weak password and mismatched passwords", "short; mismatched confirm password", "Run automated validator test in server/__tests__/validators.test.js", "Validation errors returned", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-03", "User registration", "Registration API", "Block duplicate email registration", "Existing registered email", "Run API test in server/__tests__/sprint1-api.test.js", "API returns duplicate email error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["TDD-01", "User registration", "Registration API", "Create account with valid details", "Valid ICBT email, password, profile data", "Run API test in server/__tests__/sprint1-api.test.js", "Account, token, and profile are created", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["TDD-02", "User registration", "Registration API", "Reject registration with invalid email", "Invalid email address", "Run API test in server/__tests__/sprint1-api.test.js", "API returns validation error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-04A", "Authentication", "Password security", "Hash passwords and verify without storing plain text", "Password123", "Run auth unit test in server/__tests__/auth.test.js", "Password hash differs from plain text and verifies correctly", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-04B", "User registration", "Password security", "Store hashed registration password", "New user registration payload", "Run API test in server/__tests__/sprint1-api.test.js", "Database stores hash, not plain password", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-05", "User login", "Login API", "Authenticate valid login credentials", "Existing email and correct password", "Run API test in server/__tests__/sprint1-api.test.js", "API returns 200 and token", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-06", "User login", "Login API", "Reject incorrect password", "Existing email and wrong password", "Run API test in server/__tests__/sprint1-api.test.js", "API returns unauthorized response", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-07", "Authentication", "Protected routes", "Deny access without token", "No authorization token", "Run API test in server/__tests__/sprint1-api.test.js", "API returns unauthorized response", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["TDD-06", "Profile handling", "Profile API", "Display authenticated user's own profile", "Valid driver token", "Run API test in server/__tests__/sprint1-api.test.js", "Own user/profile data is returned", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["TDD-07", "Profile handling", "Profile API", "Update valid profile details", "Valid profile update payload", "Run API test in server/__tests__/sprint1-api.test.js", "Profile and user name update successfully", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-08A", "Profile handling", "Profile validation", "Reject invalid profile data", "Empty first name / phone number", "Run automated validator test in server/__tests__/validators.test.js", "Validation errors returned", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-08B", "Profile handling", "Profile API", "Reject invalid profile update data", "Invalid profile payload", "Run API test in server/__tests__/sprint1-api.test.js", "API returns validation error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-09", "Privacy access control", "Profile privacy", "Deny access to another user's profile", "Driver token requesting passenger profile", "Run API test in server/__tests__/sprint1-api.test.js", "API returns forbidden response", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-10A", "Ride-offer creation", "Ride validation", "Reject ride offer with zero seats", "availableSeats: 0", "Run automated validator test in server/__tests__/validators.test.js", "Validation error returned", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-10B", "Ride-offer creation", "Ride API", "Reject ride offer with zero seats", "Driver token, zero seats", "Run API test in server/__tests__/sprint1-api.test.js", "API returns validation error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-11", "Ride-offer creation", "Ride API", "Reject ride offer with negative seats", "Driver token, availableSeats: -1", "Run API test in server/__tests__/sprint1-api.test.js", "API returns validation error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-12", "Ride-offer creation", "Ride API", "Reject ride offer missing origin", "Empty origin", "Run API test in server/__tests__/sprint1-api.test.js", "API returns validation error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-13", "Ride-offer creation", "Ride API", "Reject ride offer missing destination", "Empty destination", "Run API test in server/__tests__/sprint1-api.test.js", "API returns validation error", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-14", "Ride-offer creation", "Ride API", "Link created ride offer to authenticated driver", "Valid ride offer payload + driver token", "Run API test in server/__tests__/sprint1-api.test.js", "Created offer contains authenticated driver ID", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-15", "Ride-offer listing", "Ride API", "Return only active offers for authenticated driver", "Driver token with active/completed offers", "Run API test in server/__tests__/sprint1-api.test.js", "Only active own offers are returned", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["UT-16", "Authorization", "Driver-only access", "Deny passenger access to ride-offer creation", "Passenger token + ride payload", "Run API test in server/__tests__/sprint1-api.test.js", "API returns forbidden response", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
    ["API-17", "Privacy access control", "Ride details API", "Return only authenticated driver's own ride detail", "Own ride ID and another driver's ride ID", "Run API test in server/__tests__/sprint1-api.test.js", "Own offer returns success; other driver's offer is blocked", "Passed in Jest npm test", "Passed", "Terminal screenshot: npm test passed"],
]

story = []
doc = SimpleDocTemplate(
    str(out), pagesize=landscape(A3), rightMargin=0.35*inch, leftMargin=0.35*inch,
    topMargin=0.35*inch, bottomMargin=0.35*inch
)
story.append(Paragraph("Sprint 1 Developer Test Case Table", title_style))
story.append(Paragraph(summary, subtitle_style))
story.append(Paragraph("Evidence reference for all rows: terminal screenshot showing npm test completed successfully with 3 passed test suites and 24 passed tests.", small_style))

wrapped = [[Paragraph(col, header_style) for col in columns]]
for row in rows:
    wrapped.append([Paragraph(str(item), cell_style) for item in row])

col_widths = [0.62*inch, 1.15*inch, 1.05*inch, 1.75*inch, 1.35*inch, 1.95*inch, 1.55*inch, 1.1*inch, 0.62*inch, 1.35*inch]
table = Table(wrapped, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2563eb")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), bold_font),
    ("FONTNAME", (0,1), (-1,-1), font_name),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("ALIGN", (0,0), (-1,0), "CENTER"),
    ("ALIGN", (8,1), (8,-1), "CENTER"),
    ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#d1d5db")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f9fafb")]),
    ("LEFTPADDING", (0,0), (-1,-1), 3),
    ("RIGHTPADDING", (0,0), (-1,-1), 3),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(table)

if evidence.exists():
    story.append(PageBreak())
    story.append(Paragraph("Automated Test Execution Evidence", title_style))
    story.append(Paragraph("Terminal screenshot captured after executing npm test. It shows all Sprint 1 developer test suites and tests passed successfully.", subtitle_style))
    img = Image(str(evidence))
    max_w = landscape(A3)[0] - 0.9*inch
    max_h = landscape(A3)[1] - 1.8*inch
    scale = min(max_w / img.imageWidth, max_h / img.imageHeight)
    img.drawWidth = img.imageWidth * scale
    img.drawHeight = img.imageHeight * scale
    story.append(img)

def footer(canvas, doc_obj):
    canvas.saveState()
    canvas.setFont(font_name, 7)
    canvas.setFillColor(colors.HexColor("#6b7280"))
    canvas.drawRightString(landscape(A3)[0] - 0.35*inch, 0.18*inch, f"Page {doc_obj.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(out)