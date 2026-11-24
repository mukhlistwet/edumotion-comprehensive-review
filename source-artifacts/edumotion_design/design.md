# EduMotion — Frontend Design System

**Document:** `design.md`  
**Version:** 1.0.0  
**Status:** Baseline design standard  
**Product:** Gamified Mathematics & Physics Learning Platform  
**Platforms:** Web, Android, iOS  
**Visual direction:** Friendly, energetic, academic, clear, accessible

---

## 1. Design principles

1. **Learning first:** visual decoration must never compete with the question, formula, diagram, or learning objective.
2. **Friendly, not childish:** use approachable colors, rounded surfaces, clear illustrations, and concise copy. The interface must also feel appropriate for university students.
3. **Progress is visible:** show lesson progress, mastery, streak, and assessment state consistently.
4. **One interaction, one purpose:** every button and interactive element must have a clear action and state.
5. **Consistent across platforms:** reuse design tokens and interaction rules. Adapt navigation and controls to each platform rather than forcing identical layouts.
6. **Accessible by default:** do not communicate status using color alone; maintain readable contrast, keyboard support, and visible focus states.
7. **Content density is intentional:** learning screens prioritize focus; dashboards may be denser but must retain clear hierarchy.

## 2. Visual identity

### 2.1 Brand character

- Optimistic and motivating.
- Clear and structured.
- Modern educational technology.
- Playful through small details, not excessive decoration.
- Trustworthy for formal academic assessment.

### 2.2 Core color palette

Use semantic tokens rather than hardcoding color values in components.

| Token | Hex | Usage |
|---|---:|---|
| `brand-500` | `#58CC02` | Primary brand, positive learning action |
| `brand-600` | `#46A302` | Hover / active brand |
| `brand-700` | `#347D02` | Strong brand text on light surfaces |
| `navy-900` | `#172B4D` | Main text and strong headings |
| `navy-700` | `#344563` | Secondary headings |
| `blue-500` | `#1CB0F6` | Information, links, learning progress |
| `purple-500` | `#A560E8` | AI and advanced learning |
| `orange-500` | `#FF9600` | Streak, attention, challenge |
| `yellow-400` | `#FFC800` | XP and rewards |
| `red-500` | `#FF4B4B` | Error and destructive state |
| `success-600` | `#238636` | Confirmed success |
| `surface` | `#FFFFFF` | Main card and page surface |
| `surface-muted` | `#F7F9FC` | App background |
| `surface-subtle` | `#EEF2F6` | Muted panels |
| `border` | `#DCE3EA` | Default borders |
| `text-primary` | `#172B4D` | Main text |
| `text-secondary` | `#52637A` | Supporting text |
| `text-muted` | `#718096` | Metadata and hints |

**Color rules**

- Primary green is for the main learning action and positive progress, not every decoration.
- Blue is for navigation, links, information, and neutral progress.
- Orange is for streaks, deadlines, and attention states.
- Yellow is for XP, gems, and reward highlights.
- Purple is reserved for AI and advanced features.
- Red is reserved for errors, destructive actions, and critical warnings.
- Use neutral backgrounds for most surfaces.
- Never use color as the only indicator of correctness, status, or priority.
- Avoid large saturated color blocks behind long paragraphs.

### 2.3 Semantic status colors

| State | Token | Additional indicator |
|---|---|---|
| Success / correct | `success-600` | Check icon + label |
| Incorrect / error | `red-500` | Error icon + explanation |
| Warning / due soon | `orange-500` | Warning icon + text |
| Information | `blue-500` | Info icon + text |
| AI generated | `purple-500` | AI label |
| Locked | `text-muted` | Lock icon + explanation |
| Completed | `brand-600` | Check icon + completed label |

### 2.4 Dark mode

Dark mode is a supported future-ready theme. Do not implement it by simply inverting colors.

Suggested dark tokens:

| Token | Hex |
|---|---:|
| `dark-bg` | `#101827` |
| `dark-surface` | `#172235` |
| `dark-surface-raised` | `#202F45` |
| `dark-border` | `#34445B` |
| `dark-text-primary` | `#F4F7FB` |
| `dark-text-secondary` | `#B7C4D4` |

Use semantic theme tokens so dark mode can be introduced without rewriting components.

---

## 3. Typography

### 3.1 Font family

Recommended font stack:

- **Primary:** `Nunito Sans`
- **Display / prominent headings:** `Nunito`
- **Math formulas:** KaTeX default math fonts; do not force the UI font onto mathematical glyphs.
- **Fallback:** system sans-serif.

Recommended Google Fonts:
- Nunito Sans: `https://fonts.google.com/specimen/Nunito+Sans`
- Nunito: `https://fonts.google.com/specimen/Nunito`

Use a limited number of weights. Prefer 400, 600, 700, and 800.

### 3.2 Type scale

| Token | Size | Line height | Weight | Usage |
|---|---:|---:|---:|---|
| `display` | 36px | 44px | 800 | Marketing / major result |
| `h1` | 30px | 38px | 800 | Page title |
| `h2` | 24px | 32px | 800 | Main section |
| `h3` | 20px | 28px | 700 | Card / subsection |
| `h4` | 18px | 26px | 700 | Small section |
| `body-lg` | 18px | 28px | 600 | Lesson instruction |
| `body` | 16px | 24px | 400–600 | Default content |
| `body-sm` | 14px | 21px | 400–600 | Supporting content |
| `caption` | 12px | 18px | 600 | Metadata |
| `button` | 15px | 20px | 800 | Button label |

### 3.3 Typography rules

- Body text must be at least 14px for normal application content.
- Use 16px as the default body size.
- Keep paragraph line length around 45–80 characters where possible.
- Use sentence case; avoid unnecessary all-caps labels.
- Use tabular numerals for timers, scores, XP, and statistics.
- Use bold weight for hierarchy, not color alone.
- Do not use more than three font weights in one component.
- Formula layout must preserve mathematical spacing and baseline alignment.

---

## 4. Spacing, padding, and margin

Use a 4px base spacing scale. Prefer Tailwind spacing utilities that map to this scale.

| Token | Value | Typical usage |
|---|---:|---|
| `space-1` | 4px | Icon/text micro gap |
| `space-2` | 8px | Compact control gap |
| `space-3` | 12px | Input internal spacing |
| `space-4` | 16px | Default component gap |
| `space-5` | 20px | Compact card padding |
| `space-6` | 24px | Default card padding |
| `space-8` | 32px | Section gap |
| `space-10` | 40px | Large section gap |
| `space-12` | 48px | Page section separation |
| `space-16` | 64px | Large desktop section separation |

### 4.1 Page layout spacing

- Desktop page horizontal padding: 32px.
- Tablet page horizontal padding: 24px.
- Mobile page horizontal padding: 16px.
- Standard card padding: 20–24px desktop, 16px mobile.
- Form field vertical gap: 16px.
- Section vertical gap: 24–32px.
- Dashboard grid gap: 20–24px.
- Lesson question content gap: 20–24px.

### 4.2 Margin rules

- Prefer parent `gap` utilities over arbitrary child margins.
- Use margin for external separation only when layout semantics require it.
- Do not stack multiple margins to create spacing.
- Avoid negative margins except for deliberate, documented visual overlap.
- Do not use arbitrary values when a spacing token exists.

---

## 5. Layout system

### 5.1 Breakpoints

Use Tailwind defaults unless the project has an approved reason to extend them.

| Breakpoint | Width | Layout behavior |
|---|---:|---|
| `sm` | 640px | Large mobile |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Wide desktop |

### 5.2 Application shell

**Desktop**
- Left sidebar: 240–264px.
- Main content: flexible, max width 1200px.
- Optional right rail: 280–320px.
- Top header: 64–72px.
- Sidebar may be sticky.
- Main content must not become excessively wide.

**Tablet**
- Collapsible sidebar or compact navigation.
- Main content uses full available width.
- Optional right rail moves below main content.

**Mobile**
- Use a compact top header.
- Use bottom navigation for primary student destinations.
- Avoid desktop sidebar patterns.
- Keep primary action reachable.
- Use full-width cards where appropriate.
- Respect safe areas on iOS and Android.

### 5.3 Recommended student navigation

- Home
- Learn
- Practice
- Leaderboard
- Profile

Secondary navigation:
- Subjects
- Learning history
- Achievements
- Subscription
- Settings

### 5.4 Content widths

| Content type | Recommended max width |
|---|---:|
| Standard dashboard | 1200px |
| Lesson content | 760px |
| Exam content | 900px |
| Long-form explanation | 720px |
| Admin data table | Full available width |

### 5.5 Grid rules

- Dashboard: 12-column desktop grid.
- Tablet: 6-column or 2-column card grid.
- Mobile: single-column by default.
- Avoid more than 3 primary dashboard columns.
- Keep related information inside the same visual group.

---

## 6. Surfaces, cards, borders, and shadows

### 6.1 Cards

- Background: white.
- Border: 1px solid `border`.
- Radius: 16px standard.
- Large feature cards: 20px radius.
- Compact controls: 10–12px radius.
- Default padding: 20–24px.
- Use subtle shadows only for elevation.
- Do not wrap every text group in a card.

### 6.2 Elevation

| Level | Usage |
|---|---|
| None | Flat content and list rows |
| Low | Standard cards |
| Medium | Dropdowns and popovers |
| High | Modal and floating dialogs |

### 6.3 Borders

- Use neutral borders.
- Use brand borders only for selected or active states.
- Selected cards must also show a check, label, or other non-color indicator.
- Avoid thick borders for ordinary content.

---

## 7. Buttons

### 7.1 Button variants

| Variant | Appearance | Usage |
|---|---|---|
| Primary | Brand green, white label | Main action |
| Secondary | White, neutral border | Secondary action |
| Outline | Transparent, brand border/text | Alternative action |
| Ghost | Transparent, neutral text | Low emphasis |
| Danger | Red | Destructive action |
| Reward | Yellow/orange accent | XP and reward action |

### 7.2 Button sizes

| Size | Height | Horizontal padding | Font |
|---|---:|---:|---:|
| `sm` | 36px | 12px | 14px |
| `md` | 44px | 16px | 15px |
| `lg` | 52px | 20px | 16px |
| `xl` | 56px | 24px | 17px |

Minimum touch target: 44×44px where practical.

### 7.3 Button shape

- Default radius: 12px.
- Pill buttons may be used for lesson actions and gamified controls.
- Avoid mixing multiple button shapes in the same context.
- Use consistent icon size and icon-to-label gap.

### 7.4 Button states

Every interactive button must support:

- Default.
- Hover (web).
- Focus-visible.
- Active / pressed.
- Disabled.
- Loading.
- Success feedback where appropriate.

Rules:
- Disabled buttons must not appear clickable.
- Loading buttons must prevent duplicate submissions.
- Destructive actions require clear labels and confirmation when irreversible.
- Icon-only buttons require accessible labels.
- Do not use a button for navigation when a semantic link is more appropriate.

---

## 8. Form controls

### Inputs

- Default height: 44–48px.
- Border radius: 10–12px.
- Horizontal padding: 12–16px.
- Label above input.
- Helper text below input.
- Error message directly below the field.
- Do not rely on placeholder as the only label.

### Selects and dropdowns

- Match input height.
- Show selected state clearly.
- Support keyboard navigation on web.
- Use native-feeling controls on mobile where appropriate.

### Sliders

- Use for continuous scientific parameters.
- Display current numeric value and unit.
- Provide keyboard-accessible alternatives.
- Include min/max values where useful.
- Never make a slider the only way to enter a precise value.

### Math input

- Use MathLive for equation entry.
- Provide clear focus state.
- Support mobile keyboard and WebView testing.
- Preserve entered LaTeX or canonical mathematical representation.
- Validate before grading.

---

## 9. Learning experience patterns

### 9.1 Learning path

- Use a vertical path on mobile.
- Use a clear unit/chapter grouping.
- Show completed, current, locked, and review states.
- Use icons and labels, not color alone.
- Make the next recommended action visually prominent.
- Avoid excessively long scrolling without section landmarks.

### 9.2 Lesson screen

Recommended layout:

1. Progress header.
2. Close/exit control.
3. Question or concept content.
4. Formula/diagram/simulation area.
5. Answer controls.
6. Hint or support action.
7. Sticky bottom primary action.

Lesson screens should minimize unrelated navigation and distractions.

### 9.3 Feedback

Correct answer:
- Positive but restrained color.
- Check icon.
- Short explanation.
- Continue action.

Incorrect answer:
- Clear error state.
- Do not shame the learner.
- Show the correct reasoning.
- Offer retry or related practice.

### 9.4 Gamification

- XP and streak are visually prominent but secondary to learning.
- Use small celebratory animations.
- Respect reduced-motion preferences.
- Avoid excessive confetti or animation on every interaction.
- Never use XP as an academic grade.

---

## 10. Math & Physics visual patterns

### Formula

- Use KaTeX.
- Inline formula must align with text baseline.
- Display formula gets dedicated vertical spacing.
- Long formulas may scroll horizontally on mobile.
- Never clip superscripts, subscripts, fractions, or radicals.

### Graph

- Keep axes and labels readable.
- Show units.
- Use distinct line styles or markers in addition to color.
- Support touch gestures on mobile.
- Provide a data/table alternative when practical.

### Diagram

- Prefer SVG for static and lightweight diagrams.
- Use Konva or Canvas for complex interactive diagrams.
- Keep labels readable at mobile sizes.
- Support zoom and pan where necessary.
- Do not rasterize formulas into images unless explicitly required.

### Simulation

- Provide Play, Pause, Reset.
- Show parameter values and units.
- Provide safe parameter ranges.
- Show simulation status.
- Keep controls separate from the visualization.
- Provide a textual explanation and formula.
- Ensure mobile touch targets are adequate.
- Handle reduced motion and performance constraints.

---

## 11. Tables, lists, and data visualization

- Use clear column headings.
- Right-align numeric values where appropriate.
- Use tabular numerals for scores and statistics.
- Avoid excessive vertical borders.
- On mobile, convert dense tables to stacked cards or controlled horizontal scrolling.
- Charts must include labels, units, and accessible descriptions.
- Do not use color as the only differentiator between chart series.

---

## 12. Modal, drawer, toast, and feedback patterns

### Modal

Use for focused decisions, confirmations, and short forms.

- Desktop: centered dialog.
- Mobile: bottom sheet or full-screen dialog depending on complexity.
- Provide close control.
- Support Escape on web.
- Manage focus correctly.
- Prevent background interaction when modal is active.

### Drawer

Use for navigation, filters, and secondary panels.

### Toast

Use for transient confirmation:
- Saved.
- Copied.
- XP awarded.
- Network restored.

Do not use toast for critical errors that require user action.

### Empty states

Every empty state should include:
- Clear explanation.
- Helpful illustration or icon.
- Next action when possible.

---

## 13. Responsive and mobile rules

- Mobile-first implementation.
- No horizontal overflow in standard application screens.
- Respect safe-area insets.
- Use bottom navigation for student app.
- Use touch-friendly controls.
- Do not rely on hover.
- Avoid tiny chart labels.
- Test portrait and landscape for simulation screens.
- Keyboard must not obscure active input.
- Use native navigation conventions where appropriate.

---

## 14. Accessibility

Target WCAG 2.2 AA for web.

- Semantic HTML.
- Keyboard navigation.
- Visible focus.
- Accessible labels.
- Sufficient contrast.
- Screen-reader descriptions.
- Error text associated with inputs.
- Reduced-motion support.
- Captions/transcripts for learning media.
- Non-color status indicators.
- Accessible mathematical alternatives where practical.

---

## 15. Motion and animation

Use motion to explain state changes, not as decoration.

Recommended duration:
- Micro interaction: 100–150ms.
- Button feedback: 120–180ms.
- Panel transition: 180–240ms.
- Modal transition: 180–260ms.
- Celebration: short and optional.

Respect `prefers-reduced-motion`.

Avoid:
- Continuous decorative movement.
- Excessive bouncing.
- Blocking animations.
- Animations that delay exam interaction.

---

## 16. Frontend implementation standards

### Mandatory styling rules

1. Use Tailwind CSS for web styling.
2. Do not use native CSS for application component styling.
3. Do not add arbitrary CSS files for one-off components.
4. Use design tokens through Tailwind theme configuration.
5. Use shared UI components.
6. Avoid inline style attributes except unavoidable dynamic values such as chart dimensions or simulation canvas sizing.
7. Use CSS variables only as centralized design tokens where Tailwind consumes them.
8. Do not duplicate color, spacing, radius, and typography values in components.

### Component architecture

Recommended shared components:

- AppShell
- Sidebar
- BottomNavigation
- PageHeader
- SectionHeader
- StatCard
- ProgressBar
- LessonCard
- LearningPathNode
- QuestionCard
- FormulaBlock
- GraphCanvas
- DiagramCanvas
- SimulationPanel
- AnswerOption
- PrimaryButton
- SecondaryButton
- FormField
- Modal
- Drawer
- Toast
- EmptyState
- LoadingState

### Component rules

- Keep business logic outside presentational components.
- Use explicit props.
- Support loading, empty, error, and success states.
- Use consistent naming.
- Avoid giant components.
- Avoid unnecessary abstraction.
- Reuse components across web pages.
- Provide platform-specific adapters for mobile.

---

## 17. Design review checklist

Before merging a frontend feature, verify:

- [ ] Correct color tokens.
- [ ] Correct typography hierarchy.
- [ ] Spacing follows the 4px scale.
- [ ] Responsive behavior works.
- [ ] Button states are implemented.
- [ ] Form labels and errors are accessible.
- [ ] No horizontal overflow.
- [ ] Formula and diagram are not clipped.
- [ ] Touch targets are adequate.
- [ ] Loading, empty, and error states exist.
- [ ] Keyboard navigation works on web.
- [ ] Reduced-motion preference is respected.
- [ ] Tailwind is used instead of native component CSS.
- [ ] Shared components are reused.
- [ ] Visual regression has been checked.

---

## 18. Reference implementation

Use `frontend-reference.html` as the visual and structural reference for the student dashboard.

The reference is not a complete production application. It demonstrates:

- Application shell.
- Sidebar navigation.
- Student header.
- XP and streak statistics.
- Learning path card.
- Daily goal.
- Recommended practice.
- Responsive dashboard layout.
- Tailwind-based component styling.

All production screens must follow the design rules in this document.
