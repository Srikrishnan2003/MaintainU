import { SMSProvider, SMSSendResult } from "../sms.service";

export const twilioProvider: SMSProvider = {
    async sendOTP(phone: string, otp: string): Promise<SMSSendResult> {
        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

        // ─── SMS PROVIDER PLACEHOLDER ──────────────────────────────────────
        // To activate Twilio:
        // 1. Add to .env.local: TWILIO_ACCOUNT_SID=your_sid
        // 2. Add to .env.local: TWILIO_AUTH_TOKEN=your_token
        // 3. Add to .env.local: TWILIO_FROM_NUMBER=your_number
        // 4. Set SMS_PROVIDER=twilio
        // 5. Remove the placeholder return below and uncomment the fetch block
        // ───────────────────────────────────────────────────────────────────
        
        // PLACEHOLDER: remove this return and uncomment the fetch block below
        return { 
          success: true, 
          messageId: `placeholder_${Date.now()}`, 
          provider: "twilio",
          warning: "SMS_PROVIDER=twilio is set but placeholder is still active"
        };
        
        /*
        try {
            if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
                return { success: false, provider: "twilio", error: "Missing Twilio credentials in environment variables." };
            }

            const encodedParams = new URLSearchParams();
            encodedParams.append("To", phone);
            encodedParams.append("From", TWILIO_FROM_NUMBER);
            encodedParams.append("Body", `Your MaintainU verification code is: ${otp}. Valid for 5 minutes.`);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
                },
                body: encodedParams.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, provider: "twilio", error: `Twilio API error: ${response.status} ${errorText}` };
            }

            const data = await response.json();
            return {
                success: true,
                messageId: data.sid,
                provider: "twilio"
            };
        } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            return { success: false, provider: "twilio", error: `Fetch error: ${errMessage}` };
        }
        */
    }
};
