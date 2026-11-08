import smtplib
import os
from email.message import EmailMessage
from config.runtime import load_environment

load_environment()

def send_reset_password_email(to_email: str, token: str):
    server = os.getenv("mail_server")
    port = int(os.getenv("mail_port", 2525))
    username = os.getenv("mail_username")
    password = os.getenv("mail_password")
    from_email = os.getenv("mail_from", "noreply@example.com")
    frontend_url = os.getenv("frontend_url", "http://localhost:3000")
    use_tls = os.getenv("mail_use_tls", "True").lower() == "true"
    
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    msg = EmailMessage()
    msg["Subject"] = "Masar AI - Password Reset Request"
    msg["From"] = from_email
    msg["To"] = to_email
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0C0E12; color: #FFFFFF; padding: 40px 20px; margin: 0; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #14171F; border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <div style="text-align: center; padding: 40px 20px 30px; background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(20, 23, 31, 0) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2); margin-bottom: 16px;">
              <span style="font-size: 24px;">🧭</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">Masar AI</h1>
            <p style="margin: 8px 0 0; font-size: 13px; color: #F59E0B; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Secure Access</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; font-size: 20px; color: #FFFFFF; font-weight: 600;">Reset Your Password</h2>
            <p style="margin: 0 0 24px; color: #A0AEC0; font-size: 15px; line-height: 1.6;">
              We received a request to reset the password for your Masar AI concierge account. Please click the button below to securely update your credentials.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="{reset_link}" style="display: inline-block; background-color: #F59E0B; color: #0C0E12; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; transition: background-color 0.2s;">Reset Password</a>
            </div>
            
            <p style="margin: 0 0 16px; color: #A0AEC0; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin: 0 0 30px; word-break: break-all;">
              <a href="{reset_link}" style="color: #F59E0B; font-size: 13px; text-decoration: none; border-bottom: 1px solid rgba(245, 158, 11, 0.3); padding-bottom: 2px;">{reset_link}</a>
            </p>
            
            <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px;">
              <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.5;">
                If you did not request this password reset, please safely ignore this email. Your account remains protected.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 24px; background-color: rgba(0, 0, 0, 0.2);">
            <p style="margin: 0; color: #718096; font-size: 12px;">
              &copy; 2026 Masar AI. All rights reserved.<br>
              United Arab Emirates 🇦🇪
            </p>
          </div>
          
        </div>
      </body>
    </html>
    """
    
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_content, subtype='html')
    
    with smtplib.SMTP(server, port) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(msg)
