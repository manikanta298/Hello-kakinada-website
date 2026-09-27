import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Check, Minus } from "lucide-react";
import { Guard, PageHeader } from "@/components/admin/ui";
import { ROLE_LABELS, canAccess } from "@/lib/admin/sections";

export const path = "/_authenticated/admin/roles";
const routeMeta = {
  head: () => ({ meta: [{ title: "Roles & Permissions — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Roles,
};
export default routeMeta;


const AREAS: [string, string][] = [
  ["dashboard", "Dashboard"], ["videos", "Videos"], ["photos", "Photos"], ["categories", "Categories"], ["analytics", "Analytics"],
  ["jobs", "Jobs"], ["properties", "Rent / Buy"], ["businesses", "Businesses"], ["food", "Food"], ["services", "Services"], ["events", "Events"],
  ["users", "Users"], ["reviews", "Reviews"], ["reports", "Reports"], ["notifications", "Notifications"], ["admin-users", "Admin Users"], ["settings", "Settings"],
];

function Roles() {
  const roles = Object.keys(ROLE_LABELS);
  return (
    <Guard section="roles">
      <PageHeader title="Roles & Permissions" sub="What each staff role can manage. These rules are enforced by the database, not just hidden in the menu." />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="sticky left-0 bg-card px-4 py-3 font-medium">Section</th>{roles.map((r) => <th key={r} className="whitespace-nowrap px-3 py-3 text-center font-medium">{ROLE_LABELS[r]}</th>)}</tr></thead>
          <tbody>{AREAS.map(([k, label]) => (
            <tr key={k} className="border-b last:border-0"><td className="sticky left-0 bg-card px-4 py-2.5 font-medium">{label}</td>
              {roles.map((r) => <td key={r} className="px-3 py-2.5 text-center">{canAccess([r], k) ? <Check className="mx-auto h-4 w-4 text-success" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}</td>)}
            </tr>))}</tbody>
        </table>
      </div>
    </Guard>
  );
}
