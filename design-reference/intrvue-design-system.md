# intrvue.ai — Design System ("Bright Deck")

Dark, playful, gamified UI for children ~10–11 practising 11+ school interviews.
Source of truth in code: `src/index.css` (CSS variables) + `tailwind.config.ts` (mappings).

## Fonts
- **Display / headings:** Fredoka (400–700) — round, friendly
- **Body / UI:** Nunito (400–900)
- Google Fonts: `family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900`
- (Marketing landing page only uses: Bricolage Grotesque + Inter Tight)

## Core surfaces (dark navy base)
| Token | Hex | HSL |
|---|---|---|
| Background | `#0A0E1E` | `hsl(226 50% 8%)` |
| Card / tile | `#152036` | `hsl(220 44% 15%)` |
| Ink (deep tile) | `#111A2E` | `hsl(220 44% 12%)` |
| Foreground text | `#E3E9F2` | `hsl(214 45% 92%)` |
| Muted text | `#93A0B8` | `hsl(221 20% 66%)` |
| Border | `#2C3646` / `rgba(255,255,255,.07)` | `hsl(220 28% 24%)` |
| Secondary chip bg | — | `hsl(220 32% 20%)` |
| Hover surface (accent) | — | `hsl(220 30% 22%)` |

## Primary — Coral
- Primary: `#FF7F50` — `hsl(16 100% 66%)`
- Primary soft: `#FF9F75` — `hsl(18 100% 73%)`
- Active/button gradient: `linear-gradient(135deg, #FB923C → #F1730B)`
- Focus ring: coral

## Brand accents
| Name | Hex |
|---|---|
| Sky | `#38BDF8` |
| Purple | `#8B5CF6` |
| Rose | `#F43F5E` |
| Amber / Gold | `#FBBF24` |
| Emerald / Teal | `#34D399` |
| Cream | `#EDE6D8` |

## Status
- Success `#34D399` · Warning `#FBBF24` · Destructive `#EF4444` (`hsl(0 84% 60%)`)

## Mascot — "Pip" the owl
- Body navy `#232D45` · cream belly `#EDE6D8` · coral beak `#FF7A45`
- Eye pupils `#1E2740` on white
- Pip wears unlockable hats (locker room feature) — hats drawn as SVG layers

## Shape & components
- **Corner radius: 20px (1.25rem)** everywhere — big and friendly
- **Tile:** 20px radius, bg `#152036`, 1px border `rgba(255,255,255,.07)`
- **Chip (pill filter):** rounded-full, border `rgba(255,255,255,.10)`, bg `rgba(255,255,255,.04)`,
  13px extrabold; active = coral gradient (above) + white text
- **Nav pills:** 13px extrabold, active `bg-white/10 text-white`, idle muted → white on hover
- Buttons: rounded-full for small actions, coral primary

## Motion
- `floaty`: gentle bob ±9px with slight rotate, 4.5s ease-in-out infinite (Pip)
- `pip-pop`: scale .7→1.06→1 entrance, .35s
- `pulsering`: coral box-shadow pulse ring, 2.2s (live/recording indicators)

## Voice & feel
Gamified and encouraging: XP, levels, streaks, trophy cabinet badges, locker-room hat unlocks,
name-based praise ("Nice try, Sophia!"). Warm coral-on-navy, big rounded shapes, mascot-led.
Never clinical, never exam-scary; British school register ("mock", "practise", "brilliant").
