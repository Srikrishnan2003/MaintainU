import { EmailProvider, EmailPayload } from "../email.service";

// Used by sendEmail service
export const sendgridProvider: EmailProvider = {
    async send(payload: EmailPayload): Promise<void> {
        const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
        const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS;

        // ─── SENDGRID PROVIDER PLACEHOLDER ──────────────────────────────────
        // To activate: set EMAIL_PROVIDER=sendgrid, SENDGRID_API_KEY, and EMAIL_FROM_ADDRESS in .env
        // Uncomment the fetch call below
        // ───────────────────────────────────────────────────────────────────

        // Fallback console log when commented out
        console.log(`[SendGrid Placeholder] Sending email to ${payload.to}: ${payload.subject}`);

        /*
        try {
            if (!SENDGRID_API_KEY || !EMAIL_FROM_ADDRESS) {
                console.error("SendGrid error: Missing SENDGRID_API_KEY or EMAIL_FROM_ADDRESS in environment variables.");
                return;
            }

            const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SENDGRID_API_KEY}`
                },
                body: JSON.stringify({
                    personalizations: [
                        {
                            to: [{ email: payload.to }]
                        }
                    ],
                    from: { email: EMAIL_FROM_ADDRESS },
                    subject: payload.subject,
                    content: [
                        {
                            type: "text/plain",
                            value: payload.body
                        },
                        ...(payload.html ? [{
                            type: "text/html",
                            value: payload.html
                        }] : [])
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`SendGrid API error: ${response.status} ${errorText}`);
                return;
            }

            console.log(`SendGrid email sent successfully.`);
        } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            console.error(`SendGrid fetch error: ${errMessage}`);
        }
        */
    }
};
