import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const path = "/forgot-password";
const routeMeta = {
  head: () => ({ meta: [{ title: "Forgot password — HelloKakinada.in" }, { name: "robots", content: "noindex" }] }),
  component: ForgotPage,
};
export default routeMeta;

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) toast.error(error.message); else setSent(true);
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a link to reset it.</p>
        {sent ? (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm">If <b>{email}</b> has an account, a reset link is on its way. Check your inbox (and spam). The link is valid for 1 hour.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Send reset link</Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">← Back to sign in</Link>
      </div>
    </div>
  );
}
