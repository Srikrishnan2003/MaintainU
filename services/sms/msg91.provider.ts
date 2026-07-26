import { SMSProvider, SMSSendResult } from "../sms.service";

export const msg91Provider: SMSProvider = {
    async sendOTP(phone: string, otp: string): Promise<SMSSendResult> {
        const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
        const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

        // ─── SMS PROVIDER PLACEHOLDER ──────────────────────────────────────
        // To activate MSG91:
        // 1. Add to .env.local: MSG91_AUTH_KEY=your_key
        // 2. Add to .env.local: MSG91_TEMPLATE_ID=your_template_id
        // 3. Set SMS_PROVIDER=msg91
        // 4. Remove the placeholder return below and uncomment the fetch block
        // ───────────────────────────────────────────────────────────────────
        
        // PLACEHOLDER: remove this return and uncomment the fetch block below
        return { 
          success: true, 
          messageId: `placeholder_${Date.now()}`, 
          provider: "msg91",
          warning: "SMS_PROVIDER=msg91 is set but placeholder is still active"
        };
        
        /*
        try {
            if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
                return { success: false, provider: "msg91", error: "Missing MSG91 credentials in environment variables." };
            }

            const response = await fetch("https://api.msg91.com/api/v5/otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "authkey": MSG91_AUTH_KEY
                },
                body: JSON.stringify({
                    template_id: MSG91_TEMPLATE_ID,
                    mobile: phone,
                    otp: otp
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, provider: "msg91", error: `MSG91 API error: ${response.status} ${errorText}` };
            }

            const data = await response.json();
            if (data.type === "error") {
                return { success: false, provider: "msg91", error: `MSG91 error: ${data.message}` };
            }

            return {
                success: true,
                messageId: data.request_id || `msg91_${Date.now()}`,
                provider: "msg91"
            };
        } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            return { success: false, provider: "msg91", error: `Fetch error: ${errMessage}` };
        }
        */
    }
};
