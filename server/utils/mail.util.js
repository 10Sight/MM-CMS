import nodemailer from "nodemailer";
import EVN from "../config/env.config.js";

// Create transporter once and reuse it for all emails
const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: EVN.SMTP_USERNAME,
        pass: EVN.SMTP_PASSWORD,
    },
    // Fail faster instead of hanging indefinitely on bad networks
    connectionTimeout: 10000, // 10s to establish connection
    greetingTimeout: 10000,   // 10s waiting for server greeting
    socketTimeout: 20000,     // 20s inactivity timeout during data transfer
});

/**
 * Send an email.
 *
 * @param {string|string[]} email - Primary recipient(s). Can be a single email or comma-separated list.
 * @param {string} subject - Email subject.
 * @param {string} message - HTML message body.
 * @param {string|string[]} [cc] - Optional CC recipient(s).
 */
const sendMail = async function (email, subject, message, cc) {
    await transporter.sendMail({
        from: `Sarvagaya Institute <${EVN.SMTP_USERNAME}>`,
        to: email,
        cc: cc || undefined,
        subject: subject,
        html: message,
    });
};

export default sendMail;
