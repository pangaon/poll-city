# App Store Submission — Poll City Canvasser

## App Information
Name: Poll City Canvasser
Subtitle: Campaign Field Operations
Category: Business
Content Rating: 4+
Primary Language: English (Canada)

## Bundle Identifiers
iOS:     ca.pollcity.canvasser
Android: ca.pollcity.canvasser

## Description (App Store / Google Play)

Poll City Canvasser is the field operations tool for political campaign teams.

Canvassers use Poll City to:
- Access their assigned neighbourhood turf and walk list
- Record door knock results at each address
- Log supporter levels, notes, and follow-ups
- Work offline — all data syncs automatically when reconnected

Designed for Canadian federal, provincial, and municipal campaigns.

**For campaign teams:**
Poll City Canvasser connects to your Poll City campaign dashboard. Canvassers
receive their turf assignment from the campaign manager and can start knocking
doors immediately — no training required.

## Keywords
canvassing, political campaign, door knocking, voter outreach, field operations,
campaign management, GOTV, election, volunteer, canvasser

## What's New (Version 1.0.0)
Initial release of Poll City Canvasser.
- Door-by-door walk list with offline support
- 6 outcome buttons: Supporter, Leaning, Undecided, Against, Not Home, Refused
- Sync queue — works without connectivity, syncs when reconnected
- Campaign manager dashboard integration

## App Store Review Notes

**Access:**
This app requires an invitation from a campaign administrator to access.
Demo credentials for App Store review: [to be provided via App Store Connect notes before submission]
The app connects to poll.city — a Canadian civic technology platform.

**Core flow to test:**
1. Launch app → login screen appears
2. Enter email + password → lands on Canvassing tab
3. Walk list shows contacts sorted by street
4. Tap a contact → modal with outcome buttons
5. Select "Not Home" → toast appears ("Saved offline" or "Visit recorded")
6. Pull to refresh → list reloads

**Offline mode:**
Disable network → tap a contact → select outcome → shows "Saved offline"
Re-enable network → sync banner appears → tap Sync → interactions submit

## Privacy Policy URL
https://www.poll.city/privacy

## Support URL
https://www.poll.city/help

## Marketing URL
https://www.poll.city/canvasser

## Age Rating Questionnaire
- No user-generated content shared publicly
- No social networking features
- No gambling
- No violence, nudity, or mature content
- Rating: 4+

## App Store Connect Checklist
- [ ] EAS project ID set in eas.json
- [ ] Apple Developer team ID set in eas.json
- [ ] App Store Connect app record created (ascAppId)
- [ ] Privacy policy URL live at https://www.poll.city/privacy
- [ ] Demo credentials added to App Store review notes
- [ ] App icon 1024x1024 PNG uploaded (no alpha channel)
- [ ] Screenshots: iPhone 6.9" (required), iPhone 6.5", iPad Pro 12.9" (if tablet supported)
- [ ] Android: Play Console listing created, production track configured
- [ ] EXPO_PUBLIC_API_URL set to production URL in EAS production build profile
