# Design QA — Framed iPhone responsiveness

## Evidence

- Source visual truth: `/var/folders/r1/jwxx9y5d4fl_3zqd47m2gr8m0000gn/T/TemporaryItems/NSIRD_screencaptureui_FXbX5P/截屏2026-09-17 16.44.52.png`.
- Source pixels: 786 × 1560; state is the Journal screen, scrolled to Recent Journeys, with one user-created check-in.
- Implementation: `http://127.0.0.1:4173/`.
- Wide-host capture: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/journal-wide-seeded-after-fix.png`.
- Narrow-host capture: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/journal-narrow-after-fix.png`.
- Side-by-side comparison: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/journal-reference-vs-fixed.png`.
- CSS phone screen: 393 × 852 px at deviceScaleFactor 1. Visual comparison capture used deviceScaleFactor 2 to match the reference's high-density raster.

## Viewports and measured layout

- Wide host: 1400 × 1200. Phone screen 393 × 852; Journal shell 393 px; shell padding 16 px on both sides; hero and Recent Journey cards 361 px wide.
- Narrow host: 620 × 1200. Phone screen 393 × 852; Journal shell 393 px; shell padding 16 px on both sides; hero and Recent Journey cards 361 px wide.
- Both hosts computed the Journal grid as one 361 px column and each memory card as `130px 229px`.
- No Vite error overlay, console error, or page error was detected in either host viewport.

## Full-view and focused comparison

- The supplied reference and revised wide-host capture were placed in one side-by-side comparison image.
- The phone content now reaches the same 16 px inner margin as the reference instead of inheriting the desktop `clamp(..., 4vw, 54px)` padding from the outer browser.
- The Journal hero, statistics, actions, tools, section heading, and Recent Journey cards retain the phone layout when the outer browser is wider than 700 px.
- The focused Recent Journeys region matches the reference's single-column horizontal-card anatomy, image crop, radii, typography hierarchy, ivory surface, and acid-green navigation state.

## Fidelity surfaces

- Fonts and typography: system Chinese type, weights, wrapping, and hierarchy match the existing local reference.
- Spacing and layout rhythm: 16 px phone gutters and 361 px content width are identical at both tested outer widths.
- Colors and tokens: existing ivory, dark ink, muted gray, and acid-green tokens are unchanged.
- Image quality: original Shanghai assets are retained and use the same crops as the reference.
- Copy and content: Journal labels and seeded check-in state match the reference; no product copy was changed.

## Comparison history

1. P1: framed iPhone content inherited desktop viewport padding and collapsed to a narrow centered column on wide hosts. Fixed by scoping the full phone shell width and 16 px gutters to `.mobile-app-viewport`.
2. P1: Recent Journeys inherited the desktop three-column grid on wide hosts. Fixed by scoping the single-column grid and horizontal card anatomy to `.mobile-app-viewport`.
3. P2: Journal heading, hero, statistics, and action controls still depended on the outer 700 px media query. Fixed by adding explicit phone-container rules for those components.
4. Post-fix evidence: wide and narrow hosts now produce identical measurements and visually equivalent phone layouts.

## Verification

- `npm run check:runtime`: passed.
- `npm run build`: passed.
- `npm run test:sites`: 4/4 passed.
- Primary interaction tested: open Journal from bottom navigation and scroll through Recent Journeys.

No actionable P0, P1, or P2 findings remain for this responsive-layout defect.

## Simulated-pointer regression check

- Root cause: the template-owned `.mobile-cursor` was at `z-index: 80`, below activity navigation (`96`), modal surfaces (`100–150`), and the full-screen AI page (`220`). Pointer tracking and clicks continued to work, but the visible circle was covered.
- Fix: `.device-screen > .mobile-cursor` is now kept at `z-index: 400`, above every app-owned secondary surface.
- Activity-detail evidence: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/cursor-activity-detail-after-fix.png` (`400 > 96`).
- Check-in modal evidence: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/cursor-modal-after-fix.png` (`400 > 100`).
- Full-screen AI evidence: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/cursor-ai-after-fix.png` (`400 > 220`).
- All three states report the pointer as visible with opacity `1`; no page or console errors were detected.

final result: passed
