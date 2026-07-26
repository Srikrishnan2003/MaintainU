import { SMSProvider, SMSSendResult } from "../sms.service";

export const consoleProvider: SMSProvider = {
    async sendOTP(phone: string, otp: string): Promise<SMSSendResult> {
        console.log(`\n┌─────────────────────────────────────────┐`);
        console.log(`│  📱 OTP for ${phone.padEnd(23)} │`);
        console.log(`│  🔑 Code: ${otp.padEnd(25)} │`);
        console.log(`│  ⏱️  Expires in 5 minutes               │`);
        console.log(`└─────────────────────────────────────────┘\n`);

        return {
            success: true,
            provider: "console",
            messageId: `console_${Date.now()}`
        };
    }
};
