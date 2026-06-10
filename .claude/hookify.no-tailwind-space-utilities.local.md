---
name: no-tailwind-space-utilities
enabled: true
event: file
pattern: \bspace-[xy]-\d+\b
action: block
---

🚫 **Tailwind `space-y-{}` / `space-x-{}` don't work in Tailwind v4**

These utilities were removed or are broken in Tailwind CSS v4. Do not use them.

**Instead, use:**

- Vertical spacing → `flex flex-col gap-{n}` on the parent
- Horizontal spacing → `flex flex-row gap-{n}` on the parent

**Examples:**

```jsx
// ❌ Broken in v4
<div className="space-y-4">...</div>
<div className="space-x-2">...</div>

// ✅ Correct
<div className="flex flex-col gap-4">...</div>
<div className="flex flex-row gap-2">...</div>
```

Fix the spacing before continuing.
