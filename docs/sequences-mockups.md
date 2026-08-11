# Sequences — UI Mockups

The web manages sequence **definitions** only (CRUD). Execution (runs, timers, voice) happens on the Android app.

## Screen 1: Sequence List

```
┌─────────────────────────────────────┐
│  ← Sequences                    [+] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔄 Arms Day            5 steps │ │
│ │ ▸ 12 sets total                │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔄 Laundry              2 steps │ │
│ │ ▸ 🔁 repeat until done         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔄 Leg Day              3 steps │ │
│ │ ▸ 5 sets total                 │ │
│ │                       ▶ active │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔄 Morning Stretch     6 steps │ │
│ │ ▸ 18 sets total                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Elements:**
- Header: title + "+" button to create
- Each row: icon, name, step count, total set count
- Green "▶ active" badge if `sequence_runs` has an incomplete run for this sequence (read-only)
- Tap row → Screen 2 (detail)
- Sort alphabetically by name

---

## Screen 2: Sequence Detail

```
┌─────────────────────────────────────┐
│  ← Sequences    Laundry        [⋯]  │
├─────────────────────────────────────┤
│                                     │
│  Steps (2)                          │
│  ──────────────────────────────     │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ 1  Sort Laundry              │   │
│  │    ✅  Action                 │   │
│  │    Task: sort by color &     │   │
│  │          fabric type         │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ 2  🔁  Wash & Repeat         │   │
│  │    🔁  Repeat Group           │   │
│  │    Repeats until done         │   │
│  │    ┌────────────────────────┐ │   │
│  │    │ 1. Load Washer        │ │   │
│  │    │ 2. Wash Cycle         │ │   │
│  │    │    ⏱  35 min          │ │   │
│  │    │ 3. Move to Dryer     │ │   │
│  │    │ 4. Dry Cycle          │ │   │
│  │    │    ⏱  45 min          │ │   │
│  │    │ 5. Fold & Put Away   │ │   │
│  │    └────────────────────────┘ │   │
│  │    🔄 tap to mark complete → │   │
│  │       next repeat starts     │   │
│  └──────────────────────────────┘   │
│                                     │
│  Run History                        │
│  ──────────────────────────────     │
│                                     │
│  ┌► May 20 — 13 min ─ 5/5 steps  ┐ │
│  │  ▸ completed 3:15-3:28         │ │
│  └─────────────────────────────────┘ │
│  ┌► May 18 — 15 min ─ 4/5 steps  ┐ │
│  │  ▸ started 10:00, incomplete   │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Elements:**
- Step cards with type badges (✅ Action / ⏱ Timer / 🔁 Repeat Group)
- Each card shows type-specific fields read-only
- Repeat group shows nested sub-steps indented with "Repeats until done" label
- 🔄 tap-to-complete hint on repeat group card: user marks each repeat done, next starts
- "⋯" menu for edit / delete
- Run history collapsible at bottom (read-only from Firestore)

---

## Screen 3: Create / Edit Sequence

```
┌─────────────────────────────────────┐
│  ← Sequences    New Sequence    Save │
├─────────────────────────────────────┤
│                                     │
│  Name                               │
│  ┌──────────────────────────────┐   │
│  │ Laundry                      │   │
│  └──────────────────────────────┘   │
│                                     │
│  Repeat mode: [ 🔁 Until done ▼ ]  │
│                                     │
│  Steps                              │
│  ──────────────────────────────     │
│                                     │
│  ┌≡─ Sort Laundry ────────── ✕──┐   │
│  │  Type: Action                 │   │
│  │  Task: __sort by color &____ │   │
│  │        __fabric type________ │   │
│  └────────────────────────────────┘   │
│                                     │
│  ┌≡─ Wash & Repeat ──────── ✕──┐   │
│  │  Type: Repeat Group           │   │
│  │  Label: __Wash & Repeat____ │   │
│  │  ┌────────────────────────┐  │   │
│  │  │ ≡ Load Washer      ✕ │  │   │
│  │  │ ≡ Wash Cycle       ✕ │  │   │
│  │  │   ⏱  Type: Timer      │  │   │
│  │  │   Duration: [_35_] min │  │   │
│  │  │ ≡ Move to Dryer    ✕ │  │   │
│  │  │ ≡ Dry Cycle        ✕ │  │   │
│  │  │   ⏱  Type: Timer      │  │   │
│  │  │   Duration: [_45_] min │  │   │
│  │  │ ≡ Fold & Put Away  ✕ │  │   │
│  │  └────────────────────────┘  │   │
│  │  [+ Add Sub-Step]            │   │
│  └────────────────────────────────┘   │
│                                     │
│  [+ Add Step]                       │
│                                     │
└─────────────────────────────────────┘
```

**Elements:**
- Name field at top
- Repeat mode dropdown with options (e.g. "Until done", "Fixed count")
- Step cards with drag handles (≡) for reorder
- Each card shows fields based on its type:
  - **Action:** task description
  - **Timer:** label, duration
  - **Repeat Group:** label, nested sub-step list with its own drag-reorder and add/delete; sub-steps show their own type-specific fields inline
- "✕" to delete a step
- "+ Add Step" opens type picker

---

## Screen 4: Step Type Picker (modal)

```
┌─────────────────────────────────────┐
│  Add Step                       ✕   │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐   │
│  │ 🏋️  Exercise                 │   │
│  │     Machine exercise with    │   │
│  │     weight, sets, reps       │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ 🧘  Stretch                  │   │
│  │     Duration, rest, voice    │   │
│  │     activation, image ref    │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ ⏱  Timer                     │   │
│  │     Generic countdown with   │   │
│  │     configurable duration    │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ 🔁  Repeat Group             │   │
│  │     Nested sub-steps that    │   │
│  │     repeat until done        │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ ✅  Action                    │   │
│  │     Simple task or chore     │   │
│  │     with description only    │   │
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 5: Empty state

```
┌─────────────────────────────────────┐
│  ← Sequences                    [+] │
├─────────────────────────────────────┤
│                                     │
│                                     │
│              🔄                      │
│                                     │
│    No sequences yet                 │
│                                     │
│    Create your first sequence       │
│    to guide you through tasks       │
│    like workouts, laundry, or       │
│    daily routines.                  │
│                                     │
│    ┌──────────────────────────┐     │
│    │  + Create Sequence       │     │
│    └──────────────────────────┘     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```
