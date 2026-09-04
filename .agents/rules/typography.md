---
description: "Enforces strict usage of the custom Text component and valid typography variants in the React Native app."
trigger: "When writing, modifying, or generating React Native UI components that contain text."
---

# Typography Guidelines

When building UI components for `pakiza-ios`, you MUST strictly adhere to the project's custom typography system.

## The `<Text>` Component
Never use the raw `Text` component from `react-native`. Always import our custom `Text` primitive:
```tsx
import { Text } from '@/components/Text';
```

## Valid Variants
The `<Text>` component accepts a `variant` prop. You are **strictly forbidden** from inventing new variants (e.g., do not use `headline`, `caption`, `subtitle`). 

You must only use one of the following exactly as written:
- `display`: Reserved for the largest moments only (Serif).
- `title`: Large screen titles (Serif).
- `heading`: Section headings (Serif).
- `subhead`: Emphasized functional text (Sans-serif).
- `body`: Standard reading text (Sans-serif).
- `callout`: Slightly smaller than body, used for lists/cards.
- `footnote`: Small helper text or meta information.
- `label`: Tiny, uppercase tracking text for badges or overlines.

## Valid Tones
Do not hardcode hex colors for text. Use the `tone` prop:
Valid tones include: `default`, `muted`, `subtle`, `onDark`, `onDarkMuted`, `accent`, `gold`, `burgundy`, `danger`, `success`.

Example:
```tsx
<Text variant="heading" tone="accent">My Title</Text>
<Text variant="footnote" tone="muted">Some descriptive helper text.</Text>
```
