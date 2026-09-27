// NOTE (MERN migration): the original file was Lovable-Cloud-generated OAuth
// glue (@lovable.dev/cloud-auth-js), which only works inside Lovable's own
// hosting and has no MERN/self-hosted equivalent. Kept at the same import
// path so src/routes/auth.tsx's "Continue with Google" button still renders
// and behaves predictably — it now returns a clear error instead of
// crashing. To make Google sign-in work for real, wire up an OAuth provider
// (e.g. passport-google-oauth20) on the Express backend and replace this stub.
export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: { redirect_uri?: string; extraParams?: Record<string, string> }) => {
      return { error: new Error("Google sign-in isn't configured for this deployment yet. Use email and password.") };
    },
  },
};
