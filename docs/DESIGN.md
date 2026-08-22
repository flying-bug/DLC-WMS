# Apex UI Pro

Modern SaaS Gold Standard — Refined, atmospheric, electric precision.

## Overview

Apex UI Pro is a design system purpose-built for world-class SaaS platforms, developer tools, and modern enterprise dashboards. It synthesizes the refined micro-interactions of **Linear.app**, the modular composability of **Shadcn UI / Radix**, the typography and speed of **Vercel (Geist)**, and the financial reliability of **Stripe**.

The core philosophy is **Atmospheric Precision**: deep monochromatic surfaces paired with razor-thin micro-borders, multi-layered diffuse ambient lighting, and electric accent highlights that draw focus exactly where needed.

---

## Colors & Surface Tokens

### Dark Theme (Zinc / Obsidian — Default)
- **App Background** (`#09090B`): Deep obsidian canvas.
- **Card Surface** (`#121215`): Primary container background.
- **Card Elevated** (`#18181C` / `#1E1E24`): Hovered states, modal dialogs, popovers.
- **Input Background** (`#18181B` / `#27272A` on focus).
- **Micro-Border** (`rgba(255, 255, 255, 0.08)`): Ultra-thin structural separation.
- **Micro-Border Hover** (`rgba(255, 255, 255, 0.18)`): Interactive elevation.

### Light Theme (Pearl White)
- **App Background** (`#F8FAFC`): Soft pearl gray canvas.
- **Card Surface** (`#FFFFFF`): Pure white containers.
- **Card Hover** (`#F1F5F9`): Subtle interactive wash.
- **Micro-Border** (`rgba(0, 0, 0, 0.08)`): Crisp structural lines.

### Electric Accents
- **Primary Indigo** (`#6366F1` / Hover `#4F46E5`): Primary CTA buttons, active state glows, chart hero curves.
- **Emerald Green** (`#10B981`): Success pills, positive delta indicators, completed states.
- **Sky Blue** (`#0EA5E9`): Informational highlights, tags, secondary charts.
- **Amber Gold** (`#F59E0B`): Pending states, warning badges, high priority flags.
- **Rose Red** (`#F43F5E`): Negative deltas, failed statuses, urgent priority badges.
- **Royal Purple** (`#A855F7`): Feature badges, AI capabilities.

---

## Typography & Hierarchy

- **Primary Font**: `Plus Jakarta Sans` / `Inter`, `-apple-system`, `BlinkMacSystemFont`
- **Monospace Font**: `JetBrains Mono` (strictly applied to currency `$148,250.00`, invoice codes `INV-2026-0891`, API tokens `pk_live_...`, risk scores, and timestamps).
- **Tabular Figures**: Always enable `font-variant-numeric: tabular-nums` on financial columns for perfect vertical digit alignment.

---

## Core Components & Layout Architecture

### 1. Workspace Switcher & Sidebar Navigation
- Monochromatic navigation with active pill background (`#1E1E24`) and subtle border.
- Category section headings (`11px`, `uppercase`, `letter-spacing: 0.6px`, `text-zinc-500`).
- Keyboard shortcut hints displayed on the right edge (`G D`, `G C`, `G I`, `G K`).

### 2. Glassmorphism Topbar & Breadcrumbs
- `backdrop-filter: blur(16px)` with semi-transparent background.
- Universal Command Palette trigger (`⌘K` / `Ctrl+K`) with rounded-pill shape.

### 3. Metric KPI Cards & Gradient Area Charts
- KPI cards with title, delta pill badge (`▲ +14.8%`), large bold metric (`26px`, `-0.5px` tracking), and secondary trend context.
- Smooth SVG Gradient Area Chart with cubic-bezier curves (`Q` and `T` smoothing paths) and subtle dashed horizontal guide lines.

### 4. Smart Data Table (Shadcn Style)
- Compact row padding (`12px 14px`), borderless cell transitions, full-width responsive scroll.
- Interactive status pills with circular color dots (`status-pill` with `success`, `pending`, `failed`, `info`).
- 1-click clipboard actions for IDs and metadata.

### 5. Linear-Style Issue Board (Kanban)
- 4-column agile flow (`BACKLOG`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`).
- Issue cards with subtle hover elevation (`translateY(-1px)`), priority badges (`URGENT`, `HIGH`, `MEDIUM`, `LOW`), assignee avatar, and comment count.

### 6. Stripe-Style Developer API Keys Manager
- Secret key masking with 1-click Reveal/Hide toggle (`pk_live_...` / `sk_live_...`).
- Environment status pills (`Live` vs `Test`).

---

## Do's and Don'ts

### Do:
- **Do** use 1px semi-transparent micro-borders (`rgba(255, 255, 255, 0.08)`) instead of heavy solid borders.
- **Do** use `JetBrains Mono` with `tabular-nums` for all numbers, currency values, codes, and timestamps.
- **Do** use smooth micro-transitions between `150ms` and `200ms` with `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Do** pair dark surfaces with subtle ambient glow rings around active buttons and focus inputs.
- **Do** implement a universal Command Palette (`⌘K` / `Ctrl+K`) for keyboard-first users.

### Don't:
- **Don't** use harsh pure black (`#000000`) for surfaces — always use rich deep zinc/obsidian tones (`#09090B`, `#121215`, `#18181C`).
- **Don't** use long, slow animation durations (> 250ms) that make the application feel sluggish.
- **Don't** use heavy, opaque shadow drops — use soft, multi-layered diffuse shadows (`0 4px 16px rgba(0,0,0,0.5)`).
- **Don't** clutter interfaces with decorative icons — every icon must have a clear semantic purpose with consistent 1.5px stroke weight.
