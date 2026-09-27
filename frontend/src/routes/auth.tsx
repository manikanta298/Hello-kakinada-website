import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const path = "/auth";
const routeMeta = {
  head: () => ({
    meta: [
      { title: "Sign in — HelloKakinada.in" },
      { name: "description", content: "Sign in to your HelloKakinada.in account." },
      { property: "og:title", content: "Sign in — HelloKakinada.in" },
      { property: "og:description", content: "Sign in to your HelloKakinada.in account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
};
export default routeMeta;


function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate("/admin", { replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate("/admin", { replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } } });
      if (error) toast.error(error.message); else setSent(true);
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">HelloKakinada.in — your city, in one place.</p>
        {sent ? (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm">Check <b>{email}</b> and click the confirmation link to finish signing up.</p>
        ) : (
          <>
            <Button variant="outline" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />}
              <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Sign in" : "Sign up"}</Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "in" ? "New here?" : "Already have an account?"}{" "}
              <button className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Create an account" : "Sign in"}</button>
            </p>
          </>
        )}
        <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">← Back to website</Link>
      </div>
    </div>
  );
}
