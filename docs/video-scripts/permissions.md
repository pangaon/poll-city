# Video Walkthrough: Enterprise Permissions
Duration: ~4 minutes
Feature: Team Management (#28), Permissions (#47), Feature Flags (#29)

## Script

### Scene 1: Opening (0:00 - 0:15)
VOICE: "Not everyone on your campaign needs access to everything. A canvasser does not need to see donor names. A finance officer does not need to manage turfs. Poll City's enterprise permissions system gives every person exactly the access they need."

### Scene 2: Default Roles (0:15 - 0:50)
SCREEN: Settings > Team > Permissions
VOICE: "Poll City ships with 12 roles — from Super Admin down to Viewer. Campaign Admin sees everything. Campaign Manager runs day-to-day operations. Field Director manages canvassing. Finance Officer handles donations and budget. Canvasser sees their walk list and nothing else."
ACTION: Show the role cards

### Scene 3: 55 Granular Permissions (0:50 - 1:20)
VOICE: "Each role has toggleable permissions across 8 categories — Contacts, Team, Finance, Communications, Operations, Analytics, Administration, and Adoni AI. Click any role to see and toggle individual permissions."
ACTION: Expand a role card, show permission toggles by category

### Scene 4: Trust Levels (1:20 - 1:50)
VOICE: "Trust levels add a second layer. Level 1 is restricted — new joiners. Level 3 is trusted — they see aggregate campaign data. Level 5 is full trust — admin-level visibility. A canvasser at trust 1 sees their turf. The same canvasser at trust 3 sees campaign-wide stats."
ACTION: Show trust level slider on a member

### Scene 5: Custom Roles (1:50 - 2:15)
VOICE: "Need a role that does not exist? Create a custom one. Neighbourhood Captain — canvassing read and write, volunteer management, but no finance access. Copy permissions from an existing role and adjust."
ACTION: Create Custom Role button, copy from existing

### Scene 6: Adoni Permission Firewall (2:15 - 2:45)
VOICE: "Adoni respects permissions. A canvasser asks Adoni 'how much have we raised?' Adoni says 'That information is restricted to your campaign manager.' A finance officer asks 'what is our support rate?' Adoni answers with real numbers. The AI knows what each person is allowed to see."

### Scene 7: Audit Log (2:45 - 3:15)
VOICE: "Every permission change is logged. Who changed whose role, when, and why. This is your accountability trail — essential for campaign integrity."
ACTION: Show audit log entries

### Scene 8: Closing (3:15 - 4:00)
VOICE: "Start with the default roles. Adjust as your team grows. Trust your core team with higher levels. And remember — security is not about distrust. It is about making sure nobody accidentally sends a campaign-wide email at 2am."

## Verification Checklist
- [ ] Role list loads with 12 default roles
- [ ] Permission toggles work per role
- [ ] Trust level slider updates correctly
- [ ] Custom role creation works (with copy)
- [ ] Adoni respects permission firewall
- [ ] Member role change works
- [ ] Audit log shows permission changes
- [ ] Feature flags reflect tier correctly
