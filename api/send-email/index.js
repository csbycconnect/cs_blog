// api/send-email/index.js
import nodemailer from 'nodemailer';

// Helper function to mask email for the Welcome Wire (e.g., j***l@gmail.com)
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

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

        // ==========================================
        // TEMPLATE 1: Welcome Wire (Newsletter)
        // ==========================================
        if (templateType === 'newsletter_welcome') {
            subject = "SYSTEM BROADCAST: SUBSCRIPTION CONFIRMED";
            
            const masked = maskEmail(toEmail);
            
            htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    body { margin:0; padding:0; background-color:#f3f4f6; font-family:Courier New, monospace; color:#111827; }
    .container { background-color:#ffffff; border:1px solid #e5e7eb; }
    .header { color:#b45309; }
    .muted { color:#6b7280; }
    @media (prefers-color-scheme: dark) {
      body { background-color:#0b0f14; color:#d1d5db; }
      .container { background-color:#111827; border:1px solid #1f2937; }
      .header { color:#facc15; }
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
              SYSTEM BROADCAST: SUBSCRIPTION CONFIRMED
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6;">
              Subscription successfully activated for ByteBoard blog updates.
            </td>
          </tr>
          <tr>
            <td style="padding-top:20px; font-size:14px;">
              <strong>Status:</strong> Active<br>
              <strong>Feed:</strong> Blog Dispatch Stream<br>
              <strong>Email:</strong> ${masked}
            </td>
          </tr>
          <tr>
            <td class="muted" style="padding-top:30px; font-size:12px;">
              You will receive notifications when new blog posts are published.
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
        // TEMPLATE 2: New Dispatch Broadcast (Alerts)
        // ==========================================
        else if (templateType === 'dispatch_alert') {
            const postTitle = templateData?.postTitle || "New Intel Document";
            const authorName = templateData?.authorName || "Anonymous Contributor";
            const blogUrl = templateData?.blogUrl || "https://byteboard.vercel.app";

            subject = `ALERT: NEW BLOG POST PUBLISHED - ${postTitle.toUpperCase()}`;

            htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    body { margin:0; padding:0; background-color:#f3f4f6; font-family:Courier New, monospace; color:#111827; }
    .container { background-color:#ffffff; border:1px solid #e5e7eb; }
    .header { color:#1d4ed8; }
    .title { color:#111827; }
    .button { display:inline-block; padding:10px 16px; background-color:#111827; color:#ffffff; text-decoration:none; border:1px solid #374151; font-size:13px; }
    .muted { color:#6b7280; }
    @media (prefers-color-scheme: dark) {
      body { background-color:#0b0f14; color:#d1d5db; }
      .container { background-color:#111827; border:1px solid #1f2937; }
      .header { color:#60a5fa; }
      .title { color:#ffffff; }
      .button { background-color:#1f2937; border:1px solid #374151; color:#ffffff; }
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
              ALERT: NEW BLOG POST PUBLISHED
            </td>
          </tr>
          <tr>
            <td class="title" style="font-size:18px; font-weight:bold; padding-bottom:10px;">
              ${postTitle}
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;">
              Author: ${authorName}<br>
              Status: Published
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; line-height:1.6; padding-top:10px;">
              A new blog post is now live on ByteBoard. Open the platform to read the full article.
            </td>
          </tr>
          <tr>
            <td style="padding-top:25px;">
              <a href="${blogUrl}" class="button" style="color: #ffffff;">
                Open Blog
              </a>
            </td>
          </tr>
          <tr>
            <td class="muted" style="padding-top:30px; font-size:12px;">
              ByteBoard Blog System Notification
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

        // Send out the email message transaction
        const mailOptions = {
            from: `"ByteBoard Mail Engine" <${process.env.SERVER_EMAIL_USER}>`,
            subject: subject,
            html: htmlBody
        };

        // If it's a dispatch broadcast alert, toEmail will be an array of multiple subscribers.
        // We set the target to our own address and pass the array into the hidden BCC block.
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