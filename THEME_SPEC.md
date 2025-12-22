# Loikka - Theme Specification

Tämä dokumentti sisältää Loikka-sovelluksen teemamäärittelyt. Kaikki värit ja teemamuuttujat on keskitetty tähän tiedostoon.

> **Huom:** Nämä arvot on määritelty `src/index.css`-tiedostossa. Tämä dokumentti toimii referenssinä.

---

## Teeman vaihtaminen

Teema tallennetaan `localStorage`-avaimen `loikka-theme` alle.

```typescript
// useTheme hook
const { theme, setTheme } = useTheme();

// Arvot: 'light' | 'dark'
// Oletus: 'dark'
```

CSS-luokka `<html>`-elementissä:
- **Dark:** `class="dark"` tai ei luokkaa (oletus)
- **Light:** `class="light"`

---

## Fontit

### Pääfontti

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Logo-fontti

```css
font-family: 'Satoshi';
font-weight: 700;
/* Lähde: src/assets/fonts/Satoshi-Bold.woff2 */
```

---

## Dark Theme (oletus)

`:root` ja `:root.dark`

### Taustat

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--bg-base` | `#0A0A0A` | `bg-background` | Sovelluksen päätausta |
| `--bg-surface` | `#111111` | `bg-card` | Kortit ja pinnat |
| `--bg-elevated` | `#191919` | `bg-muted` / `bg-elevated` | Korotetut elementit |
| `--bg-hover` | `#1a1a1a` | `bg-card-hover` | Hover-tila |

### Reunat

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--border-subtle` | `rgba(255, 255, 255, 0.04)` | `border-border-subtle` | Hienovarainen erottelu |
| `--border-default` | `rgba(255, 255, 255, 0.06)` | `border-border` | Oletusreuna |
| `--border-hover` | `rgba(255, 255, 255, 0.1)` | `border-border-hover` | Hover-tila |

### Teksti

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--text-primary` | `#E8E8E8` | `text-foreground` | Pääasiallinen teksti |
| `--text-secondary` | `#888888` | `text-muted-foreground` | Toissijainen teksti |
| `--text-muted` | `#555555` | `text-tertiary` | Himmennetty teksti |
| `--text-placeholder` | `#666666` | `text-[var(--text-placeholder)]` | Placeholder-teksti |
| `--text-initials` | `#444444` | `text-[var(--text-initials)]` | Nimikirjaimet avatarissa |

### Korostusväri (Accent)

| CSS-muuttuja | Arvo | Käyttö |
|--------------|------|--------|
| `--accent` | `#60A5FA` | Pääkorostusväri (sininen) |
| `--accent-hover` | `#93C5FD` | Hover-tila |
| `--accent-muted` | `rgba(96, 165, 250, 0.15)` | Tausta/kevyt korostus |
| `--accent-glow` | `rgba(96, 165, 250, 0.3)` | Voimakkaampi glow-efekti |

### Painikkeet

| CSS-muuttuja | Arvo | Käyttö |
|--------------|------|--------|
| `--btn-primary-text` | `#0A0A0A` | Primary-napin teksti (tumma taustalla) |

### Tilavärit

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--status-success` | `#10B981` | `text-success` | Onnistuminen (vihreä) |
| `--status-success-bright` | `#4ADE80` | - | Kirkkaampi vihreä |
| `--status-success-muted` | `rgba(16, 185, 129, 0.15)` | `bg-success-muted` | Vihreä tausta |
| `--status-warning` | `#FACC15` | `text-warning` | Varoitus (keltainen) |
| `--status-warning-muted` | `rgba(250, 204, 21, 0.15)` | `bg-warning-muted` | Keltainen tausta |
| `--status-orange` | `#F59E0B` | `text-orange` | Oranssi (8-14 pv kilpailuun) |
| `--status-orange-muted` | `rgba(245, 158, 11, 0.15)` | `bg-orange-muted` | Oranssi tausta |
| `--status-error` | `#EF4444` | `text-error` | Virhe (punainen) |

### Mitalit

| CSS-muuttuja | Arvo | Tailwind-luokka |
|--------------|------|-----------------|
| `--color-gold` | `#FFD700` | `bg-gold` |
| `--color-silver` | `#C0C0C0` | `bg-silver` |
| `--color-bronze` | `#CD7F32` | `bg-bronze` |

### Overlay

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--overlay-bg` | `rgba(0, 0, 0, 0.8)` | `bg-overlay` | Dialog backdrop |
| `--overlay-light` | `rgba(0, 0, 0, 0.5)` | `bg-overlay-light` | Kevyempi overlay |
| `--overlay-gradient` | `linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent)` | - | Kuvan päällä oleva gradient |

---

## Light Theme

`:root.light`

### Taustat

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--bg-base` | `#FFFFFF` | `bg-background` | Sovelluksen päätausta |
| `--bg-surface` | `#F9FAFB` | `bg-card` | Kortit ja pinnat |
| `--bg-elevated` | `#F3F4F6` | `bg-muted` / `bg-elevated` | Korotetut elementit |
| `--bg-hover` | `#E5E7EB` | `bg-card-hover` | Hover-tila |

### Reunat

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--border-subtle` | `rgba(0, 0, 0, 0.04)` | `border-border-subtle` | Hienovarainen erottelu |
| `--border-default` | `rgba(0, 0, 0, 0.08)` | `border-border` | Oletusreuna |
| `--border-hover` | `rgba(0, 0, 0, 0.15)` | `border-border-hover` | Hover-tila |

### Teksti

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--text-primary` | `#111827` | `text-foreground` | Pääasiallinen teksti |
| `--text-secondary` | `#6B7280` | `text-muted-foreground` | Toissijainen teksti |
| `--text-muted` | `#9CA3AF` | `text-tertiary` | Himmennetty teksti |
| `--text-placeholder` | `#9CA3AF` | `text-[var(--text-placeholder)]` | Placeholder-teksti |
| `--text-initials` | `#D1D5DB` | `text-[var(--text-initials)]` | Nimikirjaimet avatarissa |

### Korostusväri (Accent)

| CSS-muuttuja | Arvo | Käyttö |
|--------------|------|--------|
| `--accent` | `#2563EB` | Pääkorostusväri (tumma sininen) |
| `--accent-hover` | `#1D4ED8` | Hover-tila |
| `--accent-muted` | `rgba(37, 99, 235, 0.1)` | Tausta/kevyt korostus |
| `--accent-glow` | `rgba(37, 99, 235, 0.2)` | Voimakkaampi glow-efekti |

### Painikkeet

| CSS-muuttuja | Arvo | Käyttö |
|--------------|------|--------|
| `--btn-primary-text` | `#FFFFFF` | Primary-napin teksti (valkoinen) |

### Tilavärit

| CSS-muuttuja | Arvo | Tailwind-luokka | Käyttö |
|--------------|------|-----------------|--------|
| `--status-success` | `#059669` | `text-success` | Onnistuminen (vihreä) |
| `--status-success-bright` | `#10B981` | - | Kirkkaampi vihreä |
| `--status-success-muted` | `rgba(5, 150, 105, 0.1)` | `bg-success-muted` | Vihreä tausta |
| `--status-warning` | `#D97706` | `text-warning` | Varoitus (keltainen) |
| `--status-warning-muted` | `rgba(217, 119, 6, 0.1)` | `bg-warning-muted` | Keltainen tausta |
| `--status-orange` | `#EA580C` | `text-orange` | Oranssi |
| `--status-orange-muted` | `rgba(234, 88, 12, 0.1)` | `bg-orange-muted` | Oranssi tausta |
| `--status-error` | `#DC2626` | `text-error` | Virhe (punainen) |

### Overlay

| CSS-muuttuja | Arvo | Käyttö |
|--------------|------|--------|
| `--overlay-bg` | `rgba(0, 0, 0, 0.6)` | Dialog backdrop |
| `--overlay-light` | `rgba(0, 0, 0, 0.3)` | Kevyempi overlay |
| `--overlay-gradient` | `linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)` | Kuvan päällä oleva gradient |

---

## Tailwind v4 @theme -mappaukset

Nämä mappaukset yhdistävät CSS-muuttujat Tailwind-luokkiin (`src/index.css` → `@theme`-lohko):

### Värit

```css
@theme {
  /* Taustat */
  --color-background: var(--bg-base);
  --color-foreground: var(--text-primary);
  --color-card: var(--bg-surface);
  --color-card-hover: var(--bg-hover);
  --color-muted: var(--bg-elevated);
  --color-muted-foreground: var(--text-secondary);
  --color-tertiary: var(--text-muted);

  /* Reunat */
  --color-border: var(--border-default);
  --color-border-subtle: var(--border-subtle);
  --color-border-hover: var(--border-hover);

  /* Sidebar */
  --color-sidebar: var(--bg-base);
  --color-sidebar-active: transparent;

  /* Ikonit */
  --color-icon-muted: var(--text-muted);
  --color-icon-secondary: var(--text-secondary);

  /* Overlay */
  --color-overlay: var(--overlay-bg);
  --color-overlay-light: var(--overlay-light);

  /* Tilavärit */
  --color-success: var(--status-success);
  --color-success-muted: var(--status-success-muted);
  --color-warning: var(--status-warning);
  --color-warning-muted: var(--status-warning-muted);
  --color-orange: var(--status-orange);
  --color-orange-muted: var(--status-orange-muted);
  --color-error: var(--status-error);

  /* Mitalit */
  --color-gold: #FFD700;
  --color-silver: #C0C0C0;
  --color-bronze: #CD7F32;

  /* Border radius */
  --radius-xl: 10px;
}
```

### Käyttö Tailwindissa

| CSS-muuttuja | Tailwind-luokka |
|--------------|-----------------|
| `--color-background` | `bg-background` |
| `--color-foreground` | `text-foreground` |
| `--color-card` | `bg-card` |
| `--color-card-hover` | `bg-card-hover` |
| `--color-muted` | `bg-muted` |
| `--color-muted-foreground` | `text-muted-foreground` |
| `--color-tertiary` | `text-tertiary` |
| `--color-border` | `border-border` |
| `--color-border-subtle` | `border-border-subtle` |
| `--color-border-hover` | `border-border-hover` |
| `--color-success` | `text-success`, `bg-success` |
| `--color-success-muted` | `bg-success-muted` |
| `--color-warning` | `text-warning`, `bg-warning` |
| `--color-warning-muted` | `bg-warning-muted` |
| `--color-orange` | `text-orange`, `bg-orange` |
| `--color-orange-muted` | `bg-orange-muted` |
| `--color-error` | `text-error`, `bg-error` |
| `--color-gold` | `bg-gold` |
| `--color-silver` | `bg-silver` |
| `--color-bronze` | `bg-bronze` |

---

## Typografia

### Fonttikoot (@theme)

```css
@theme {
  --font-size-xs: 11px;      /* Badges, captions */
  --font-size-sm: 13px;      /* Body text, labels, buttons */
  --font-size-base: 14px;    /* Standard text */
  --font-size-lg: 16px;      /* Page titles, card titles */
  --font-size-xl: 20px;      /* Hero headings */
  --font-size-2xl: 24px;     /* Large stat numbers */
  --font-size-3xl: 28px;     /* Hero stat numbers */
}
```

### Utility-luokat

| Luokka | Fonttikoko | Letter-spacing | Line-height | Käyttö |
|--------|------------|----------------|-------------|--------|
| `text-caption` | 11px | default | default | Badget, kuvatekstit |
| `text-body` | 13px | default | default | Body-teksti, labelit, napit |
| `text-default` | 14px | default | default | Standardi teksti |
| `text-title` | 16px | `-0.02em` | default | Sivuotsikot, korttiotsikot |
| `text-heading` | 20px | `-0.02em` | default | Hero-otsikot |
| `text-stat` | 24px | `-0.02em` | `1` | Tilastonumerot |
| `text-hero-stat` | 28px | `-0.02em` | `1` | Hero-tilastonumerot |

### Fonttipaino

| Elementti | Paino | Tailwind-luokka |
|-----------|-------|-----------------|
| Sivuotsikot | 500 | `font-medium` |
| Korttiotsikot | 500 | `font-medium` |
| Tilastonumerot | 500-700 | `font-medium` / `font-bold` |
| Body-teksti | 400 | (default) |
| Labelit | 500 | `font-medium` |

### Tekstivärit

| Käyttö | Tailwind-luokka |
|--------|-----------------|
| Pääotsikot | `text-foreground` |
| Alaotsikot/labelit | `text-muted-foreground` |
| Himmennetty | `text-tertiary` |
| Placeholder | `text-[var(--text-placeholder)]` |
| Nimikirjaimet | `text-[var(--text-initials)]` |

---

## Värien käyttöohjeet

### Älä käytä kovakoodattuja värejä

❌ **Väärin:**
```tsx
<div className="bg-[#141414] text-[#888888]">
```

✅ **Oikein:**
```tsx
<div className="bg-card text-muted-foreground">
```

### Poikkeukset (kovakoodaus sallittu)

1. **Kuvien päällä olevat overlayt** - Tarvitsevat aina tumman taustan:
   ```tsx
   <div className="bg-black/50 text-white">
   ```

2. **CSS-muuttujien käyttö Tailwindissa opacityllä:**
   ```tsx
   <div className="bg-[var(--accent)]/10 border-[var(--accent)]/30">
   ```

---

## Animaatiot

### Keyframe-animaatiot

| Nimi | Kesto | Easing | Käyttö |
|------|-------|--------|--------|
| `fade-in` | 0.2s | ease-out | Elementtien sisääntulo |
| `slide-up` | 0.25s | ease-out | Listat, kortit |
| `scale-in` | 0.15s | ease-out | Dialogit |
| `page-enter` | 0.3s | ease-out | Sivunvaihdot |
| `shimmer` | 1.5s | infinite | Skeleton-loader |
| `glow-pulse` | 2s | ease-in-out infinite | Accent-hehku |
| `gold-glow` | 2s | ease-in-out infinite | Kulta-hehku (mitalit) |

### Utility-luokat

| Luokka | Animaatio |
|--------|-----------|
| `animate-fade-in` | `fade-in 0.2s ease-out forwards` |
| `animate-slide-up` | `slide-up 0.25s ease-out forwards` |
| `animate-scale-in` | `scale-in 0.15s ease-out forwards` |
| `animate-page-enter` | `page-enter 0.3s ease-out forwards` |
| `animate-shimmer` | `shimmer 1.5s infinite` |
| `animate-glow-pulse` | `glow-pulse 2s ease-in-out infinite` |
| `animate-gold-glow` | `gold-glow 2s ease-in-out infinite` |

### Hover-animaatio (kortit)

```css
transition-colors duration-150
```

Kaikki kortit käyttävät yhtenäistä `transition-colors duration-150` animaatiota hover-tilassa.

**Ei käytetä:**
- `transition-all` (liian laaja, voi aiheuttaa suorituskykyongelmia)
- Eri durationeja eri komponenteissa

### Staggered animations

Listoissa käytetään viivästettyä animaatiota:
```tsx
style={{ animationDelay: `${index * 50}ms` }}
```

---

## Komponenttityylit (CSS-luokat)

### .btn-primary

```css
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  background: var(--accent);
  color: var(--btn-primary-text);
  border: 1px solid transparent;
  transition: all 150ms;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### .btn-secondary

```css
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all 150ms;
  cursor: pointer;
}

.btn-secondary:hover {
  color: var(--text-primary);
  background: rgba(128, 128, 128, 0.1);
}
```

### .badge-pb / .badge-sb / .badge-nr

```css
.badge-pb,
.badge-sb,
.badge-nr {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-hover);
}
```

### .input-focus

```css
.input-focus {
  transition: all 150ms;
}

.input-focus:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-muted);
}
```

### .card-hover

```css
.card-hover {
  transition: all 200ms;
  cursor: pointer;
}

.card-hover:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--border-hover);
}
```

### .card-hover-accent

```css
.card-hover-accent {
  transition: all 200ms;
  cursor: pointer;
}

.card-hover-accent:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px var(--accent-muted);
}
```

---

## Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--accent-muted);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}
```

---

## Select-elementin tyylitys

Select-elementit käyttävät teemakohtaista chevron-ikonia:

**Dark theme:**
```css
background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23888888' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
```

**Light theme:**
```css
background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
```

---

## Photo Viewer -tyylit

```css
.photo-viewer-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.photo-viewer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: calc(100vw - 120px);
  max-height: calc(100vh - 100px);
}

.photo-viewer-image {
  max-width: 100%;
  max-height: calc(100vh - 140px);
  object-fit: contain;
}
```
