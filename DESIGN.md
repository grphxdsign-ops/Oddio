# OddioAI Design Context

## Scene

A learner is practicing with a phone on a music stand in a warm room, glancing between the instrument, the source notation site, and OddioAI feedback. The UI should feel clear, physical, and slightly mischievous, not like enterprise software wearing a guitar pick.

## Palette

- Base: warm off-paper `#F6F3EA`.
- Ink: charcoal green `#18201C`.
- Primary accent: deep practice green `#2E7D6E`.
- Correction accent: muted rust `#C84C31`.
- Gold status: `#D9B44A`.

## Typography

- Use native mobile sans-serif for now.
- Keep headers compact and strong.
- Keep coaching text readable at 13-17 px with 19-23 px line height.

## Components

- Cards are only for selectable references and functional panels.
- Source references must clearly say the app links out and does not reproduce notation.
- Buttons use icons plus direct command labels.
- Controls need stable `testID` props for Detox.

## Motion

- Use restrained tactile press states.
- Do not animate layout dimensions.
- Prefer immediate practice feedback over decorative motion.

## Review Rules

- No copied notation in the app.
- No generated song tablature or sheet music.
- No dark-blue or purple AI default theme.
- No jokes without correction.
- No UI copy that hides legal/source ownership.
