# RateQ theme & assets

Drop this folder into another project.

## Brand colors

| Token | Hex | Use |
|---|---|---|
| brand.500 | `#8E2157` | Primary burgundy (buttons, logo) |
| brand.600 | `#5a0f1c` | Button hover |
| gold.300 | `#edc56f` | Accent / gold buttons |
| gold.500 | `#d4a017` | Stronger gold |
| ink | `#373737` | Body text |
| page | `#F4F5F7` | Page background |
| dark bg | `#323232` | Dark mode page |

## Fonts

- Latin: **Nunito** 400/500/600/700 (`--font-nunito`)
- Arabic: **Noto Sans Arabic** (`--font-noto-arabic`)
- Load from Google Fonts, or keep using `next/font` as in RateQ.

## Files

```
theme/tokens.json          machine-readable palette
theme/tokens.css           CSS variables
theme/utilities.css        page/card/text helpers
theme/tailwind.preset.js   copy into Tailwind `presets: [preset]`
assets/logo.svg            light-mode logo
assets/white_logo.svg      dark-mode logo
assets/favicon.svg
assets/app-icon.svg
assets/…                   icons, stamps, partner marks, hero art
```

## Tailwind

```js
// tailwind.config.js
const preset = require('./rateq-theme-export/theme/tailwind.preset.js');

module.exports = {
  darkMode: 'class',
  presets: [preset],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-noto-arabic)', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

Then `bg-brand-500`, `text-ink`, `bg-dm-bg`, `max-w-page`, `shadow-card` work as on RateQ.

Dark mode uses the `dark` class on a parent (RateQ uses `next-themes` with `attribute="class"`).

## Logos

Use `logo.svg` on light backgrounds and `white_logo.svg` on dark.
