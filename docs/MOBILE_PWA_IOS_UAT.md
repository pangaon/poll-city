# Mobile PWA iOS UAT Runbook

Date: 2026-04-06
Owner lane: GPT-Codex (UI/mobile)
Scope: iPhone/PWA shell + Adoni mobile behavior

## Target Device Profiles

1. iPhone 12/13/14 viewport: `390x844`
2. iPhone SE viewport: `375x667`
3. PWA standalone mode from Home Screen

## Preconditions

1. User is authenticated and has active campaign access.
2. App installed to iOS Home Screen (PWA) for standalone checks.
3. Test paths:
- `/dashboard`
- `/contacts`
- `/canvassing/walk`

## Navigation and Shell Checks

1. Launch PWA from Home Screen.
Expected:
- App opens to authenticated flow without clipped top area.
- Content is fully visible with safe-area handling.

2. On `375px` width, verify top bar.
Expected:
- Hamburger button is visible and tappable.
- User avatar menu remains usable.

3. Tap hamburger.
Expected:
- Mobile "More" menu opens.
- Navigation links are scrollable and selectable.

4. Bottom mobile nav behavior.
Expected:
- Bottom tabs remain fixed.
- Safe-area inset is respected.

## Adoni Mobile Checks

1. On `/contacts`, observe bubble.
Expected:
- Bubble is compact (48px) and bottom-center.
- Bubble does not block primary action areas.

2. Scroll page continuously.
Expected:
- Bubble auto-hides during scroll.
- Bubble returns shortly after scroll stops.

3. Focus an input field (keyboard open).
Expected:
- Bubble hides while keyboard is open.
- Bubble reappears after keyboard closes.

4. Open `/canvassing/walk`.
Expected:
- Adoni appears as thin bar style, not full bubble.

## Viewport Stability Checks

1. Rotate portrait/landscape and back to portrait.
Expected:
- No permanent content clipping.
- Main content area remains scrollable.

2. Trigger long content scrolls in dashboard/cards.
Expected:
- No bounce-lock causing blocked interaction.

## Exit Criteria

1. All checks pass on at least one `375px` profile and one modern iPhone profile.
2. Any failure includes path + screenshot + reproduction steps in coordination thread.
3. Once pass is recorded, close the 17:50 mobile/PWA directive as resolved.
