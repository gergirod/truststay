import type { Metadata } from "next";
import CurationTool from "./CurationTool";

export const metadata: Metadata = {
  title: "Curation Tool | Trustay Admin",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: Props) {
  const sp = await searchParams;
  const secret = typeof sp.secret === "string" ? sp.secret : "";

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <p className="text-2xl mb-4">🔒</p>
          <p className="text-base font-semibold text-[#2E2A26] mb-2">
            Admin access required
          </p>
          <p className="text-sm text-[#5F5A54]">
            Add{" "}
            <code className="bg-stone-100 px-1 rounded text-xs">
              ?secret=YOUR_SECRET
            </code>{" "}
            to the URL.
          </p>
        </div>
      </div>
    );
  }

  return <CurationTool secret={secret} />;
}
