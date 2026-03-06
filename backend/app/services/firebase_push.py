"""
Firebase Cloud Messaging push notification service.

Sends push notifications to users via FCM when backend notifications are created.
Gracefully degrades: if Firebase is not configured, notifications are still saved
to DB but no push is sent.
"""

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.device_token import DeviceToken
from app.models.notification import Notification, NotificationType
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# Global Firebase app instance (initialized once)
_firebase_app = None


def _init_firebase() -> bool:
    """Initialize Firebase Admin SDK. Returns True if initialized successfully."""
    global _firebase_app
    if _firebase_app is not None:
        return True

    cred_path = settings.firebase_credentials_path
    if not cred_path:
        logger.info("Firebase credentials not configured — push notifications disabled")
        return False

    try:
        cred = credentials.Certificate(cred_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        return False


# Try to initialize on module import
_firebase_ready = _init_firebase()


async def send_push(
    db: AsyncSession,
    user_id,
    title: str,
    body: str,
    data: dict | None = None,
) -> int:
    """
    Send a push notification to all devices registered by a user.

    Returns the number of successfully sent messages.
    Silently removes invalid/unregistered tokens.
    """
    if not _firebase_ready:
        return 0

    # Fetch device tokens for this user
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.user_id == user_id)
    )
    tokens = result.scalars().all()

    if not tokens:
        return 0

    sent_count = 0
    invalid_token_ids = []

    for device_token in tokens:
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data={k: str(v) for k, v in data.items()} if data else None,
                token=device_token.token,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        channel_id="kashpay_channel",
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            badge=1,
                            sound="default",
                        ),
                    ),
                ),
            )
            messaging.send(message)
            sent_count += 1
        except messaging.UnregisteredError:
            logger.info(f"Removing unregistered FCM token for user {user_id}")
            invalid_token_ids.append(device_token.id)
        except messaging.SenderIdMismatchError:
            logger.warning(f"Sender ID mismatch for token, removing: user {user_id}")
            invalid_token_ids.append(device_token.id)
        except Exception as e:
            logger.warning(f"FCM send failed for user {user_id}: {e}")

    # Clean up invalid tokens
    if invalid_token_ids:
        await db.execute(
            delete(DeviceToken).where(DeviceToken.id.in_(invalid_token_ids))
        )
        await db.flush()

    if sent_count > 0:
        logger.info(f"Sent {sent_count} push notification(s) to user {user_id}: {title}")

    return sent_count


async def create_and_push_notification(
    db: AsyncSession,
    user_id,
    title: str,
    message: str,
    notification_type: NotificationType,
    data: dict | None = None,
) -> Notification:
    """
    Create a Notification in DB and send a push notification via FCM.

    This is the unified helper that should be called everywhere instead of
    manually creating Notification() + db.add().
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
    )
    db.add(notification)
    await db.flush()

    # Send push (fire-and-forget style — don't fail the request on push error)
    try:
        await send_push(
            db=db,
            user_id=user_id,
            title=title,
            body=message,
            data={
                "type": notification_type.value,
                "notification_id": str(notification.id),
                **(data or {}),
            },
        )
    except Exception as e:
        logger.warning(f"Push notification failed (DB notification still saved): {e}")

    return notification
