import { EmailProvider, EmailPayload } from "../email.service";

// Used by sendEmail service
export const resendProvider: EmailProvider = {
    async send(payload: EmailPayload): Promise<void> {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        // ─── RESEND PROVIDER PLACEHOLDER ────────────────────────────────────
        // To activate: set EMAIL_PROVIDER=resend and RESEND_API_KEY in .env
        // Uncomment the fetch call below
        // ───────────────────────────────────────────────────────────────────

        // Fallback console log when commented out
        console.log(`[Resend Placeholder] Sending email to ${payload.to}: ${payload.subject}`);

        /*
        try {
            if (!RESEND_API_KEY) {
                console.error("Resend error: Missing RESEND_API_KEY in environment variables.");
                return;
            }

            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev",
                    to: payload.to,
                    subject: payload.subject,
                    text: payload.body,
                    html: payload.html
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Resend API error: ${response.status} ${errorText}`);
                return;
            }

            const data = await response.json();
            console.log(`Resend email sent successfully. ID: ${data.id}`);
        } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            console.error(`Resend fetch error: ${errMessage}`);
        }
        */
    }
};
