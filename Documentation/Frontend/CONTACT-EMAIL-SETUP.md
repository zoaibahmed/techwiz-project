# Contact email setup

The contact page submits through the central API client to POST /api/v1/contact. The server validates name, email, subject and message, uses the existing CSRF protection, and limits submissions to five per IP per fifteen minutes. The limit is process-local; a multi-instance deployment needs a shared limiter.

Copy the variable names from Server/contact-email.example.env into the server environment. Supply the SMTP account address and its app password. CONTACT_ADMIN_EMAIL is optional: leaving it empty sends enquiries to the same SMTP account. Restart the backend after configuring it. A password alone cannot identify the sending account.

The administrator receives the visitor message with Reply-To set to the visitor. The visitor receives a fixed acknowledgement. If the administrator message fails, the form shows an error. If only the acknowledgement fails, the form explains that the enquiry was sent but the confirmation could not be sent. SMTP acceptance does not guarantee inbox delivery.

Never put SMTP credentials in Client, browser settings, a VITE_ variable or version control. No existing credential file was needed for implementation.

Verification: production frontend build and 22 frontend unit tests passed. Contact mail checks use an injected fake transport and send no email. Real delivery, spam-folder placement and provider configuration still need a manual check after the account owner supplies settings.
