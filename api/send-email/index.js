// api/send-email/index.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Enable CORS for frontend communication
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { templateType, toEmail, templateData } = req.body;

        if (!toEmail || !templateType) {
            return res.status(400).json({ error: "Missing required parameters: toEmail or templateType" });
        }

        // Initialize Nodemailer transporter with secure environment variables
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SERVER_EMAIL_USER, // Your sending address configured in Vercel
                pass: process.env.SERVER_EMAIL_PASS  // Your secure 16-character Gmail App Password
            }
        });

        let subject = "";
        let htmlBody = "";

        const postTitle = templateData?.postTitle || "Untitled Submission";
        const authorName = templateData?.authorName || "Contributor";

        // ==========================================
        // TEMPLATE 1: Submission Success (Approved)
        // ==========================================
        if (templateType === 'submission_success') {
            subject = `🎉 ARTICLE APPROVED: "${postTitle.toUpperCase()}"`;

            htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    body { margin:0; padding:0; background-color:#f3f4f6; font-family:Courier New, monospace; color:#111827; }
    .container { background-color:#ffffff; border:1px solid #e5e7eb; }
    .header { color:#16a34a; }
    .title { color:#111827; }
    .muted { color:#6b7280; }
    @media (prefers-color-scheme: dark) {
      body { background-color:#0b0f14; color:#d1d5db; }
      .container { background-color:#111827; border:1px solid #1f2937; }
      .header { color:#4ade80; }
      .title { color:#ffffff; }
      .muted { color:#9ca3af; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" class="container" style="padding:30px;">
          <tr>
            <td class="header" style="font-size:16px; font-weight:bold; padding-bottom:20px;">
              ✔ SUBMISSION STATUS UPDATE: APPROVED
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6;">
              Hello ${authorName},
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6; padding-top:10px;">
              Great news! Your article submission titled <strong class="title">"${postTitle}"</strong> has cleared our content evaluation backlog and is now officially <strong>ACCEPTED</strong>.
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6; padding-top:10px;">
              It has been indexed and is actively rendering across the public dashboard streams. Thank you for contributing your perspective to ByteBoard.
            </td>
          </tr>
          <tr>
            <td class="muted" style="padding-top:30px; font-size:11px; border-top:1px dashed #e5e7eb; margin-top:20px;">
              This is an automated operational transmission from the PhD Management Systems. Please do not reply directly to this inbox line.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
        }

        // ==========================================
        // TEMPLATE 2: Submission Reject (Declined)
        // ==========================================
        else if (templateType === 'submission_reject') {
            subject = `REJECTED: Submission Update for "${postTitle || 'Your Article'}"`;

            htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    body { margin:0; padding:0; background-color:#f3f4f6; font-family:Courier New, monospace; color:#111827; }
    .container { background-color:#ffffff; border:1px solid #e5e7eb; }
    .header { color:#dc2626; }
    .title { color:#111827; }
    .muted { color:#6b7280; }
    @media (prefers-color-scheme: dark) {
      body { background-color:#0b0f14; color:#d1d5db; }
      .container { background-color:#111827; border:1px solid #1f2937; }
      .header { color:#f87171; }
      .title { color:#ffffff; }
      .muted { color:#9ca3af; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" class="container" style="padding:30px;">
          <tr>
            <td class="header" style="font-size:16px; font-weight:bold; padding-bottom:20px;">
              ❌ SUBMISSION STATUS UPDATE: DECLINED
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6;">
              Hello ${authorName},
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6; padding-top:10px;">
              Thank you for taking the time to submit your document titled <strong class="title">"${postTitle}"</strong> to ByteBoard.
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6; padding-top:10px;">
              Following assessment from our editorial panel review engine, we regret to inform you that your submission was not accepted for publication at this time.
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6; padding-top:10px;">
              We encourage you to review our formatting metrics and technical manual submission criteria before attempting to upload subsequent files to the repository.
            </td>
          </tr>
          <tr>
            <td class="muted" style="padding-top:30px; font-size:11px; border-top:1px dashed #e5e7eb; margin-top:20px;">
              This is an automated operational transmission from the PhD Management Systems. Please do not reply directly to this inbox line.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
        } else {
            return res.status(400).json({ error: "Invalid templateType provided" });
        }

        // Configuration setup for outbound mail operations
        const mailOptions = {
            from: `"ByteBoard Mail Engine" <${process.env.SERVER_EMAIL_USER}>`,
            subject: subject,
            html: htmlBody
        };

        if (Array.isArray(toEmail)) {
            mailOptions.to = process.env.SERVER_EMAIL_USER;
            mailOptions.bcc = toEmail; 
        } else {
            mailOptions.to = toEmail;
        }

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: "Transmission successfully authorized." });

    } catch (error) {
        console.error("[Mail Endpoint Failure]:", error);
        return res.status(500).json({ error: "Internal processing crash inside mail system transaction." });
    }
}