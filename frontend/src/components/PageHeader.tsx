type Props = { title: string; subtitle?: string };

export function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}
