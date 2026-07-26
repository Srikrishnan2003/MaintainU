export interface EmailPayload {
    to: string;
    subject: string;
    body: string;      // plain text
    html?: string;     // optional HTML version
}

export interface EmailProvider {
    send(payload: EmailPayload): Promise<void>;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
    try {
        const providerName = process.env.EMAIL_PROVIDER || "console";
        let provider: EmailProvider;

        if (providerName === "resend") {
            const module = await import("./email/resend.provider");
            provider = module.resendProvider;
        } else if (providerName === "sendgrid") {
            const module = await import("./email/sendgrid.provider");
            provider = module.sendgridProvider;
        } else {
            const module = await import("./email/console.provider");
            provider = module.consoleProvider;
        }

        await provider.send(payload);
    } catch (error: unknown) {
        console.error("sendEmail error:", error);
    }
}
