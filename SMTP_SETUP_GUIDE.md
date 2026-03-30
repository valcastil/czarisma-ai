# SMTP Email Confirmation Setup Guide

## Overview
This guide explains how to configure email confirmations for new user signups using Hostinger SMTP in your Charisma Tracker app.

## Configuration Steps

### 1. Configure Environment Variables

Update your `.env` file with your Hostinger SMTP credentials:

```env
# SMTP Configuration (Hostinger)
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_ADMIN_EMAIL=your-email@yourdomain.com
```

**Where to find these credentials:**
1. Log in to your Hostinger control panel
2. Navigate to **Email Accounts**
3. Find your email account settings
4. Look for SMTP configuration:
   - **Host:** smtp.hostinger.com
   - **Port:** 587
   - **Username:** Your full email address
   - **Password:** Your email password

### 2. Supabase Configuration

The `supabase/config.toml` file has been configured with:

```toml
[auth.email]
enable_confirmations = true  # Email confirmation is now enabled

[auth.email.smtp]
enabled = true
host = "smtp.hostinger.com"
port = 587
user = "env(SMTP_USER)"
pass = "env(SMTP_PASS)"
admin_email = "env(SMTP_ADMIN_EMAIL)"
sender_name = "Charisma Tracker"
```

### 3. How It Works

When a new user creates an account:

1. **User signs up** with email and password
2. **Supabase sends confirmation email** via Hostinger SMTP
3. **User receives email** with a confirmation link
4. **User clicks link** to verify their email address
5. **User can now sign in** to the app

### 4. Testing the Setup

#### Local Development:

1. **Start Supabase locally:**
   ```bash
   cd CharismaTracker
   supabase start
   ```

2. **Run your app:**
   ```bash
   npm start
   ```

3. **Test signup flow:**
   - Open the app
   - Navigate to sign-up screen
   - Enter a real email address you can access
   - Create an account
   - Check your email inbox for the confirmation link
   - Click the confirmation link
   - Return to the app and sign in

#### Production (Supabase Dashboard):

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **gdgbuvgmzaqeajwxhldr**
3. Navigate to **Settings** → **Auth**
4. Scroll to **SMTP Settings**
5. Configure the same SMTP settings:
   - **Enable Custom SMTP:** Yes
   - **Host:** smtp.hostinger.com
   - **Port:** 587
   - **Username:** Your email
   - **Password:** Your SMTP password
   - **Sender email:** Your email
   - **Sender name:** Charisma Tracker
6. Save settings

### 5. Email Templates (Optional)

You can customize the confirmation email template by:

1. Creating a custom HTML template in `supabase/templates/`
2. Uncommenting and configuring in `config.toml`:

```toml
[auth.email.template.confirmation]
subject = "Confirm your Charisma Tracker account"
content_path = "./supabase/templates/confirmation.html"
```

### 6. Troubleshooting

**Email not received:**
- Check spam/junk folder
- Verify SMTP credentials are correct
- Check Hostinger email account is active
- Verify email sending limits haven't been reached

**SMTP authentication failed:**
- Double-check username (must be full email address)
- Verify password is correct
- Ensure SMTP is enabled in Hostinger

**Rate limiting:**
- The config limits emails to 2 per hour per user
- Adjust `auth.rate_limit.email_sent` if needed

**Local development:**
- When running locally, Supabase uses Inbucket for email testing
- Access at: http://localhost:54324
- Emails won't actually be sent, but you can view them in Inbucket

### 7. Security Best Practices

✅ **DO:**
- Use environment variables for credentials
- Never commit `.env` file to git
- Use a dedicated email account for app notifications
- Enable 2FA on your Hostinger account
- Regularly rotate SMTP passwords

❌ **DON'T:**
- Hardcode credentials in config files
- Share SMTP credentials
- Use personal email for production
- Commit sensitive data to version control

### 8. Production Deployment

Before deploying to production:

1. Update `.env` with production SMTP credentials
2. Configure Supabase production project with SMTP settings
3. Test email delivery in production environment
4. Monitor email delivery rates and failures
5. Set up email delivery monitoring/alerts

## Support

For issues with:
- **Hostinger SMTP:** Contact Hostinger support
- **Supabase Auth:** Check [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- **App-specific issues:** Check application logs

## Additional Resources

- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Hostinger Email Documentation](https://www.hostinger.com/tutorials/email)
- [Email Confirmation Best Practices](https://supabase.com/docs/guides/auth/auth-email)
