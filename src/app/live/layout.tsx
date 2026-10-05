// The game sits outside the rest of the app: no login, no bottom nav, and
// nothing links to it until Brandi is ready.
export const metadata = { title: "LabFest Live" };

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0F172A] text-white">{children}</div>;
}
