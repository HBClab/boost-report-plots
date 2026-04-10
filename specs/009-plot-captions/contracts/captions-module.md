# Contract: Captions Module (`captions.ts`)

**Type**: Internal TypeScript module interface  
**Consumer**: All six plot render functions in `plots/act/src/`  
**Location**: `plots/act/src/captions.ts`

---

## Exports

### `actCaptions`

```typescript
export const actCaptions: {
  plot1: {
    all:      CaptionEntry;
    baseline: CaptionEntry;
  };
  plot2: CaptionEntry;
  plot3: CaptionEntry;
};
```

### `hrCaptions`

```typescript
export const hrCaptions: {
  plot1: CaptionEntry;
  plot2: {
    trimp:  CaptionEntry;
    hrmax:  CaptionEntry;
  };
  plot3: {
    adherence: CaptionEntry;
    sessions:  CaptionEntry;
  };
};
```

---

## `CaptionEntry` interface

```typescript
interface NumericAnnotation {
  label: string;
  value: number | null;  // null → annotation not rendered
}

interface CaptionEntry {
  prose: string;
  annotations: NumericAnnotation[];
  disclaimer?: string;
}
```

---

## Usage by plot files

### Static cards (ACT Plot 2, ACT Plot 3, HR Plot 1)

```typescript
import { actCaptions } from './captions';

// In renderPlot2():
renderCaption(g, actCaptions.plot2, layout);
```

### Toggle-aware cards

```typescript
import { hrCaptions } from './captions';

// In updateView(view: TrendView):
renderCaption(captionG, hrCaptions.plot2[view], layout);
```

---

## `renderCaption` helper contract

A shared helper (defined in `captions.ts` or a sibling utility) with this signature:

```typescript
function renderCaption(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  entry: CaptionEntry,
  layout: { captionTop: number; width: number; padding: number }
): void;
```

**Behavior**:
- Clears any previously rendered caption within `parent` (for toggle swap correctness)
- Renders `.caption-prose`, `.caption-annotation` elements (one per non-null annotation), and `.caption-disclaimer` if present
- Does not mutate `entry` or `layout`

---

## Invariants

- All six plots MUST import from `captions.ts` only — no caption strings elsewhere
- `renderCaption` MUST clear the parent group before each render (prevents stale text on toggle)
- `value: null` in any `NumericAnnotation` MUST result in that annotation being skipped entirely (not rendered as "null" or "0")
