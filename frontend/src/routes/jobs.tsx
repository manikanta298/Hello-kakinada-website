import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { Page, Grid, JobCard, Chips } from "@/components/site";
import { LOCATIONS } from "@/lib/data";
import { getJobs } from "@/lib/listings.functions";
import { seo } from "@/lib/seo";

export const path = "/jobs";
const routeMeta = {
  head: () => seo("Jobs in Kakinada — HelloKakinada.in", "Find the latest jobs and opportunities in Kakinada by category, experience and salary.", "/jobs"),
  loader: () => getJobs(),
  component: P,
};
export default routeMeta;

function P() {
  const JOBS = useLoaderData() as any;
  const [cat, setCat] = useState(""); const [loc, setLoc] = useState(""); const [type, setType] = useState("");
  const list = JOBS.filter((j) => (!cat || j.category === cat) && (!loc || j.location === loc) && (!type || j.type === type));
  return (
    <Page title="Jobs in Kakinada" sub="Openings from local employers.">
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={loc} onChange={(e) => setLoc(e.target.value)} className="rounded-xl border bg-card px-4 py-3"><option value="">All locations</option>{LOCATIONS.map((l) => <option key={l.slug}>{l.name}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border bg-card px-4 py-3"><option value="">Any job type</option>{([...new Set(JOBS.map((j) => j.type))] as string[]).map((t) => <option key={t}>{t}</option>)}</select>
        <Link to="/dashboard" className="ml-auto rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground">Post a Job</Link>
      </div>
      <Chips items={[...new Set(JOBS.map((j) => j.category))] as string[]} value={cat} onChange={setCat} />
      <Grid>{list.map((j) => <JobCard key={j.slug} j={j} />)}</Grid>
    </Page>
  );
}
