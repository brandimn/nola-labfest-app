// The game sits outside the rest of the app: no login, no bottom nav, and
// nothing links to it until Brandi is ready.
export const metadata = { title: "LabFest Live" };

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-mb-20 min-h-screen bg-[#1B0A2B] bg-cover bg-center bg-fixed pb-0 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(27,10,43,0.86), rgba(27,10,43,0.93)), url('/live/bg.webp')",
      }}
    >
      {children}
    </div>
  );
}
