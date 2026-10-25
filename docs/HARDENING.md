# Web MVP hardening

This work preserves the canonical 390×844 Figma screenshots. Narrower and shorter
viewports reflow instead of shrinking controls. It does not add V1/V2 features.

## Automated checks

- `npm run test:domain`: planner, transaction, storage schema and adversarial input checks.
- `npm run test:e2e`: complete browser suite, including axe-core WCAG A/AA scans,
  keyboard dialogs/radios, 320/360/390/430px viewport checks, local-data recovery,
  synthetic text injection, cross-tab data clearing, manifest icons and offline reload.
- Existing screenshot tolerances and Figma-sourced baselines remain unchanged.
- CI is the authoritative execution result; test discovery/typechecking alone is not a pass.

## Safeguards

Dialogs manage initial focus, trap keyboard navigation, support Escape and restore
the opener. Background content is inert while modal controls are open. Radio groups
support arrow keys, Home and End with a single Tab stop.

Saved data is schema-checked and bounded before load/save. Malformed, oversized and
unknown-version data is preserved until the user explicitly confirms clearing it.
Storage errors do not echo private exception details. Clearing local data notifies
other open tabs so their stale in-memory state cannot resurrect deleted content.

The offline cache contains the static app shell and local font/icon assets. Task,
cycle and plan content is not sent to an analytics service or stored in response
caches. PWA icons are exports of the existing canonical Figma mark, not a redesign.

## Limits

Browser local storage remains unencrypted. Anyone with access to the same browser
profile, or code running with this site's origin privileges, may access it. These
checks are not a security certification or protection against a compromised device.

Automated Chromium checks are not exhaustive WCAG conformance or physical-device
validation. Screen-reader usability, operating-system installation prompts, private
hosting authentication, and each browser/platform require their own real-device
review. No native app, cloud sync, account, calendar or AI-provider integration is
introduced by this hardening work.

## Approved contrast correction

On 2026-10-08, the owner approved removing only the 78% opacity from the
missed-block time metadata (canonical Figma frame `4198:197`). The existing
`#666` secondary-text token, font, size and position remain unchanged. This is
a deliberate, narrowly scoped accessibility difference from the design, whose
original opacity produced 3.25:1 contrast. Screenshot baselines and tolerances
remain unchanged.
