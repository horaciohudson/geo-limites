CREATE TABLE IF NOT EXISTS tab_onboarding_notification_settings (
    onboarding_notification_settings_id SMALLINT PRIMARY KEY,
    responsible_name VARCHAR(150),
    responsible_email VARCHAR(255),
    alternate_email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    manual_approval_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_signup_created BOOLEAN NOT NULL DEFAULT FALSE,
    notify_on_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    notify_on_pending_approval BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tab_onboarding_notification_settings (
    onboarding_notification_settings_id
)
VALUES (
    1
)
ON CONFLICT (onboarding_notification_settings_id) DO NOTHING;
