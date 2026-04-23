import { requireRole } from "@/lib/session";
import { VendorForm } from "@/components/vendor-form";
import Link from "next/link";

export default async function NewVendorPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/vendors" className="text-sm text-[#0F172A]">← Vendors</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">New Vendor</h1>
      <VendorForm />
    </main>
  );
}
