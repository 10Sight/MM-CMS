import twilio from "twilio";
import EVN from "../config/env.config.js";
import { ApiError } from "../utils/ApiError.js";

let twilioClient = null;

const getTwilioClient = () => {
  if (!EVN.TWILIO_SID || !EVN.TWILIO_AUTH || !EVN.TWILIO_NUMBER) {
    console.warn("⚠️ Twilio env vars are missing. SMS sending is disabled.");
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(EVN.TWILIO_SID, EVN.TWILIO_AUTH);
  }
  return twilioClient;
};

export const sendLoginOtpSms = async (to, otp) => {
  const client = getTwilioClient();
  if (!client) {
    throw new ApiError(500, "SMS service is not configured");
  }

  try {
    const message = await client.messages.create({
      body: `Your login OTP is ${otp}. It will expire in 5 minutes.`,
      from: EVN.TWILIO_NUMBER,
      to,
    });
    return message.sid;
  } catch (err) {
    console.error("Twilio SMS error:", err.message || err);
    throw new ApiError(500, "Failed to send OTP. Please try again later.");
  }
};

export default sendLoginOtpSms;