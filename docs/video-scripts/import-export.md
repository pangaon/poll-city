# Video Walkthrough: Import & Export
Duration: ~3 minutes
Feature: Smart Import, Targeted Export (#27)

## Script

### Scene 1: Opening (0:00 - 0:10)
VOICE: "Getting your voter list into Poll City is the first thing you do. Getting targeted lists out is how you win."

### Scene 2: Smart Import (0:10 - 0:50)
SCREEN: Click Import/Export in sidebar
VOICE: "Click Import. Drag your CSV or Excel file. Poll City analyzes your columns and maps them automatically — first name, last name, phone, address, postal code. Review the mapping, adjust if needed."
ACTION: Upload a file, show column mapping

### Scene 3: Background Processing (0:50 - 1:15)
VOICE: "Hit Import. Large files process in the background — you get a progress bar. 500 rows at a time, with automatic deduplication. If someone is already in your database, Poll City updates them instead of creating a duplicate."

### Scene 4: Rollback (1:15 - 1:35)
VOICE: "Made a mistake? You have 24 hours to rollback any import. Every contact created by that import gets removed. Clean and safe."

### Scene 5: Targeted Export (1:35 - 2:15)
VOICE: "Export is where it gets powerful. Choose what to export — contacts, walk list, signs, GOTV, volunteers, or donations. Then filter. Show me only undecided voters on Oak Street with a phone number who have not been contacted in 14 days. Download as CSV."
ACTION: Show filter options

### Scene 6: Walk List Export (2:15 - 2:40)
VOICE: "The Walk List export is designed for the field. Name, address, phone, support level, notes — sorted by street for efficient door-to-door. Print it or load it on a tablet."

### Scene 7: Closing (2:40 - 3:00)
VOICE: "Import your voter list on day one. Export targeted lists every week. The data is only useful if it is in the system and it is in the right hands."

## Verification Checklist
- [ ] File upload accepts CSV and Excel
- [ ] Column auto-mapping works
- [ ] Background processing shows progress
- [ ] Deduplication works (update not duplicate)
- [ ] Rollback within 24 hours works
- [ ] Targeted export filters work (street, ward, support, phone/email)
- [ ] CSV download is well-formatted
