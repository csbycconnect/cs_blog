// api/send-email/index.js
import nodemailer from 'nodemailer';

// Increase body size limit so base64-encoded poster images can be sent in the JSON body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
    const { templateType, toEmail, templateData, attachment } = req.body;

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

    // ==========================================
    // TEMPLATE 5: Call for Blog Submissions
    // ==========================================
    else if (templateType === 'submission_call') {

      const className = templateData?.className || 'Your Class';
      const endDate = templateData?.endDate || 'the submission deadline';

      subject = `TheByteBoard | Call for Submissions — ${className}`;

      htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

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
      padding: 35px 15px;
    }

    .container {
      max-width: 620px;
      width: 100%;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
    }

    .header {
      padding: 32px 38px 20px;
    }

    .brand {
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 3px;
      color: #080e3f;
      text-transform: uppercase;
    }

    .department {
      margin-top: 6px;
      font-size: 11px;
      color: #6b7280;
      letter-spacing: 0.5px;
    }

    .hero {
      padding: 25px 38px 35px;
      background-color: #f5f1e7;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }

    .eyebrow {
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 2.5px;
      color: #6b7280;
      text-transform: uppercase;
    }

    .hero-title {
      margin: 12px 0 0;
      font-family: Arial, sans-serif;
      font-size: 34px;
      line-height: 1.05;
      font-weight: 900;
      color: #080e3f;
    }

    .hero-title span {
      display: block;
    }

    .class-tag {
      display: inline-block;
      margin-top: 18px;
      padding: 8px 12px;
      background-color: #080e3f;
      color: #ffffff;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .content {
      padding: 35px 38px;
      font-size: 14px;
      line-height: 1.75;
      color: #374151;
    }

    .content p {
      margin: 0 0 18px;
    }

    .highlight {
      padding: 18px 20px;
      margin: 25px 0;
      background-color: #f5f1e7;
      border-left: 4px solid #080e3f;
      color: #111827;
    }

    .highlight strong {
      color: #080e3f;
    }

    .cta-wrapper {
      margin: 25px 0 30px;
      text-align: center;
    }

    .cta-button {
      display: inline-block;
      padding: 15px 24px;
      background-color: #080e3f;
      color: #ffffff !important;
      text-decoration: none;
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      border: 1px solid #080e3f;
    }

    .cta-button:hover {
      background-color: #11184d !important;
    }

    .cta-button span {
      margin-left: 10px;
      font-size: 16px;
    }

    .section-title {
      margin: 30px 0 12px;
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: #080e3f;
    }

    .rules {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .rules li {
      padding: 10px 0 10px 22px;
      border-bottom: 1px solid #e5e7eb;
      position: relative;
      font-size: 13px;
      line-height: 1.6;
    }

    .rules li::before {
      content: "—";
      position: absolute;
      left: 0;
      color: #080e3f;
      font-weight: bold;
    }

    .deadline {
      margin: 28px 0;
      padding: 20px;
      background-color: #080e3f;
      color: #ffffff;
    }

    .deadline-label {
      display: block;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      opacity: 0.65;
      margin-bottom: 6px;
    }

    .deadline-date {
      font-family: Arial, sans-serif;
      font-size: 25px;
      font-weight: 800;
    }

    .process {
      margin-top: 10px;
      padding: 18px 20px;
      background-color: #f8f8f8;
      border: 1px solid #e5e7eb;
    }

    .process-step {
      padding: 7px 0;
      font-size: 13px;
    }

    .step-number {
      display: inline-block;
      width: 25px;
      font-weight: bold;
      color: #080e3f;
    }

    .attachment-note {
      margin-top: 25px;
      padding: 15px;
      background-color: #f3f4f6;
      font-size: 12px;
      line-height: 1.6;
      color: #4b5563;
    }

    .footer {
      padding: 25px 38px;
      border-top: 1px dashed #d1d5db;
      font-size: 11px;
      line-height: 1.7;
      color: #6b7280;
    }

    .footer strong {
      color: #374151;
    }

    .footer a {
      color: #080e3f;
      text-decoration: none;
    }

    @media only screen and (max-width: 600px) {

      .header,
      .hero,
      .content,
      .footer {
        padding-left: 22px;
        padding-right: 22px;
      }

      .hero-title {
        font-size: 29px;
      }

      .deadline-date {
        font-size: 22px;
      }

      .cta-button {
        display: block;
        width: auto;
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
          <td class="header">

            <div class="brand">
              THEBYTEBOARD
            </div>

            <div class="department">
              Department of Computer Science · CHRIST (Deemed to be University)
            </div>

          </td>
        </tr>

        <tr>
          <td class="hero">

            <div class="eyebrow">
              CALL FOR SUBMISSIONS
            </div>

            <div class="hero-title">
              Your ideas
              <span>deserve to be read.</span>
            </div>

            <div class="class-tag">
              ${className}
            </div>

          </td>
        </tr>

        <tr>
          <td class="content">

            <p>
              Hello,
            </p>

            <p>
              TheByteBoard is inviting students from
              <strong>${className}</strong>
              to submit original articles for consideration and publication
              on the official Department of Computer Science blog.
            </p>

            <p>
              If you have something interesting to say, something you've
              learned, something you've built, or an idea worth sharing —
              this is your opportunity to put it into words.
            </p>

            <div class="cta-wrapper">

              <a
                href="https://www.thebyteboard-csbyc.blog/write-for-us"
                class="cta-button"
                target="_blank"
              >
                WRITE FOR US
                <span>→</span>
              </a>

            </div>

            <div class="deadline">

              <span class="deadline-label">
                Submission Deadline
              </span>

              <div class="deadline-date">
                ${endDate}
              </div>

            </div>

            <div class="section-title">
              Submission Guidelines
            </div>

            <ul class="rules">

              <li>
                Articles should be between
                <strong>800–3000 words</strong>.
              </li>

              <li>
                Submit
                <strong>original, unpublished content only</strong>.
              </li>

              <li>
                Technical articles must include relevant
                <strong>code or practical examples</strong>.
              </li>

              <li>
                Images must be
                <strong>copyright-free or your own</strong>.
              </li>

              <li>
                Images must be hosted safely using a suitable hosting
                service and provided through a direct URL.
                Do not embed images as Base64 data.
              </li>

              <li>
                Links promoting illegal websites or
                <strong>malicious content are strictly prohibited</strong>.
              </li>

              <li>
                Include a
                <strong>compelling headline and meta description</strong>.
              </li>

              <li>
                Follow the
                <strong>TheByteBoard style guide</strong>
                for consistent formatting.
              </li>

            </ul>

            <div class="section-title">
              What Happens After You Submit?
            </div>

            <div class="process">

              <div class="process-step">
                <span class="step-number">01</span>
                Submit your article through the submission form.
              </div>

              <div class="process-step">
                <span class="step-number">02</span>
                Editorial review takes approximately
                <strong>3–5 business days</strong>.
              </div>

              <div class="process-step">
                <span class="step-number">03</span>
                Receive a feedback or approval email.
              </div>

              <div class="process-step">
                <span class="step-number">04</span>
                Make revisions if requested by the editorial team.
              </div>

              <div class="process-step">
                <span class="step-number">05</span>
                Approved articles are published on TheByteBoard.
              </div>

            </div>

            <div class="section-title">
              Before You Submit
            </div>

            <p>
              Your information under <strong>Author Information</strong>
              is automatically taken from your profile. If you need to
              update your details, please do so through your
              <strong>Account Settings</strong> before submitting.
            </p>

            <div class="attachment-note">

              <strong>Attached to this email:</strong><br>

              Please refer to the attached poster for the submission
              announcement and additional visual information.

            </div>

            <p style="margin-top:28px;">

              We look forward to reading your ideas and seeing your work
              become part of TheByteBoard.

            </p>

          </td>
        </tr>

        <tr>
          <td class="footer">

            <strong>THEBYTEBOARD</strong><br>

            The official editorial board of the Department of Computer Science,
            CHRIST (Deemed to be University).

            <br><br>

            <a href="https://www.thebyteboard-csbyc.blog/">
              www.thebyteboard-csbyc.blog
            </a>

            <br>

            <a href="mailto:csbyc.connect@christuniversity.in">
              csbyc.connect@christuniversity.in
            </a>

            <br><br>

            This is an official communication from TheByteBoard.
            Please do not reply directly to this email.

          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

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

    // Optional poster/file attachment sent from the frontend as base64
    // attachment: { filename: string, contentBase64: string (may include data: prefix), contentType?: string }
    if (attachment?.contentBase64 && attachment?.filename) {
      const rawBase64 = attachment.contentBase64.includes(',')
        ? attachment.contentBase64.split(',').pop()
        : attachment.contentBase64;

      mailOptions.attachments = [
        {
          filename: attachment.filename,
          content: Buffer.from(rawBase64, 'base64'),
          contentType: attachment.contentType || undefined,
        },
      ];
    }

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