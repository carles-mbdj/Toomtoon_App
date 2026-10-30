"""Transactional email sending via plain SMTP - no vendor SDK, works
with Gmail, Brevo, SendGrid's SMTP relay, or any other provider the
user points SMTP_HOST at.

Optional: unset in dev/CI, where sending is a no-op (logged, not
actually sent) rather than crashing the caller. Account/subscription
activation must never fail just because the email provider is down or
not configured yet.
"""
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import config


def is_configured() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASSWORD and config.SMTP_FROM_EMAIL)


def send_email(to_email: str, subject: str, body_text: str) -> None:
    if not is_configured():
        config.logger.info(f"[email skipped - SMTP not configured] to={to_email} subject={subject!r}")
        return

    message = MIMEMultipart()
    message["From"] = config.SMTP_FROM_EMAIL
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body_text, "plain", "utf-8"))

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
            server.starttls()
            server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            server.sendmail(config.SMTP_FROM_EMAIL, to_email, message.as_string())
    except Exception as e:
        config.logger.error(f"Failed to send email to {to_email}: {e}")


async def send_email_async(to_email: str, subject: str, body_text: str) -> None:
    """smtplib is blocking - run it off the event loop so a slow/hanging
    SMTP connection doesn't stall every other request."""
    await asyncio.to_thread(send_email, to_email, subject, body_text)
