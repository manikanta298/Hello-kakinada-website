import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const path = "/reset-password";
const routeMeta = {
  head: () => ({ meta: [{ title: "Reset password — HelloKakinada.in" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
};
export default routeMeta;

function ResetPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordWithToken(token, password);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Choose a new password</h1>
        {!token ? (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm">This reset link is missing its token. <Link to="/forgot-password" className="font-semibold text-primary">Request a new one</Link>.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Input type="password" required minLength={8} placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input type="password" required minLength={8} placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Update password</Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">← Back to sign in</Link>
      </div>
    </div>
  );
}
