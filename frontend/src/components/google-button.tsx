import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CLIENT_ID = (import.meta as any).env?.["VITE_GOOGLE_CLIENT_ID"] as string | undefined;
let scriptPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Official "Sign in with Google" button. Renders nothing if VITE_GOOGLE_CLIENT_ID is not set. */
export function GoogleButton() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google.accounts.id;
        g.initialize({
          client_id: CLIENT_ID,
          callback: async (resp: { credential: string }) => {
            const { error } = await supabase.auth.signInWithGoogleCredential(resp.credential);
            if (error) toast.error(error.message);
          },
        });
        g.renderButton(ref.current, { theme: "outline", size: "large", width: Math.min(ref.current.offsetWidth || 320, 400), text: "continue_with" });
      })
      .catch(() => toast.error("Could not load Google sign-in"));
    return () => { cancelled = true; };
  }, []);

  if (!CLIENT_ID) return null;
  return <div ref={ref} className="mt-6 flex w-full justify-center" />;
}
