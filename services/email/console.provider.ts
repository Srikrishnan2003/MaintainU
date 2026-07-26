import { EmailProvider, EmailPayload } from "../email.service";

// Used by sendEmail service
export const consoleProvider: EmailProvider = {
    async send(payload: EmailPayload): Promise<void> {
        console.log(`\n┌────────────────────────────────────────────────────────────┐`);
        console.log(`│  📧 TO: ${payload.to.padEnd(50)} │`);
        console.log(`│  📝 SUBJECT: ${payload.subject.padEnd(45)} │`);
        console.log(`├────────────────────────────────────────────────────────────┤`);
        console.log(`│  💬 BODY:                                                  │`);
        const lines = payload.body.split("\n");
        for (const line of lines) {
            console.log(`│  ${line.padEnd(58)} │`);
        }
        console.log(`└────────────────────────────────────────────────────────────┘\n`);
    }
};
