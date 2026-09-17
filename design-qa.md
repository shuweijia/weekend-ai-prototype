# Design QA

## Evidence

- Source visual truth: `/Users/shuweijia/Downloads/截屏2026-09-17 14.36.09.png`.
- Source pixels: 1080 × 1814. The source includes the full iPhone bezel and the Explore screen.
- Implementation URL and live screenshot target: `http://localhost:4173/`, captured in the Codex in-app Browser after the change. The browser integration exposes the capture inline rather than as a filesystem artifact.
- Supporting implementation screen artifact: `/Users/shuweijia/找工作/美团面试/weekend-ai-prototype/qa/20-home-v2-mobile.png` (390 × 844 px).
- CSS device geometry: iPhone frame 511 × 968 CSS px with a 393 × 852 CSS px app screen; device scale is responsive and remained proportional in every tested viewport.
- Density normalization: the source and browser captures were compared as full framed-phone compositions. App-owned content was additionally checked at the runtime's 393 × 852 CSS geometry so browser scaling did not create false spacing findings.

## States and viewports checked

- Default public route at 1280 × 720: iPhone preview visible, device selector visible, `网页版本` control visible.
- Default public route at 390 × 844: iPhone preview scales without horizontal clipping; both top-right controls remain reachable.
- Web version at 1280 × 720: content expands to the available page width and the view switch does not cover the bookmark control.
- Web version at 390 × 844: the header shifts below the fixed switch; the full page title and bookmark control remain visible.
- State at handoff: switched back to the default iPhone preview.

## Full-view comparison evidence

- The default route now matches the source's framed-iPhone presentation rather than opening the responsive web layout first.
- The iPhone bezel, live status bar, dynamic island, app viewport, home indicator, and fixed bottom navigation remain owned by the protected runtime and retain their calibrated proportions.
- On portrait viewports, the phone uses nearly the full available width while keeping the bezel intact; there is no horizontal overflow or accidental crop.
- On desktop viewports, the web mode expands cards into a two-column feed and increases the content ceiling to 1440 px, materially reducing unused side space.

## Focused region comparison evidence

- Top-right preview controls were checked separately because they sit outside the phone frame. The iPhone/Pixel selector and the new web/iPhone view switch remain distinct, readable, and non-overlapping.
- The web header was checked at both desktop and 390 px. Its title, profile, bookmark, search, people/budget control, and category filters remain visible after reserving space for the switch.
- The Explore screen's typography, ivory/acid palette, Shanghai photography, card crop, metadata, and fixed navigation were visually checked against the supplied screenshot.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested display-mode change.
- Fonts and typography: Chinese system typography and hierarchy are preserved; no title clipping remains in the tested iPhone or web states.
- Spacing and layout rhythm: the framed phone remains proportionally scaled, controls clear each other, and the web feed now uses the wider canvas.
- Colors and visual tokens: ivory canvas, dark text, white surfaces, and acid-green emphasis remain consistent with the source.
- Image quality: existing Shanghai assets remain sharp, cover their card slots correctly, and are not replaced by placeholders.
- Copy and content: the public switch labels are `网页版本` and `iPhone 版本`; existing product copy remains unchanged.

## Primary interactions tested

- Load `/` and confirm iPhone is the default mode.
- Switch iPhone → web and verify the responsive layout.
- Switch web → iPhone and verify the framed preview returns.
- Resize across 1280 × 720 and 390 × 844 while checking control reachability and layout clipping.

## Console and runtime checks

- Browser console errors/warnings: none.
- `npm run check:runtime`: passed.
- `npm run build`: passed.
- `npm run test:sites`: 4/4 passed.

## Comparison history

1. P1 found: the public root rendered the responsive app directly while the requested default was iPhone. Fixed by making the framed iPhone runtime the root default and passing explicit framed-preview state into the prototype.
2. P2 found: web mode used a narrower 1180 px ceiling and left avoidable side space. Fixed by raising the web-mode content ceiling to 1440 px.
3. P2 found: the first desktop web capture showed the fixed mode switch competing with the bookmark control. Fixed by reserving right-side header space; the revised 1280 × 720 capture shows both controls separately.
4. P2 found: applying that reservation at 390 px truncated the title. Fixed by placing the mobile web header below the switch and restoring normal horizontal padding; the revised capture shows the full title.

## Follow-up polish

- P3: a landscape desktop viewport will naturally show space around a portrait phone. The responsive web switch is the intended full-width alternative and is always available in the top-right corner.

final result: passed
