export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="absolute inset-0 bg-[linear-gradient(to_right_bottom,rgba(14,165,233,0.06),transparent_50%,transparent),linear-gradient(to_left_top,rgba(14,165,233,0.04),transparent_40%)]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
