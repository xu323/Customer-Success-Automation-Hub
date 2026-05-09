/**
 * Demo persona shim. In production this comes from auth/MSAL.
 * Single source of truth so we don't sprinkle hardcoded emails through the
 * page components.
 */
export const CURRENT_USER = {
  email: "manager@partner.com",
  alt_email: "finance@partner.com",
  display_name: "Manager",
};
