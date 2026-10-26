# Qamivo Mail

Qamivo Mail is the first-party email API and developer dashboard within Qamivo. It uses Resend as the delivery provider; it is not an independent SMTP network and does not claim delivery until a signed provider event confirms it.

## Current architecture

- Authenticated dashboard at /mail, protected by the existing Netlify Identity session and verified-email gate.
- Server-only provider integration: RESEND_API_KEY is a sending-access key; RESEND_DOMAIN_API_KEY is a separate full-access key used only by the server to register and verify domains. Neither key is returned to the client.
- Workspace API keys are generated with cryptographic randomness. Only a SHA-256 digest and non-secret prefix are stored; the raw key is returned once on creation.
- Domain registration and verification are delegated to the provider. Qamivo stores ownership, verification state, and provider-generated DNS records. A sender can be used only by the workspace that owns the exact verified domain.
- Email requests are validated, logged without body content, constrained to ten recipients, and idempotent when an Idempotency-Key is supplied.
- The Resend webhook updates Qamivo Mail email state. Provider acceptance is not equivalent to final inbox delivery.
- The external API endpoint is POST /api/mail/v1/emails. Management endpoints require a verified Netlify Identity session.

## Required configuration

Set these as Netlify environment variables with the Functions scope, then redeploy:

- RESEND_API_KEY — a Resend sending-access API key; it may be account-wide or restricted to a single provider-verified domain. Never put this value in source code.
- RESEND_DOMAIN_API_KEY — a separate Resend full-access API key used only by server-side calls to create/check/verify domains. Store it as a secret with Functions scope and never expose it to the browser. This key’s permissions are broader, so use a dedicated Resend account for Qamivo Mail where practical.
- QAMIVO_APP_URL — canonical HTTPS URL, recommended as https://qamivo-platform.netlify.app.
- RESEND_WEBHOOK_SECRET — the signing secret for a Resend webhook targeting https://qamivo-platform.netlify.app/api/webhooks/resend. Subscribe to the supported sent, delivered, delayed, bounced, complained, opened and clicked events.

Qamivo account verification emails also rely on QAMIVO_FROM_EMAIL and QAMIVO_OTP_SECRET. Those settings are separate from the sender-domain records used by the Qamivo Mail API.

## DNS and domain workflow

1. Add your sending domain in the dashboard.
2. Publish the exact DNS records returned by Resend. Do not guess SPF or DKIM values, and review any existing email configuration before changing records.
3. Use Verify DNS after publishing changes. Only a provider-verified domain is eligible as a sender.
4. Keep a reviewed DMARC policy at the domain's _dmarc label. Choose it based on all legitimate senders for that domain.
5. For inbox delivery status, configure the signed provider webhook and observe a delivered event.

## Send endpoint

POST https://qamivo-platform.netlify.app/api/mail/v1/emails

Headers:
    Authorization: Bearer qm_live_YOUR_KEY
    Content-Type: application/json
    Idempotency-Key: optional-stable-request-id

Request JSON:
    {
      "from": "hello@your-verified-domain.com",
      "to": ["customer@example.com"],
      "subject": "Your order is confirmed",
      "text": "Thank you for your order.",
      "html": "<p>Thank you for your order.</p>"
    }

Send either html or text, or both. The current release accepts up to ten recipient addresses. It does not retain email bodies in the application log.

## Limitations

This is an early-access transactional email API, not a bulk marketing platform. There is no independent SMTP infrastructure, bounce-management UI beyond provider event status, inbound mailbox, contact list, campaign scheduler, suppression-management UI, tenant billing, or per-tenant throughput quota. The Netlify function has platform IP/domain rate limiting plus an application guard of 100 send requests per workspace per rolling hour. Production use still needs stronger abuse monitoring and atomic quota enforcement under concurrent load. Configure and test the provider before sending real customer mail.

Validate the feature in a deploy preview with the provider key configured: key creation/revocation, duplicate idempotency requests, domain ownership, valid/invalid DNS status, real recipient send, provider errors, signed webhook events and cross-workspace access.
