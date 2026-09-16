# CUT OS Design System

**Platform:** native iOS through Expo and React Native
**Mode:** Operate
**Design dials:** variance 5/10, motion 3/10, density 7/10

The local recommendation database correctly classified CUT OS as a Calorie & Nutrition Counter, but its automatically selected web portfolio layout, web fonts, CSS, and GSAP motion do not apply to this native app. This document records the native system that supersedes those mismatched suggestions.

## Direction

CUT OS is a precise daily control surface for a cut or recomp. It keeps the existing electric-blue identity and replaces the current long checklist with familiar iOS information architecture. The interface is data-first, quick to scan, and quiet enough to use several times a day.

**Owner-selected direction:** Concept A, **CUT Command**, selected September 4, 2026. Concept B's dense diary structure is retained inside Food; Concept C is not the active visual direction.

## Navigation

- Use a native bottom tab bar for four top-level destinations: Today, Food, Training, Progress.
- Use a visually prominent center Add action associated with the tab bar, but do not make it a navigation destination.
- Top-level screens use large titles. Details use a navigation stack with an inline title and standard back behavior.
- Self-contained logging tasks use sheets with explicit Cancel and Add or Save actions.
- Profile and Settings are secondary destinations opened from the top-right account control.
- Preserve iOS edge-swipe back and state when returning from search or a logging sheet.

## Color

Use semantic tokens from `constants/colors.ts` with system appearance support.

- Light background: cool near-white, not tinted wellness green.
- Dark background: deep navy, not pure black.
- Interactive tint: CUT electric blue.
- Macro colors are supporting data colors only: protein blue, carbs amber, fat violet, fiber green.
- Success, warning, and error always include text or an icon, never color alone.
- One primary action per screen.

## Typography

- Use the iOS system font for all navigation, labels, controls, body text, and data.
- Use Dynamic Type-compatible roles rather than one-off sizes.
- Large title for top-level screens, title and headline for groups, body for supporting copy, caption for metadata.
- Use tabular figures for calories, macros, weight, sets, reps, and time.
- Avoid display fonts, monospace-as-decoration, uppercase micro-labels, and paragraphs inside log rows.

## Shape and Depth

- Cards and grouped surfaces use a consistent 16-point radius.
- Buttons use 14 points; compact chips may use full-pill radius.
- Use cards only for real grouping. Prefer spacing and separators for diary rows and search results.
- Use one subtle tinted shadow level for elevated summary surfaces. Sheets and bars use platform materials.
- Never nest a card inside another card.

## Spacing and Sizing

- Base rhythm: 4, 8, 12, 16, 24, 32 points.
- Phone horizontal gutter: 16 points. Increase on large devices.
- Touch targets: minimum 44 by 44 points with at least 8 points between adjacent targets.
- Reserve content insets for the tab bar, home indicator, keyboard, and any fixed action bar.
- No horizontal page scrolling. Horizontal chip groups may scroll when labeled and non-critical.

## Core Screen Contracts

### Today

- First viewport: date, calorie balance, macro progress, and immediate logging actions.
- Diary meal groups show logged items and an Add Food action without long recipe copy.
- Weight and training summaries remain compact and link to their destination.
- Empty, loading, error, and offline states keep the next action visible.

### Food

- Search is reachable at the top.
- First actions: Search, Barcode, Photo (Pro), Manual.
- Then show Recent, Favorites, My Foods, My Meals, and Suggested options.
- A result row exposes name, serving, calories, and macros. Details and portion editing appear before final Add.
- Fixed recipe presets become optional suggestions, never the entire catalog.

### Training

- Show today’s workout or a clear empty state with Start Workout.
- Logging supports exercise, sets, reps, load, duration, and notes as applicable.
- Recent routines and previous performance reduce repeat entry.

### Progress

- Lead with weight trend and change over a chosen time range.
- Pair the chart with exact values and a text summary.
- Keep nutrition consistency and training summaries below the primary trend.
- Empty charts teach the first logging action.

## Interaction and Motion

- Tap feedback appears within 100 ms using opacity, color, or stable scale without layout shift.
- Standard micro-interactions last 150-250 ms and communicate state only.
- Use native push, sheet, and tab transitions. No page-load choreography or decorative infinite animation.
- Honor Reduce Motion with instant or crossfade alternatives.
- Async actions disable repeat submission and show inline progress.
- Barcode and photo permissions are requested only when the person chooses those actions.

## Accessibility

- VoiceOver reading order matches the visual hierarchy.
- Icon-only controls have clear accessibility labels and 44-point hit areas.
- Dynamic Type may wrap labels; critical values and actions must not clip.
- Text meets 4.5:1 contrast; large text and meaningful graphics meet at least 3:1.
- Charts include direct values and a text summary.
- Forms have visible labels, useful keyboard types, errors below the field, and a clear recovery path.

## Mobbin Evidence Applied

- Yazio Diary: compact calorie and macro summary above meal groups, plus persistent top-level navigation.
- MyFitnessPal Diary Log: visible meal-level Log actions and a central quick-add entry point.
- MyFitnessPal Add Food: search, My Meals, My Recipes, My Foods, and repeat-entry shortcuts.
- MacroFactor Scan: scan, search, AI, and quick-add modes remain visible while nutrition details are reviewed.
- Cal AI and Noom: barcode and camera entry are visible without replacing text search.
- Noom, Withings, and Bevel: time-range controls, exact weight values, goal context, and a readable trend summary.

## Pre-Delivery Gate

- Test on a small and large iPhone, portrait and landscape.
- Test light and dark appearances, Reduce Motion, and large Dynamic Type.
- Confirm safe areas and keyboard avoidance.
- Confirm every control is at least 44 points and every async action has feedback.
- Capture real Simulator screenshots. A successful build alone is not visual acceptance.
- Run one visual review, apply one batched fix pass, and confirm once more.
