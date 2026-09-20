/**
 * SectionHeader - consistent operational section title.
 * Parent layout controls spacing via gap/margin (P0-2 fix: no hardcoded margin-bottom).
 */
export default function SectionHeader({ title, action, className = '' }) {
  return (
    <div className={`section-header ${className}`}>
      <h2 className="section-title">{title}</h2>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}
