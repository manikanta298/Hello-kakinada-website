import DOMPurify from "dompurify";

const HAS_TAGS = /<\/?[a-z][\s\S]*?>/i;
const ESCAPED_TAGS = /&lt;\/?[a-z][\s\S]*?&gt;/i;
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

const STYLES =
  "[&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground " +
  "[&_h4]:mt-3 [&_h4]:font-semibold [&_h4]:text-foreground [&_h5]:mt-3 [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:text-foreground [&_p]:mt-2 " +
  "[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold";

/** Renders imported text. Plain text keeps its line breaks; HTML (h2, h5, p, ul…) is sanitized and rendered as markup. */
export function RichText({ html, className = "" }: { html: string; className?: string }) {
  const value = ESCAPED_TAGS.test(html) && !HAS_TAGS.test(html) ? decode(html) : html;
  if (!HAS_TAGS.test(value)) return <div className={`whitespace-pre-line ${className}`}>{value}</div>;
  return <div className={`${STYLES} ${className}`} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />;
}
