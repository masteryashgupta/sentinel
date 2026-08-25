import { google } from "googleapis";

export const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("WARNING: Google OAuth environment variables are not fully configured.");
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};
