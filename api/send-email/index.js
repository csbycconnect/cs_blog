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
    // Prefer direct SMTP config for Gmail and explicit verification
    const smtpUser = process.env.NODE_SERVER_EMAIL_USER;
    const smtpPass = process.env.NODE_SERVER_EMAIL_PASS;

    const transporter = nodemailer.createTransport({
      host: process.env.NODE_SERVER_EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.NODE_SERVER_EMAIL_PORT || 465),
      secure: process.env.NODE_SERVER_EMAIL_SECURE ? process.env.NODE_SERVER_EMAIL_SECURE === 'true' : true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        // Allow self-signed certs in some environments; set to true only if necessary
        rejectUnauthorized: process.env.NODE_SERVER_EMAIL_REJECT_UNAUTHORIZED !== 'false'
      }
    });

    // Verify transporter configuration early to provide clearer error messages
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error('[Mail Transport Verify Failed]:', verifyErr);
      return res.status(500).json({ error: 'Mail transport verification failed', detail: verifyErr.message });
    }

    let subject = "";
    let htmlBody = "";

    const postTitle = templateData?.postTitle || "Untitled Submission";
    const authorName = templateData?.authorName || "Contributor";

    // ==========================================
    // TEMPLATE 1: Submission Success (Approved)
    // ==========================================
    if (templateType === 'submission_success') {
      subject = `✔ Article Approved: "${postTitle}"`;

      htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: "Courier New", monospace;
      color: #111827;
    }

    table {
      border-spacing: 0;
    }

    .wrapper {
      width: 100%;
      padding: 40px 15px;
    }

    .container {
      max-width: 600px;
      width: 100%;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 40px;
    }

    .brand {
      font-size: 13px;
      letter-spacing: 2px;
      color: #6b7280;
      text-transform: uppercase;
      padding-bottom: 20px;
    }

    .status {
      font-size: 16px;
      font-weight: bold;
      color: #16a34a;
      padding-bottom: 25px;
    }

    .title {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      padding-bottom: 20px;
      line-height: 1.4;
    }

    .content {
      font-size: 14px;
      line-height: 1.8;
      color: #374151;
    }

    .article {
      color: #111827;
      font-weight: bold;
    }

    .footer {
      margin-top: 35px;
      padding-top: 20px;
      border-top: 1px dashed #d1d5db;
      font-size: 11px;
      line-height: 1.7;
      color: #6b7280;
    }

    .link {
      color: #16a34a;
      text-decoration: none;
    }

    @media (prefers-color-scheme: dark) {

      body {
        background-color: #0b0f14;
        color: #d1d5db;
      }

      .container {
        background-color: #111827;
        border: 1px solid #1f2937;
      }

      .brand {
        color: #9ca3af;
      }

      .status {
        color: #4ade80;
      }

      .title,
      .article {
        color: #ffffff;
      }

      .content {
        color: #d1d5db;
      }

      .footer {
        color: #9ca3af;
        border-top: 1px dashed #374151;
      }

      .link {
        color: #4ade80;
      }
    }
  </style>
</head>

<body>

  <table width="100%" class="wrapper">
    <tr>
      <td align="center">

        <table class="container" cellpadding="0" cellspacing="0">

          <tr>
            <td class="brand">
              THEBYTEBOARD
            </td>
          </tr>

          <tr>
            <td class="status">
              ✔ ARTICLE APPROVED
            </td>
          </tr>

          <tr>
            <td class="title">
              Your submission has been successfully accepted.
            </td>
          </tr>

          <tr>
            <td class="content">
              Hello ${authorName},
              <br><br>

              We're pleased to inform you that your article titled
              <span class="article">"${postTitle}"</span>
              has been reviewed and officially approved for publication on TheByteBoard.
              <br><br>

              Your submission is now part of the public content stream and available through the platform dashboard.
              Thank you for contributing your ideas and perspective to the community.
              <br><br>

              We appreciate your contribution and look forward to future submissions.
            </td>
          </tr>

          <tr>
            <td class="footer">
              This is an automated notification from TheByteBoard Blog System.
              <br>
              Please do not reply directly to this email.
              <br><br>

              Visit:
              <a href="https://www.thebyteboard-csbyc.blog/" class="link">
                www.thebyteboard-csbyc.blog
              </a>
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
      subject = `❌ Submission Update: "${postTitle || 'Your Article'}"`;

      htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: "Courier New", monospace;
      color: #111827;
    }

    table {
      border-spacing: 0;
    }

    .wrapper {
      width: 100%;
      padding: 40px 15px;
    }

    .container {
      max-width: 600px;
      width: 100%;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 40px;
    }

    .brand {
      font-size: 13px;
      letter-spacing: 2px;
      color: #6b7280;
      text-transform: uppercase;
      padding-bottom: 20px;
    }

    .status {
      font-size: 16px;
      font-weight: bold;
      color: #dc2626;
      padding-bottom: 25px;
    }

    .title {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      padding-bottom: 20px;
      line-height: 1.4;
    }

    .content {
      font-size: 14px;
      line-height: 1.8;
      color: #374151;
    }

    .article {
      color: #111827;
      font-weight: bold;
    }

    .footer {
      margin-top: 35px;
      padding-top: 20px;
      border-top: 1px dashed #d1d5db;
      font-size: 11px;
      line-height: 1.7;
      color: #6b7280;
    }

    .link {
      color: #dc2626;
      text-decoration: none;
    }

    @media (prefers-color-scheme: dark) {

      body {
        background-color: #0b0f14;
        color: #d1d5db;
      }

      .container {
        background-color: #111827;
        border: 1px solid #1f2937;
      }

      .brand {
        color: #9ca3af;
      }

      .status {
        color: #f87171;
      }

      .title,
      .article {
        color: #ffffff;
      }

      .content {
        color: #d1d5db;
      }

      .footer {
        color: #9ca3af;
        border-top: 1px dashed #374151;
      }

      .link {
        color: #f87171;
      }
    }
  </style>
</head>

<body>

  <table width="100%" class="wrapper">
    <tr>
      <td align="center">

        <table class="container" cellpadding="0" cellspacing="0">

          <tr>
            <td class="brand">
              THEBYTEBOARD
            </td>
          </tr>

          <tr>
            <td class="status">
              ❌ ARTICLE NOT APPROVED
            </td>
          </tr>

          <tr>
            <td class="title">
              Your submission was not selected for publication.
            </td>
          </tr>

          <tr>
            <td class="content">
              Hello ${authorName},
              <br><br>

              Thank you for submitting your article titled
              <span class="article">"${postTitle}"</span>
              to TheByteBoard.
              <br><br>

              After review by our editorial team, we regret to inform you that your submission was not approved for publication at this time.
              <br><br>

              This decision may be based on factors such as content alignment, formatting standards, originality requirements, or editorial quality guidelines.
              <br><br>

              We genuinely appreciate your effort and encourage you to continue contributing in the future.

              <br><br>
              ${templateData && templateData.rejectionReason ? `
                <div style="margin-top:12px;padding:12px;border-left:4px solid #dc2626;background:#fff5f5;color:#611;"><strong>Editor's Note:</strong><div style="margin-top:8px;color:#4b0f0f;">${templateData.rejectionReason}</div></div>
              ` : ''}

              <br><br>

              <span style="font-size:13px; color:#6b7280;">
                Note: If you believe there may have been an issue during the review process,
                you may contact our editorial team for further assistance at
                <a 
                    href="mailto:csbyc.connect@christuniversity.in?subject=Regarding%20Rejection%20of%20Article"
                    style="color:#dc2626; text-decoration:none;"
                >
                  csbyc.connect@christuniversity.in
                </a>.
                </span>
            </td>
          </tr>

          <tr>
            <td class="footer">
              This is an automated notification from TheByteBoard Blog System.
              <br>
              Please do not reply directly to this email.
              <br><br>

              Visit:
              <a href="https://www.thebyteboard-csbyc.blog/" class="link">
                www.thebyteboard-csbyc.blog
              </a>
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
    // TEMPLATE 3: Interview Selection
    // ==========================================
    else if (templateType === 'interview_selection') {
      const recipientName = templateData?.recipientName || '';
      const roleDisplay   = templateData?.roleDisplay   || 'Contributor';

      subject = `✔ Interview Result: You've Been Selected — TheByteBoard`;

      htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{margin:0;padding:0;background:#f3f4f6;font-family:"Courier New",monospace;color:#111827;}
table{border-spacing:0;}
.wrapper{width:100%;padding:40px 15px;}
.container{max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb;padding:40px;}
.brand{font-size:13px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;padding-bottom:20px;}
.status{font-size:16px;font-weight:bold;color:#16a34a;padding-bottom:25px;}
.title{font-size:24px;font-weight:bold;color:#111827;padding-bottom:20px;line-height:1.4;}
.content{font-size:14px;line-height:1.8;color:#374151;}
.link{color:#16a34a;text-decoration:none;font-weight:bold;}
.note{margin-top:20px;padding:15px;border-left:4px solid #16a34a;background:#f0fdf4;}
.footer{margin-top:35px;padding-top:20px;border-top:1px dashed #d1d5db;font-size:11px;line-height:1.7;color:#6b7280;}
</style>
</head>
<body>
<table width="100%" class="wrapper"><tr><td align="center">
<table class="container">
<tr><td class="brand">THEBYTEBOARD</td></tr>
<tr><td class="status">✔ INTERVIEW RESULT</td></tr>
<tr><td class="title">Congratulations! You have been selected.</td></tr>
<tr><td class="content">
Hello${recipientName ? ` ${recipientName}` : ''},<br><br>
Thank you for attending the interview process with <strong>TheByteBoard Team</strong>.<br><br>
We are pleased to inform you that you have been successfully selected and will be joining our contributor team.<br>
<strong>Role:</strong> ${roleDisplay}<br><br>
Below are the platform resources:<br><br>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:15px;">

<tr>
<td width="60" valign="middle" style="padding:10px 0;">
<img
src="https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/fc0f1a34f25be43aca0587ae365db643f978e5d9/logo/GitHub_Invertocat_Black_Clearspace.png"
alt="GitHub"
width="42"
style="display:block;"
>
</td>

<td valign="middle" style="padding:10px 0;">
<div style="font-size:15px;font-weight:bold;color:#111827;">
GitHub Repository
</div>

<a
href="https://github.com/csbycconnect/cs_blog"
style="color:#16a34a;text-decoration:none;font-size:13px;"
>
Access Repository →
</a>
</td>
</tr>

<tr>
<td width="60" valign="middle" style="padding:10px 0;">
<img
src="https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/7a794075fc379bc621c141e2c00fc0e0232b6b91/logo/Christ-logo-round.png"
alt="TheByteBoard"
width="42"
style="display:block;border-radius:50%;"
>
</td>

<td valign="middle" style="padding:10px 0;">
<div style="font-size:15px;font-weight:bold;color:#111827;">
TheByteBoard
</div>

<a
href="https://www.thebyteboard-csbyc.blog"
style="color:#16a34a;text-decoration:none;font-size:13px;"
>
Visit Website →
</a>
</td>
</tr>

<tr>
<td width="60" valign="middle" style="padding:10px 0;">
<img
src="https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/ed962fcb536472adbe33117cf546c10db6fc0c9e/logo/Doc_logo.png"
alt="Documentation"
width="42"
style="display:block;"
>
</td>

<td valign="middle" style="padding:10px 0;">
<div style="font-size:15px;font-weight:bold;color:#111827;">
Documentation
</div>

<a
href="https://docs.google.com/document/d/1Udw-cilltKUlhqE96Sks-uOjRr5Upr_ynuwbq52wMHw/edit?usp=sharing"
style="color:#16a34a;text-decoration:none;font-size:13px;"
>
Read Documentation →
</a>
</td>
</tr>

</table>
<div class="note">
<strong>Important Note</strong><br><br>
You are kindly requested to register using your Christ University email address and use your CU password at:<br><br>
<a class="link" href="https://www.thebyteboard-csbyc.blog/login">https://www.thebyteboard-csbyc.blog/login</a><br><br>
Roles and permissions will be assigned within the next <strong>2 days</strong>.
</div>
<br>We look forward to working with you and seeing your contributions to TheByteBoard community.
</td></tr>
<tr><td class="footer">
This is an official communication from TheByteBoard Team.<br>
Please do not reply directly to this email.
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
    }

    else {
      return res.status(400).json({ error: "Invalid templateType provided" });
    }

    // Configuration setup for outbound mail operations
    const mailOptions = {
      from: `"ByteBoard Mail Engine" <${process.env.NODE_SERVER_EMAIL_USER}>`,
      subject: subject,
      html: htmlBody
    };

    if (Array.isArray(toEmail)) {
      mailOptions.to = smtpUser || process.env.NODE_SERVER_EMAIL_USER || 'no-reply@example.com';
      mailOptions.bcc = toEmail.join(',');
    } else {
      mailOptions.to = toEmail;
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, message: 'Transmission successfully authorized.', info });
    } catch (sendErr) {
      console.error('[Mail Send Failed]:', sendErr);
      return res.status(500).json({ error: 'Failed to send email', detail: sendErr.message });
    }

  } catch (error) {
    console.error("[Mail Endpoint Failure]:", error);
    return res.status(500).json({ error: "Internal processing crash inside mail system transaction." });
  }
}