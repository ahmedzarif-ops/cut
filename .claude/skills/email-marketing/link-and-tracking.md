# Links and Tracking

How every CTA in a built email gets a correct destination and consistent UTM tracking. The build
step (`templates/build-emails.mjs`) enforces this; the copywriter references the destination KEYS,
not raw URLs.

## Canonical destinations (key -> base URL)

The copywriter sets `cta.dest` to one of a small set of KEYS. The build resolves the key to the
base URL and appends the UTMs. Define the key→URL map ONCE per run inside the sequence JSON, under
`sequence.destinations`, built from config — never hardcode a company URL in the build script.

Typical keys (rename to your ladder; base URLs come from `company.yml` → `company.domain` and
`offer.booking_link`, confirmed against the live site):

| Key | Base URL (from config) | Use |
|---|---|---|
| `free_thing` | `https://<company.domain>/<free-diagnostic-path>` | the free diagnostic/audit/trial (cold primary CTA) |
| `entry_offer` | `https://<company.domain>/<entry-offer-path>` | the low-cost entry offer |
| `core_offer` | `https://<company.domain>/<core-offer-path>` | the core recurring offer |
| `consult` | `<company.yml → offer.booking_link>` | book a consultation (premium tier) |
| `home` | `https://<company.domain>/` | the homepage |

An unknown key is a BUILD ERROR (never ship a bare or guessed URL). Confirm the exact live paths
against the app before a run.

## UTM scheme (the only tracking we author)

The build appends these to every CTA and secondary link:

- `utm_source` = `email`
- `utm_medium` = `lifecycle`
- `utm_campaign` = the sequence slug (e.g. `welcome`)
- `utm_content` = the email slug (e.g. `welcome-01-core-insight`)

These feed your analytics so a completed free thing, an entry-offer purchase, or a core-offer
subscription can be attributed to the exact email that drove it. Booking links carry the same UTMs
as query params.

## One primary CTA per email

Each email has exactly ONE primary CTA (the bulletproof button). A secondary text link is optional
and lower-emphasis (e.g. "or book a call"). This keeps every email earning its one next step (see
`value-first-principles.md`).

## Tracking boundary (what we do NOT author)

- Open and click tracking are added by the SENDING PLATFORM (the ESP) on send. We do NOT embed a
  tracking pixel or a click-wrapper in the portable template; that keeps it ESP-agnostic and avoids
  a broken pixel when there is no send infrastructure yet.
- So the portable email's "tracking" is the UTM scheme above. Opens/clicks come online the moment
  the email is sent through any ESP.

## Unsubscribe and view-in-browser

The shell carries the tokens `{{UNSUB_URL}}` and `{{VIEW_IN_BROWSER_URL}}`. The build fills them
with the literal placeholders `%%UNSUBSCRIBE_URL%%` and `%%VIEW_IN_BROWSER_URL%%`. The chosen ESP
find-replaces those placeholders with its own merge tag (for example Mailchimp `*|UNSUB|*`, Klaviyo
`{% unsubscribe %}`, Customer.io `{{ unsubscribe_url }}`). The static preview renders the
placeholder text so the email is reviewable before an ESP is wired. A working one-click unsubscribe
is required before any bulk send (see `data-and-deliverability.md`).
