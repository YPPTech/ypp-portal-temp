type MentorshipGuideItem = {
  label: string;
  meaning: string;
  howToUse: string;
};

type MentorshipGuideCardProps = {
  title: string;
  intro?: string;
  items: readonly MentorshipGuideItem[];
};

export function MentorshipGuideCard({
  title,
  intro,
  items,
}: MentorshipGuideCardProps) {
  return (
    <section
      className="card"
      style={{
        marginBottom: 24,
        background: "linear-gradient(180deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))",
        border: "1px solid rgba(59, 130, 246, 0.18)",
      }}
    >
      <div className="section-title" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {intro && (
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 13 }}>
          {intro}
        </p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              padding: 14,
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.72)",
              border: "1px solid rgba(59, 130, 246, 0.12)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              {item.label}
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--muted)" }}>
              <strong style={{ color: "var(--foreground)" }}>What this means:</strong> {item.meaning}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              <strong style={{ color: "var(--foreground)" }}>How to use it:</strong> {item.howToUse}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
