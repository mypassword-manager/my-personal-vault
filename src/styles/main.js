:root {
  --bg: #0b0f14;
  --bg-raised: #121820;
  --bg-input: #0e141b;
  --line: #1f2b36;
  --line-strong: #2d3d4c;
  --text: #e8eef4;
  --text-dim: #93a4b4;
  --text-faint: #6b7c8c;
  --accent: #4ade80;
  --accent-ink: #06240f;
  --danger: #f87171;
  --danger-ink: #2a0a0a;
  --warn: #fbbf24;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  --maxw: 1080px;
  color-scheme: dark;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    sans-serif;
  font-size: 16px;
  line-height: 1.55;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h1,
h2,
h3,
h4 {
  line-height: 1.2;
  margin: 0 0 0.5em;
  font-weight: 650;
  letter-spacing: -0.01em;
}

h1 {
  font-size: clamp(1.9rem, 5vw, 3rem);
}

h2 {
  font-size: clamp(1.4rem, 3.4vw, 2rem);
}

h3 {
  font-size: 1.15rem;
}

p {
  margin: 0 0 1em;
}

small {
  font-size: 0.82rem;
}

.wrap {
  width: 100%;
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 0 1rem;
}

.narrow {
  max-width: 520px;
}

.page {
  flex: 1 1 auto;
  padding: 1.5rem 0 3rem;
}

.stack > * + * {
  margin-top: 1rem;
}

.stack-sm > * + * {
  margin-top: 0.5rem;
}

.center {
  text-align: center;
}

.dim {
  color: var(--text-dim);
}

.faint {
  color: var(--text-faint);
}

.card {
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.25rem;
}

.card-tight {
  padding: 0.9rem 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.6rem 1.05rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong);
  background: var(--bg-input);
  color: var(--text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover {
  background: #16202b;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.btn-primary:hover {
  background: #6ee7a0;
}

.btn-danger {
  background: transparent;
  border-color: #7f3030;
  color: var(--danger);
}

.btn-danger:hover {
  background: #2a1010;
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-dim);
}

.btn-ghost:hover {
  background: #16202b;
  color: var(--text);
}

.btn-block {
  width: 100%;
}

.btn-sm {
  min-height: 36px;
  padding: 0.3rem 0.65rem;
  font-size: 0.85rem;
}

.field {
  display: block;
}

.field + .field {
  margin-top: 0.9rem;
}

.label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
}

.input,
.select,
.textarea {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: inherit;
  font-size: 16px;
}

.textarea {
  min-height: 96px;
  resize: vertical;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: var(--accent);
}

.input-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.02em;
}

.hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  margin-top: 0.3rem;
}

.error {
  font-size: 0.85rem;
  color: var(--danger);
  margin-top: 0.3rem;
}

.alert {
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.9rem;
  font-size: 0.9rem;
  border: 1px solid var(--line-strong);
  background: #101820;
}

.alert-error {
  border-color: #7f3030;
  background: #1c0f0f;
  color: #fecaca;
}

.alert-ok {
  border-color: #2f6b45;
  background: #0d1c13;
  color: #bbf7d0;
}

.alert-warn {
  border-color: #7a5a15;
  background: #1c1608;
  color: #fde68a;
}

.row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

.row-between {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.grow {
  flex: 1 1 auto;
  min-width: 0;
}

.badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  color: var(--text-dim);
}

.mask {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.14em;
  color: var(--text-dim);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .hide-sm {
    display: none !important;
  }
  .card {
    padding: 1rem;
  }
}