import Link from "next/link";
import { img, timeAgo } from "@/lib/api";
import type { Issue } from "@/types";
import { PriorityBadge, StatusBadge } from "./Badges";

const TH = "px-3 py-2.5 text-left font-mono text-[12px] font-normal text-mute first:pl-0";
const TD = "px-3 py-3 align-middle first:pl-0";

export default function IssueTable({ issues, highlight, compact = false, caption, hrefBase = "/admin/issues" }: {
  issues: Issue[]; highlight?: string | null; compact?: boolean; caption: string; hrefBase?: string;
}) {
  if (!issues.length) return <p className="py-8 text-[14px] text-body">No tickets match.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-hairline">
          <tr>
            <th scope="col" className={TH}>Ticket</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Location</th>
            <th scope="col" className={TH}>Priority</th>
            {!compact && <th scope="col" className={`${TH} hidden sm:table-cell`}>Status</th>}
            {!compact && <th scope="col" className={`${TH} hidden lg:table-cell`}>Team</th>}
            <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {issues.map((i) => (
            <tr key={i.id} className={`transition-colors hover:bg-inset ${highlight === i.id ? "shadow-[inset_2px_0_0_var(--accent)]" : ""}`}>
              <td className={`${TD} ${highlight === i.id ? "pl-3" : ""}`}>
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(i.image_url)} alt="" width={36} height={36} loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-[4px] object-cover" />
                  <div className="min-w-0">
                    <Link href={`${hrefBase}/${i.id}`} className="block max-w-[180px] truncate font-medium sm:max-w-[300px] hover:underline hover:underline-offset-4">
                      {i.title}
                    </Link>
                    <p className="font-mono text-[12px] text-mute" translate="no">{i.id} <span className="font-sans">{i.category}</span></p>
                    <p className="truncate text-[12px] text-mute md:hidden">{i.building}, {i.floor}</p>
                  </div>
                </div>
              </td>
              <td className={`${TD} hidden whitespace-nowrap text-body md:table-cell`}>
                {i.building}<span className="block text-[12px] text-mute">{i.floor}</span>
              </td>
              <td className={TD}>
                <PriorityBadge priority={i.priority} score={i.priority_score} />
                {i.support_count > 0 && <span className="num mt-1 block text-[12px] text-mute">+{i.support_count} reports</span>}
              </td>
              {!compact && <td className={`${TD} hidden sm:table-cell`}><StatusBadge status={i.status} /></td>}
              {!compact && <td className={`${TD} hidden whitespace-nowrap text-body lg:table-cell`}>{i.department}</td>}
              <td className={`${TD} num hidden whitespace-nowrap text-right font-mono text-[12px] text-mute sm:table-cell`}>{timeAgo(i.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
