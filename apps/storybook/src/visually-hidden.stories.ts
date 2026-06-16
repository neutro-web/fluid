import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/visually-hidden'
import '@neutro/fluid/button'
import '@neutro/fluid/icon-button'
import '@neutro/fluid/card'

// ─── Shared icon fixtures ─────────────────────────────────────────────────────

const DownloadIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 3v10M6 9l4 4 4-4M4 16h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`

const DeleteIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 6H16M8 6V4H12V6M7 6V16H13V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`

const ShareIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="15" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="15" cy="16" r="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 9L13 5M7 11L13 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`

const meta: Meta = {
  title: 'Utility / Visually Hidden',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A zero-visual-footprint element that hides content from sighted users while keeping ' +
          'it fully present in the accessibility tree. No glass surface, no spring physics, no ' +
          'tier effects — it is a CSS utility whose value is precisely in a glass/icon-heavy ' +
          'system where interactive elements often carry visual-only labels that need ' +
          'accessible supplements.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <p style="line-height:1.6;margin-bottom:16px">
      Child content is permanently clipped to 1×1 px — invisible to sighted users,
      fully present in the accessibility tree. Inspect the DOM or use a screen reader
      to find the hidden text below.
    </p>
    <p style="margin:0;line-height:1.6">
      Signed in as Kofi<fluid-visually-hidden> — administrator, last active 2 minutes ago</fluid-visually-hidden>.
    </p>
  `,
}

// ─── fluid-button row actions ─────────────────────────────────────────────────

export const ButtonRowActions: Story = {
  name: 'fluid-button — row actions with hidden context',
  render: () => html`
    <p style="line-height:1.6;margin-bottom:16px">
      Repeated "Delete" or "Download" labels are ambiguous to screen readers navigating
      a list. Appending the row name via <code>fluid-visually-hidden</code> gives each
      button a distinct accessible name without changing what sighted users see.
    </p>
    <fluid-card style="max-width:480px">
      <h2 slot="header" style="margin:0;font-size:0.9375rem;font-weight:600">Project files</h2>
      ${[
        { name: 'Annual Report 2025.pdf', size: '2.4 MB' },
        { name: 'Q3 Budget.xlsx', size: '840 KB' },
        { name: 'Design Tokens v2.json', size: '128 KB' },
      ].map(
        (file, i) => html`
          <div
            style="
              display:flex;align-items:center;justify-content:space-between;
              padding:10px 0;font-size:0.875rem;
              ${i > 0 ? 'border-top:1px solid oklch(0.85 0 0 / 0.3)' : ''}
            "
          >
            <div>
              <span style="font-weight:500">${file.name}</span>
              <span style="margin-left:8px;opacity:0.45;font-size:0.8rem">${file.size}</span>
            </div>
            <div slot="actions" style="display:flex;gap:6px">
              <fluid-button variant="ghost" size="sm">
                Download<fluid-visually-hidden> ${file.name}</fluid-visually-hidden>
              </fluid-button>
              <fluid-button variant="destructive" size="sm">
                Delete<fluid-visually-hidden> ${file.name}</fluid-visually-hidden>
              </fluid-button>
            </div>
          </div>
        `
      )}
    </fluid-card>
  `,
}

// ─── fluid-icon-button toolbar ───────────────────────────────────────────────

export const IconButtonToolbar: Story = {
  name: 'fluid-icon-button — toolbar with hidden labels',
  render: () => html`
    <p style="line-height:1.6;margin-bottom:16px">
      <code>fluid-icon-button</code> accepts <code>aria-label</code> for its accessible
      name. <code>fluid-visually-hidden</code> is the complement for cases where the
      label must be a DOM node — e.g. when another element needs to reference it via
      <code>aria-labelledby</code>, or when the label contains structured content.
    </p>
    <fluid-card style="max-width:480px">
      <h2 slot="header" style="margin:0;font-size:0.9375rem;font-weight:600">
        Quarterly report
        <fluid-visually-hidden id="doc-status"> — draft, last saved 3 minutes ago</fluid-visually-hidden>
      </h2>
      <p style="margin:0;line-height:1.5;font-size:0.875rem">
        Glass-material document card. The header carries hidden status text via
        <code>fluid-visually-hidden</code> — sighted users see the title; screen readers
        hear the full context.
      </p>
      <div slot="actions">
        <fluid-icon-button variant="ghost" aria-label="Share document">${ShareIcon}</fluid-icon-button>
        <fluid-icon-button variant="ghost" aria-label="Download document">${DownloadIcon}</fluid-icon-button>
        <fluid-icon-button variant="destructive" aria-label="Delete document">${DeleteIcon}</fluid-icon-button>
      </div>
    </fluid-card>
  `,
}

// ─── Badge count with context ─────────────────────────────────────────────────

export const BadgeCount: Story = {
  name: 'Badge count with hidden screen reader context',
  render: () => html`
    <p style="line-height:1.6;margin-bottom:16px">
      A visual badge communicates count to sighted users. The number alone is
      ambiguous to screen readers — <code>fluid-visually-hidden</code> provides
      the full label without altering the visual design.
    </p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <fluid-button variant="secondary">
        Inbox
        <span
          aria-hidden="true"
          style="
            display:inline-flex;align-items:center;justify-content:center;
            width:18px;height:18px;border-radius:50%;margin-left:4px;
            background:oklch(0.55 0.18 25);color:#fff;font-size:0.7rem;font-weight:700
          "
        >4</span>
        <fluid-visually-hidden>4 unread messages</fluid-visually-hidden>
      </fluid-button>

      <fluid-button variant="secondary">
        Notifications
        <span
          aria-hidden="true"
          style="
            display:inline-flex;align-items:center;justify-content:center;
            width:18px;height:18px;border-radius:50%;margin-left:4px;
            background:oklch(0.55 0.18 265);color:#fff;font-size:0.7rem;font-weight:700
          "
        >12</span>
        <fluid-visually-hidden>12 new notifications</fluid-visually-hidden>
      </fluid-button>

      <fluid-button variant="secondary">
        Reviews
        <span
          aria-hidden="true"
          style="
            display:inline-flex;align-items:center;justify-content:center;
            width:18px;height:18px;border-radius:50%;margin-left:4px;
            background:oklch(0.55 0.15 140);color:#fff;font-size:0.7rem;font-weight:700
          "
        >3</span>
        <fluid-visually-hidden>3 pending reviews</fluid-visually-hidden>
      </fluid-button>
    </div>
  `,
}

// ─── Form field hint ──────────────────────────────────────────────────────────

export const FormFieldHint: Story = {
  name: 'Form field with hidden hint',
  render: () => html`
    <p style="line-height:1.6;margin-bottom:16px">
      Verbose field requirements would clutter the visual layout. Linking them via
      <code>aria-describedby</code> and <code>fluid-visually-hidden</code> delivers
      them only when a user focuses the field.
    </p>
    <fluid-card style="max-width:360px">
      <h2 slot="header" style="margin:0;font-size:0.9375rem;font-weight:600">Change password</h2>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;flex-direction:column;gap:6px">
          <label for="sb-password" style="font-size:0.875rem;font-weight:500">New password</label>
          <input
            id="sb-password"
            type="password"
            autocomplete="new-password"
            aria-describedby="sb-pwd-hint"
            style="padding:8px 12px;border-radius:6px;border:1px solid oklch(0.75 0 0 / 0.5);background:transparent;font-size:0.875rem;width:100%;box-sizing:border-box"
            placeholder="Enter new password"
          />
          <fluid-visually-hidden id="sb-pwd-hint">
            Must be at least 12 characters and include one uppercase letter,
            one number, and one special character.
          </fluid-visually-hidden>
        </div>
      </div>
      <div slot="actions">
        <fluid-button variant="primary">Update password</fluid-button>
        <fluid-button variant="ghost">Cancel</fluid-button>
      </div>
    </fluid-card>
  `,
}
