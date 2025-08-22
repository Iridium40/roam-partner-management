import { Resend } from "resend";

// Initialize Resend with API key
const resend = new Resend("re_Dpiy6s8h_BbVinwM12HVgicrsr7o6uxAV");

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static fromEmail = "providersupport@roamyourbestlife.com";
  private static fromName = "ROAM Provider Support";
  private static logoUrl =
    "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800";
  private static brandColor = "#4F46E5"; // roam-blue
  private static supportEmail = "providersupport@roamyourbestlife.com";

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error("Resend error:", error);
        return false;
      }

      console.log("Email sent successfully:", data?.id);
      return true;
    } catch (error) {
      console.error("Email service error:", error);
      return false;
    }
  }

  private static getEmailTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ROAM - Your Best Life. Everywhere.</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: ${this.brandColor};
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
          .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="${this.logoUrl}" alt="ROAM - Your Best Life. Everywhere." />
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            <p>© 2024 ROAM. All rights reserved.</p>
            <p style="font-size: 12px; color: #9ca3af;">
              You received this email because you started the provider onboarding process with ROAM.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async sendWelcomeEmail(
    to: string,
    firstName: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="color: ${this.brandColor};">Welcome to ROAM, ${firstName}!</h1>
      <p>Thank you for taking the first step to become a ROAM provider. We're excited to have you join our community of wellness professionals.</p>
      
      <p>Your account has been successfully created. Here's what happens next:</p>
      
      <div class="highlight">
        <h3>Next Steps:</h3>
        <ol>
          <li><strong>Complete your business information</strong> - Tell us about your services and experience</li>
          <li><strong>Upload required documents</strong> - Professional licenses, insurance, and photos</li>
          <li><strong>Review and submit</strong> - Double-check everything before submission</li>
        </ol>
      </div>
      
      <p>Our team will review your application within 3-5 business days. Once approved, you'll receive an invitation to complete your financial setup and start offering services on ROAM.</p>
      
      <p>If you have any questions during the process, don't hesitate to reach out to our support team.</p>
      
      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "Welcome to ROAM - Let's get you started!",
      html: this.getEmailTemplate(content),
      text: `Welcome to ROAM, ${firstName}! Your account has been created successfully. Please complete your business information, upload required documents, and submit your application for review.`,
    });
  }

  static async sendApplicationSubmittedEmail(
    to: string,
    firstName: string,
    applicationId: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="color: ${this.brandColor};">Application Submitted Successfully!</h1>
      <p>Hi ${firstName},</p>
      
      <p>Great news! We've received your provider application and all required documents.</p>
      
      <div class="highlight">
        <h3>Application Details:</h3>
        <p><strong>Application ID:</strong> ${applicationId}</p>
        <p><strong>Status:</strong> Under Review</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <h3>What's Next?</h3>
      <ol>
        <li><strong>Background Check (24-48 hours)</strong> - We'll initiate your background check</li>
        <li><strong>Document Review (2-3 business days)</strong> - Our team will verify your credentials</li>
        <li><strong>Admin Review (3-5 business days)</strong> - Final review and approval</li>
      </ol>
      
      <p>Once approved, you'll receive a secure email with a link to complete Phase 2 of your setup, including:</p>
      <ul>
        <li>Identity verification with Stripe</li>
        <li>Bank account connection</li>
        <li>Payment setup</li>
      </ul>
      
      <p>We'll keep you updated throughout the review process. Thank you for your patience!</p>
      
      <p>Best regards,<br>The ROAM Onboarding Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "Application Received - Under Review",
      html: this.getEmailTemplate(content),
      text: `Hi ${firstName}, your ROAM provider application (ID: ${applicationId}) has been submitted successfully and is now under review. We'll contact you within 3-5 business days with updates.`,
    });
  }

  static async sendApplicationApprovedEmail(
    to: string,
    firstName: string,
    phase2Link: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="color: ${this.brandColor};">🎉 Congratulations! Your Application is Approved</h1>
      <p>Hi ${firstName},</p>
      
      <p>Excellent news! Your ROAM provider application has been approved. Welcome to the ROAM family!</p>
      
      <div class="highlight">
        <h3>You're Ready for Phase 2!</h3>
        <p>Complete your financial setup to start offering services and earning with ROAM.</p>
      </div>
      
      <h3>Phase 2 Setup Includes:</h3>
      <ul>
        <li><strong>Identity Verification</strong> - Secure verification with Stripe</li>
        <li><strong>Bank Account Connection</strong> - Connect your account for payments</li>
        <li><strong>Payment Setup</strong> - Configure your payment preferences</li>
      </ul>
      
      <p>This secure link is valid for 7 days:</p>
      <a href="${phase2Link}" class="button">Complete Financial Setup →</a>
      
      <p style="font-size: 14px; color: #6b7280;">
        <strong>Security Note:</strong> This link is unique to you and expires in 7 days. Don't share it with anyone.
      </p>
      
      <p>Once you complete Phase 2, you'll have full access to the ROAM platform and can start:</p>
      <ul>
        <li>Setting your service availability</li>
        <li>Managing your calendar</li>
        <li>Receiving and accepting bookings</li>
        <li>Getting paid for your services</li>
      </ul>
      
      <p>We're thrilled to have you as part of the ROAM community!</p>
      
      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "🎉 Welcome to ROAM - Complete Your Setup",
      html: this.getEmailTemplate(content),
      text: `Congratulations ${firstName}! Your ROAM provider application has been approved. Complete your financial setup using this secure link: ${phase2Link}`,
    });
  }

  static async sendApplicationRejectedEmail(
    to: string,
    firstName: string,
    reason: string,
    nextSteps: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="color: #dc2626;">Application Update Required</h1>
      <p>Hi ${firstName},</p>
      
      <p>Thank you for your interest in becoming a ROAM provider. After reviewing your application, we need some additional information before we can proceed.</p>
      
      <div class="highlight">
        <h3>What We Need:</h3>
        <p>${reason}</p>
      </div>
      
      <h3>Next Steps:</h3>
      <p>${nextSteps}</p>
      
      <p>Don't worry - this is a common part of the process, and we're here to help you through it. Many successful providers needed to make similar updates.</p>
      
      <p>Once you've addressed the items above, you can resubmit your application. If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      
      <p>We appreciate your patience and look forward to welcoming you to the ROAM community soon!</p>
      
      <p>Best regards,<br>The ROAM Onboarding Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "ROAM Application - Additional Information Needed",
      html: this.getEmailTemplate(content),
      text: `Hi ${firstName}, we need some additional information for your ROAM provider application. ${reason} ${nextSteps}`,
    });
  }

  static async sendOnboardingCompleteEmail(
    to: string,
    firstName: string,
    dashboardLink: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="color: ${this.brandColor};">🚀 You're All Set! Welcome to ROAM</h1>
      <p>Hi ${firstName},</p>
      
      <p>Congratulations! You've successfully completed the ROAM provider onboarding process. You're now ready to start offering your services and building your business with ROAM.</p>
      
      <div class="highlight">
        <h3>Your ROAM Journey Starts Now!</h3>
        <p>Access your provider dashboard to get started.</p>
      </div>
      
      <a href="${dashboardLink}" class="button">Access Your Dashboard →</a>
      
      <h3>What You Can Do Now:</h3>
      <ul>
        <li><strong>Set Your Availability</strong> - Configure your schedule and working hours</li>
        <li><strong>Manage Services</strong> - Update pricing and service descriptions</li>
        <li><strong>View Bookings</strong> - See incoming requests and manage your calendar</li>
        <li><strong>Track Earnings</strong> - Monitor your income and payment history</li>
        <li><strong>Update Profile</strong> - Keep your information current</li>
      </ul>
      
      <h3>Getting Your First Booking:</h3>
      <ol>
        <li>Complete your service listings with detailed descriptions</li>
        <li>Add high-quality photos to your profile</li>
        <li>Set competitive pricing for your area</li>
        <li>Ensure your availability is up to date</li>
      </ol>
      
      <p>Our support team is always here to help you succeed. Don't hesitate to reach out if you have any questions as you get started.</p>
      
      <p>Here's to your success with ROAM!</p>
      
      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "🚀 Welcome to ROAM - You're Ready to Go!",
      html: this.getEmailTemplate(content),
      text: `Congratulations ${firstName}! You've completed ROAM onboarding. Access your dashboard: ${dashboardLink}`,
    });
  }
}
