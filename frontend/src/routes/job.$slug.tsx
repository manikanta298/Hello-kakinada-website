import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { RichText } from "@/components/rich-text";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { ArrowLeft, MapPin, Briefcase, IndianRupee, Clock, CalendarDays, Building2, Phone, MessageCircle, Mail, ExternalLink, GraduationCap } from "lucide-react";
import { Demo, ReportLink, JobCard, Grid } from "@/components/site";
import { JobImage } from "@/components/job-image";
import { getJob, getJobs } from "@/lib/listings.functions";
import { seo } from "@/lib/seo";

export const path = "/job/$slug";
const routeMeta = {
  loader: async ({ params }) => {
    const [j, all] = await Promise.all([getJob({ data: { slug: params.slug } }), getJobs()]);
    if (!j) throw new Response("Not Found", { status: 404 });
    return { j, related: all.filter((x) => x.slug !== j.slug).slice(0, 4) };
  },
  head: ({ loaderData }) => { const j = loaderData?.j; return j ? seo(`${j.title} job in ${j.location}, Kakinada`, `${j.title}${j.company ? ` at ${j.company}` : ""}. ${j.salary}, ${j.experience}.`, `/job/${j.slug}`, "article") : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] }; },
  pendingComponent: Loading,
  errorComponent: () => <div className="p-10 text-center">Couldn't load this job. Please try again.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Job not found.</div>,
  component: D,
};
export default routeMeta;


const known = (v?: string) => (v && !/not specified/i.test(v) ? v : undefined);

function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8">
      <div className="h-5 w-28 rounded bg-secondary" />
      <div className="mt-6 h-48 rounded-2xl bg-secondary" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3"><div className="h-64 rounded-2xl bg-secondary lg:col-span-2" /><div className="h-64 rounded-2xl bg-secondary" /></div>
    </div>
  );
}

function D() {
  const { j, related } = useLoaderData() as any;
  const real = !!j.addedAt;
  const wa = j.whatsapp?.replace(/\D/g, "").slice(-10);
  const salary = known(j.salary), exp = known(j.experience);
  const posted = j.addedAt ? new Date(j.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined;
  const expired = j.lastDate && !isNaN(Date.parse(j.lastDate)) && Date.parse(j.lastDate) < Date.now();
  const sections: [string, string | undefined][] = [
    ["Job description", j.description], ["Responsibilities", j.responsibilities], ["Requirements", j.requirements],
    ["Qualifications", j.qualification], ["Skills", j.skills], ["Education", j.education], ["Benefits", j.benefits],
  ];
  const shown = sections.filter(([, v]) => v);
  const summary: [typeof MapPin, string, string | undefined][] = [
    [MapPin, "Location", `${j.location}, Kakinada`], [Briefcase, "Job type", j.type], [GraduationCap, "Experience", exp],
    [IndianRupee, "Salary", salary], [CalendarDays, "Posted", posted], [Clock, "Last date", j.lastDate],
  ];
  const btn = "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const Actions = () => real ? (
    <div className="space-y-2">
      {j.link && <a href={j.link} target="_blank" rel="noopener noreferrer" aria-label={`Apply for ${j.title}`} className={`${btn} bg-primary text-primary-foreground hover:opacity-90`}>Apply now <ExternalLink className="h-4 w-4" /></a>}
      {wa && <a href={`https://wa.me/91${wa}`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-success text-primary-foreground hover:opacity-90`}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
      {j.phone && <a href={`tel:${j.phone}`} className={`${btn} border bg-card hover:bg-secondary`}><Phone className="h-4 w-4" />Call</a>}
      {j.email && <a href={`mailto:${j.email}`} className={`${btn} border bg-card hover:bg-secondary`}><Mail className="h-4 w-4" />Email</a>}
      {!j.link && !wa && !j.phone && !j.email && <p className="text-sm text-muted-foreground">No contact details provided.</p>}
    </div>
  ) : <button disabled className={`${btn} bg-primary text-primary-foreground opacity-60`}>Apply (demo)</button>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to jobs</Link>

      <header className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <JobImage natural image={j.image} companyImage={j.companyImage} alt={`${j.company || j.title} image`} className="w-full shrink-0 rounded-xl sm:w-72" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!real && <Demo />}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${expired ? "bg-destructive/10 text-destructive" : "bg-success/15 text-success"}`}>{expired ? "Closed" : "Actively hiring"}</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{j.category}</span>
            </div>
            <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{j.title}</h1>
            {j.company && <p className="mt-1 flex items-center gap-1.5 font-medium text-muted-foreground"><Building2 className="h-4 w-4 shrink-0" />{j.company}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{j.location}</span>
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{j.type}</span>
              {salary && <span className="flex items-center gap-1 font-semibold text-foreground"><IndianRupee className="h-4 w-4" />{salary.replace(/^₹/, "")}</span>}
              {posted && <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />Posted {posted}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <main className="min-w-0 space-y-4 lg:col-span-2">
          {shown.length ? shown.map(([t, v]) => (
            <section key={t} className="rounded-2xl border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold">{t}</h2>
              <RichText html={v!} className="mt-2 break-words leading-relaxed text-muted-foreground" />
            </section>
          )) : <section className="rounded-2xl border bg-card p-5 sm:p-6"><h2 className="text-lg font-bold">Job description</h2><p className="mt-2 text-muted-foreground">Details will be provided by the employer.</p></section>}
          {exp && <section className="rounded-2xl border bg-card p-5 sm:p-6"><h2 className="text-lg font-bold">Experience</h2><p className="mt-2 text-muted-foreground">{exp}</p></section>}
        </main>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-sm)]"><Actions /></div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-bold">Job summary</h2>
            <dl className="mt-3 divide-y">
              {summary.filter(([, , v]) => v).map(([I, k, v]) => (
                <div key={k} className="flex items-start gap-3 py-2.5 text-sm">
                  <I className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 break-words font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ReportLink />
        </aside>
      </div>

      <h2 className="mb-4 mt-12 text-xl font-bold">Related jobs</h2>
      <Grid>{related.map((x) => <JobCard key={x.slug} j={x} />)}</Grid>
    </div>
  );
}
