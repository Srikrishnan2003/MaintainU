export interface SMSSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
    warning?: string;
    provider: string;
}

export interface SMSProvider {
    sendOTP(phone: string, otp: string): Promise<SMSSendResult>;
}

import { consoleProvider } from "./sms/console.provider";
import { msg91Provider } from "./sms/msg91.provider";
import { twilioProvider } from "./sms/twilio.provider";

export function getSMSProvider(): SMSProvider {
    const providerName = process.env.SMS_PROVIDER || "console";

    switch (providerName) {
        case "msg91":
            return msg91Provider;
        case "twilio":
            return twilioProvider;
        case "console":
        default:
            return consoleProvider;
    }
}

export async function sendOTP(phone: string, otp: string): Promise<SMSSendResult> {
    const provider = getSMSProvider();
    return await provider.sendOTP(phone, otp);
}
