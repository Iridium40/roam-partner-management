# ROAM Partner Portal

A comprehensive business management and provider onboarding platform for service providers, business owners, and dispatchers.

## 🚀 Features

### Provider Onboarding
- **Phase 1**: Initial business registration and profile setup
- **Phase 2**: Advanced verification including document upload, Stripe Connect, and Plaid bank connections
- **Identity Verification**: Stripe Identity verification for compliance
- **Application Review**: Admin approval workflow

### Business Management
- **Dashboard**: Role-based dashboards for owners, dispatchers, and providers
- **Profile Management**: Complete business profile setup and management
- **Document Management**: Secure document upload and verification
- **Bank Integration**: Plaid-powered bank account connections
- **Payment Processing**: Stripe Connect integration for payments

### Communication
- **Real-time Messaging**: Twilio Conversations integration for provider-customer communication
- **Notifications**: Edge-based real-time notifications
- **Email Integration**: Automated email workflows

### Admin Tools
- **Application Review**: Approve/reject provider applications
- **User Management**: Debug and manage user-business relationships
- **Test Utilities**: Development tools for testing onboarding flows

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Radix UI, Tailwind CSS, Lucide Icons
- **Backend**: Vercel Edge Functions, Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe Connect
- **Banking**: Plaid
- **Messaging**: Twilio Conversations
- **Email**: Resend
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd roam-partner-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with the following variables:
   ```env
   # Supabase
   VITE_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   
   # Plaid
   PLAID_CLIENT_ID=your_plaid_client_id
   PLAID_SECRET=your_plaid_secret
   PLAID_ENV=sandbox
   
   # Twilio
   VITE_TWILIO_ACCOUNT_SID=your_twilio_account_sid
   VITE_TWILIO_AUTH_TOKEN=your_twilio_auth_token
   VITE_TWILIO_CONVERSATIONS_SERVICE_SID=your_conversations_service_sid
   
   # Email
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Database Setup**
   Run the consolidated migration in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of consolidated_migration.sql
   ```

5. **Development**
   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   ```

## 🏗 Project Structure

```
├── api/                    # Vercel API routes
│   ├── admin/             # Admin management endpoints
│   ├── auth/              # Authentication endpoints
│   ├── business/          # Business profile endpoints
│   ├── onboarding/        # Provider onboarding endpoints
│   ├── plaid/             # Plaid bank integration
│   ├── provider/          # Provider management
│   ├── stripe/            # Stripe Connect integration
│   └── twilio-conversations.ts
├── client/                # React frontend
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   └── utils/             # Utility functions
├── public/                # Static assets
├── server/                # Express server
├── supabase/              # Supabase configuration
└── consolidated_migration.sql
```

## 🔐 Role-Based Access

- **Owner**: Full business management, application approval
- **Dispatcher**: Booking management, provider coordination
- **Provider**: Service delivery, customer communication

## 🧪 Development Tools

The application includes development utilities accessible via browser console:

```javascript
// Generate Phase 2 onboarding token
window.testUtils.generatePhase2Token('business-id')

// Delete test users
window.testUtils.deleteTestUser('email@example.com')

// List test users
window.testUtils.listTestUsers()

// Debug user-business relationships
window.testUtils.debugUserBusiness('email@example.com')
```

## 🚀 Deployment

This application is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 📄 License

Private - All rights reserved

## 🤝 Support

For support and questions, please contact the development team.
