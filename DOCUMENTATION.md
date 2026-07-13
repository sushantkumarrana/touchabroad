# Touch Abroad — Analytics, Tracking & Integration Guide

This document explains the marketing, analytics and lead-tracking layer built into the site
and exactly how to connect it to Google Tag Manager, GA4, Google Ads, Meta Pixel, Google
Sheets and (later) a CRM.

The site follows a **GTM-first** architecture: the pages push a clean, standardised
`dataLayer` for every important interaction, and **GTM owns all the destinations** (GA4,
Google Ads, Meta Pixel). This keeps tags maintainable and means you rarely have to touch the
code again after launch.

---

## 1. Quick-start checklist

1. Create a **GTM container** → copy its `GTM-XXXXXXX` ID.
2. Find-and-replace `GTM-XXXXXXX` in `partials/head.tpl` (and re-run `build.py`), **or** in
   each `.html` file’s `<head>` snippet and the `<noscript>` tag. *(Two occurrences per page.)*
3. In GTM, add tags for **GA4**, **Google Ads** and **Meta Pixel** (recipes below).
4. Decide where leads should be stored and set `TA_CONFIG.endpoint` (Section 7).
5. Submit `sitemap.xml` in **Google Search Console**.
6. Publish the GTM container. Use **GTM Preview** + GA4 **DebugView** to verify events.

---

## 2. How the tracking layer is organised

| File | Responsibility |
|---|---|
| `partials/head.tpl` | Loads the GTM container (head + noscript). GA4/Ads/Pixel are intentionally **not** hard-coded — add them as GTM tags. |
| `assets/js/tracking.js` | Initialises `dataLayer`, captures attribution, pushes page/scroll/click/FAQ events. Exposes `window.taTrack(event, params)` and `window.taGetAttribution()`. |
| `assets/js/forms.js` | Fires form lifecycle events and `generate_lead`, then submits the lead and redirects to the thank-you page. |
| `thank-you.html` | Pushes a per-form `thank_you` conversion event (reads `?form=`). |
| `partials/scripts.html` | Holds `TA_CONFIG` (endpoint, thank-you URL, lead value). |

> Nothing in the JS sends data to Google/Meta directly. It only writes to `dataLayer`. GTM
> reads `dataLayer` and fires the actual marketing tags. That separation is deliberate.

---

## 3. dataLayer event reference

Every event automatically includes these base parameters:

`event`, `page_name`, `page_url`, `page_path`, `timestamp`

Plus event-specific parameters:

| Event | When it fires | Key extra parameters |
|---|---|---|
| `page_view` | Every page load | (base only) |
| `scroll_depth` | At 25 / 50 / 75 / 100 % | `scroll_percent` |
| `session_duration` | On page hide/unload | `seconds_on_page` |
| `cta_click` | Any element with `data-event="cta_click"` | `button_name`, `section_name` |
| `phone_click` | `tel:` links / `data-event="phone_click"` | `phone_number`, `link_text` |
| `email_click` | `mailto:` links | `email`, `link_text` |
| `whatsapp_click` | WhatsApp links | `link_text` |
| `external_link_click` | Off-site links | `link_url`, `link_text` |
| `download_click` | Links to files (pdf, doc, etc.) | `link_url` |
| `faq_click` | Opening an FAQ item | `faq_question` |
| `form_start` | First interaction with a form | `form_name` |
| `form_error` | Validation / spam failure | `form_name`, `error_fields` or `error_type` |
| `form_abandonment` | Started but left without submitting | `form_name` |
| `generate_lead` | Successful, validated submission | `form_name`, `course`, `value`, `currency` |
| `thank_you` | Thank-you page load | `form_name`, `conversion: true`, `page_name` |

Generic clicks: add `data-event`, `data-section`, `data-button` attributes to any element and
it’s automatically tracked. All interactive elements on the site already carry these.

---

## 4. Attribution capture (first-touch)

On first visit, `tracking.js` records and persists (sessionStorage + 90-day cookies for the
ad IDs) the following, and **attaches them to every lead payload** automatically:

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`,
`referrer`, `landing_page`, plus device/browser/OS and language.

This means a lead captured from a Google Ads click already carries its `gclid`, and a Meta
lead carries its `fbclid` — ready for offline-conversion import and accurate source reporting.

---

## 5. GA4 setup (via GTM)

1. In GTM: **Tag → Google Analytics: GA4 Configuration**, Measurement ID `G-XXXXXXX`,
   trigger **All Pages**. (Enhanced Measurement can stay on.)
2. For each custom event you care about, add a **GA4 Event** tag:
   - Event name = the dataLayer event (e.g. `generate_lead`, `phone_click`, `faq_click`).
   - Trigger = **Custom Event** matching that event name.
   - Map parameters via **Data Layer Variables** (e.g. `form_name`, `course`, `scroll_percent`).
3. In GA4 → Admin → **Custom definitions**, register `form_name`, `course`, `section_name`
   etc. as custom dimensions so they appear in reports.
4. Mark `generate_lead` (and/or `thank_you`) as a **Key event / conversion** in GA4.

**Recommended GA4 conversions:** `generate_lead`, `thank_you`, `phone_click`.

---

## 6. Google Ads & Meta Pixel (via GTM)

**Google Ads**
- Add a **Google Ads Conversion Tracking** tag, trigger on **Custom Event `generate_lead`**
  (or `thank_you` if you prefer to count on the thank-you page — pick one to avoid
  double-counting). Pass `value` and `currency` (CAD) from the dataLayer.
- For **call tracking**, add a second conversion on `phone_click`.
- For offline import later, the stored `gclid` travels with every lead (Section 4).

**Meta Pixel**
- Add the **Meta Pixel base code** tag on All Pages.
- Add a **Lead** event tag triggered on Custom Event `generate_lead`.
- Optional richer events map cleanly: `ViewContent` (program page views),
  `Contact` (`phone_click`/`email_click`), `SubmitApplication` / `CompleteRegistration`
  (`thank_you`), `Schedule` (booking). The **Conversions API** can be added server-side later
  using the same event names.

**Per-form conversions:** because the thank-you page fires `thank_you` with the specific
`form_name`, you can build separate conversions per form (PSW vs Office vs Contact) by
matching `form_name` in the trigger.

---

## 7. Lead capture / storage (set the endpoint)

Forms POST a JSON payload to `TA_CONFIG.endpoint`. If the endpoint is empty, the form still
validates, fires `generate_lead`, shows success and redirects (great for demos) — it just
doesn’t persist the lead. Set the endpoint to start storing leads.

**Lead payload shape (already assembled by `forms.js`):**
```json
{
  "form_name": "psw_hero",
  "page_name": "psw",
  "page_url": "https://www.touchabroad.ca/psw.html",
  "submitted_at": "2026-01-15T14:03:22.000Z",
  "full_name": "Jane Doe",
  "phone": "(289) 555-0100",
  "email": "jane@example.com",
  "course": "Personal Support Worker (PSW)",
  "contact_method": "Phone Call",
  "message": "…",
  "consent": "on",
  "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "psw-on",
  "gclid": "…", "fbclid": "",
  "referrer": "https://www.google.com/",
  "landing_page": "https://www.touchabroad.ca/psw.html?gclid=…",
  "device": "mobile", "browser": "Chrome", "os": "Android"
}
```

### Option A — Google Sheets via Apps Script (simplest, no server)
1. Create a Google Sheet with a header row matching the payload keys.
2. **Extensions → Apps Script**, paste the script below, **Deploy → New deployment → Web app**,
   execute as *Me*, access *Anyone*. Copy the Web-app URL.
3. Put that URL in `TA_CONFIG.endpoint` (in `partials/scripts.html`, then `build.py`; or in
   each page’s `scripts` block).

```javascript
// Google Apps Script — receives Touch Abroad leads into the active sheet
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(20000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads')
              || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = JSON.parse(e.postData.contents);

    // Create header row on first run
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'submitted_at','form_name','page_name','full_name','phone','email',
        'course','contact_method','message','consent',
        'utm_source','utm_medium','utm_campaign','gclid','fbclid',
        'referrer','landing_page','device','browser','os','status','notes'
      ]);
    }
    sheet.appendRow([
      data.submitted_at, data.form_name, data.page_name, data.full_name,
      data.phone, data.email, data.course, data.contact_method, data.message,
      data.consent, data.utm_source, data.utm_medium, data.utm_campaign,
      data.gclid, data.fbclid, data.referrer, data.landing_page,
      data.device, data.browser, data.os, 'New', ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```
> Note: Apps Script web apps don’t return CORS headers, so the browser can’t read the
> response — that’s fine. The site uses a “fire-and-redirect” pattern, so the lead is written
> and the user still reaches the thank-you page. The `status` and `notes` columns give you a
> lightweight place to manage leads inside the Sheet itself.

### Option B — Zapier / Make webhook
Set `TA_CONFIG.endpoint` to a **Catch Hook** URL. From there, fan out to Google Sheets, email,
Slack, Mailchimp/Brevo, or a CRM with zero code changes on the site.

### Option C — Custom API / CRM (Zoho, HubSpot, Salesforce)
Point `endpoint` at your own API route that validates the payload and writes to the CRM. The
payload already contains everything most CRMs need (contact fields + UTM/GCLID attribution).
Because all integration logic lives behind one endpoint, **swapping providers never requires
touching the front-end**.

---

## 8. Google Forms integration (per the brief)

If you specifically want submissions mirrored into a **Google Form** (and therefore its linked
Sheet), two approaches work:

- **Recommended:** use the Apps Script above to write straight to the Sheet — same end result,
  fewer moving parts, all fields captured.
- **Direct Google Form POST:** create the Form, get each field’s `entry.XXXX` ID
  (from the pre-filled-link tool), and have your endpoint/Zap map payload keys →
  `entry.XXXX` and POST to the Form’s `…/formResponse` URL. Keep this server-side (or in a
  Zap) to avoid CORS issues.

---

## 9. Lead-management dashboard (needs a backend)

A full admin dashboard with **search, filter, pagination, edit/delete, status, CSV/Excel
export** cannot run from static HTML — it requires stored data and an authenticated backend.
The architecture here is ready for it:

- **Fastest path:** the Google Sheet (Option A) *is* a usable dashboard — sort, filter,
  AutoFilter, and the `status`/`notes` columns cover day-to-day lead handling, and Sheets
  exports to CSV/Excel natively.
- **Full app later:** point `endpoint` at a small backend (Node/Express, Next.js API route,
  Firebase, Supabase, etc.) that stores leads in a database and serves an admin UI. Reuse the
  exact payload in Section 7 — no front-end changes needed.

Server-side-only fields noted in the brief (e.g. **IP address**, precise geo) must be added by
that backend from the request headers, where permitted by law and your privacy policy.

---

## 10. WordPress / Elementor / Contact Form 7 notes

Touch Abroad’s live stack is WordPress + Elementor. To port these forms to **Contact Form 7**:

- Recreate each form’s fields in CF7 using the **same `name` attributes**
  (`full_name`, `phone`, `email`, `course`, `contact_method`, `message`, `consent`) so your
  tracking and any mail tags line up.
- Keep the **honeypot** (`_hp`) — CF7 has add-ons, or keep the hidden field and time-trap.
- For tracking, you can either keep `forms.js` (bind it to the CF7 form) or use CF7’s
  `wpcf7mailsent` JS event to push `generate_lead` to `dataLayer`, then redirect to
  `thank-you.html?form=<name>`.
- Hidden fields can carry the captured UTM/GCLID values into CF7 (populate them from
  `window.taGetAttribution()` on submit).
- Paste GTM via a header plugin or your theme’s header, replacing `GTM-XXXXXXX`.

---

## 11. SEO & Search Console

Already implemented: unique meta titles/descriptions, canonical URLs, Open Graph + Twitter
cards, semantic heading hierarchy, breadcrumb markup, `EducationalOrganization` +
`FAQPage` + `BreadcrumbList` JSON-LD, `robots.txt`, `sitemap.xml`, image `alt` guidance.

To finish: verify the domain in **Google Search Console**, submit the sitemap, and validate
structured data with Google’s **Rich Results Test**.

---

## 12. Future integrations

Because everything routes through `dataLayer` (marketing) and a single `endpoint` (leads), all
of the following can be added **without front-end changes**: Google Ads, Meta Ads, GA4, GTM,
Search Console, Meta Conversions API, Google Forms/Sheets, Zapier, Make, Zoho, HubSpot,
Salesforce, Mailchimp, Brevo, webhooks and REST APIs.
