export default function QuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header
        className="border-b px-6 py-4"
        style={{
          borderColor: "var(--cq-border)",
          background: "var(--cq-bg-card)",
        }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--cq-text-primary)" }}
        >
          Career Quest
        </h2>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
