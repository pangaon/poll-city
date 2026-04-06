# Video Walkthrough: Voice Communications + Phone Banking
Duration: ~4 minutes
Feature: Voice Broadcasts, Phone Banking, Call Center Integration

## Script

### Scene 1: Opening (0:00 - 0:10)
VOICE: "When you need to reach thousands of supporters in one day, voice is your channel. Robocalls for announcements, IVR polls for voter ID, and phone banking for personal contact."

### Scene 2: Voice Broadcasts (0:10 - 0:50)
VOICE: "Go to Communications and create a Voice Broadcast. Choose your type — robocall for a pre-recorded message, voice drop for voicemail-only, or IVR poll where voters press 1 for support, 2 for undecided, 9 to opt out. Upload your audio file, set your caller ID — must be a valid Canadian number — and schedule it."

### Scene 3: CRTC Compliance (0:50 - 1:15)
VOICE: "Poll City enforces CRTC rules automatically. Calls only go out between 9am and 9:30pm. Your campaign is identified within 30 seconds. Every call offers an opt-out. The internal do-not-call list is checked before every broadcast."

### Scene 4: IVR Results (1:15 - 1:40)
VOICE: "When a voter presses 1 for supporter, their contact record updates in real time. You can see results flowing in as the broadcast runs. Press 9 to opt out — they are added to your do-not-call list immediately."

### Scene 5: Phone Banking (1:40 - 2:30)
VOICE: "Phone banking is personal. Your volunteer opens Poll City in their browser, starts a session, and calls voters one by one. The call goes through Twilio — the voter sees your campaign number, never the volunteer's personal number."
VOICE: "After each call, the volunteer taps the result — answered, not home, voicemail. If they spoke to the person, they set the support level. One tap, logged immediately."

### Scene 6: Call Center Integration (2:30 - 3:10)
VOICE: "Using CallHub or another call centre? Connect it. Poll City gives you a webhook URL. Every call result from your call centre automatically matches to a contact in Poll City and logs the interaction. No manual data entry."

### Scene 7: Closing (3:10 - 3:30)
VOICE: "Voice is your most persuasive channel after face-to-face. Use robocalls for announcements and GOTV. Use phone banking for voter ID and persuasion. And always — always — respect the opt-out."

## Verification Checklist
- [ ] Voice broadcast creation works
- [ ] CRTC compliance check blocks non-compliant sends
- [ ] IVR responses update contact support level
- [ ] Opt-out (press 9) works
- [ ] Phone banking token generates
- [ ] Phone banking session flow works (start, next contact, log result, end)
- [ ] Call center webhook receives and matches contacts
