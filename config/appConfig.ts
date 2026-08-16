/**
 * App Configuration
 * Note: Email verification is now REQUIRED by the backend.
 * This flag is kept for documentation purposes.
 */
export const APP_CONFIG = {
  /**
   * Email verification is ALWAYS required by the backend.
   * Users must verify their email before they can log in.
   * The backend sends a verification email automatically upon registration.
   */
  REQUIRE_EMAIL_VERIFICATION: true, // Backend enforces this - do not change
};

