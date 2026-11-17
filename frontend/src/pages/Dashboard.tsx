import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, errorMessage } from '../api/client';
import type { Board, Dashboard as DashboardData } from '../api/types';
import { useResource } from '../api/useResource';
import { PageHeader } from '../components/PageHeader';
import { Timeline } from '../components/Timeline';
import { countRows, revenueRows, todayMonthOf } from '../lib/dashboardData';
import { formatDate, formatMoney } from '../lib/format';
import { STAGE_COLORS, OPEN_STAGES } from '../lib/stages';

export default function Dashboard() {
  const dashboard = useResource<DashboardData>('/api/dashboard');
  const board = useResource<Board>('/api/pipeline');
  const [error, setError] = useState<string | null>(null);

  const revenue = useMemo(
    () => (dashboard.data ? revenueRows(dashboard.data.monthly, todayMonthOf(dashboard.data.today)) : []),
    [dashboard.data],
  );
  const counts = useMemo(
    () => (dashboard.data ? countRows(dashboard.data.monthly, todayMonthOf(dashboard.data.today)) : []),
    [dashboard.data],
  );

  if (dashboard.error) return <p className="form-error" role="alert">{dashboard.error}</p>;
  if (!dashboard.data || !board.data) return <p className="empty">Loading…</p>;
  const data = dashboard.data;
  const stats = data.stats;
  const openStages = board.data.columns.filter((c) => OPEN_STAGES.includes(c.stage));
  const openTotal = openStages.reduce((sum, c) => sum + c.value_cents, 0);

  async function markDone(id: number) {
    setError(null);
    try {
      await api('PATCH', `/api/activities/${id}`, { done: true });
      dashboard.reload();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Sales at a glance, as of ${formatDate(data.today)}.`} />
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="kpis" aria-label="Headline figures">
        <Kpi label="Won this year" value={formatMoney(stats.won_year_cents)} hint={`${stats.won_year_count} deals`} />
        <Kpi label="Open pipeline" value={formatMoney(stats.open_cents)} hint={`${stats.open_count} open deals`} />
        <Kpi label="Expected revenue" value={formatMoney(stats.expected_cents)} hint="Value times chance of close" />
        <Kpi
          label="Late"
          value={`${stats.late_count} ${stats.late_count === 1 ? 'deal' : 'deals'}`}
          hint="Open past their close date"
          alert={stats.late_count > 0}
        />
      </section>

      <div className="chart-row">
        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">Revenue won by month</h2>
            <span className="muted small">Solid: won. Dashed: expected from open deals.</span>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef3f4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5b7480' }} interval={2} />
                <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#5b7480' }} width={56} />
                <Tooltip formatter={(v) => formatMoney(Number(v) * 100)} />
                <Line type="monotone" dataKey="won" name="Won" stroke="#04875f" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="expected" name="Expected" stroke="#118ab2" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">Deals won by month</h2>
            <span className="muted small">Light bars: expected closes.</span>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={counts} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef3f4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5b7480' }} interval={2} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5b7480' }} width={28} />
                <Tooltip />
                <Bar dataKey="count" name="Deals" radius={[3, 3, 0, 0]}>
                  {counts.map((row) => (
                    <Cell key={row.label} fill={row.future ? '#bfe3ef' : '#118ab2'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="three-row">
        <section className="panel">
          <h2 className="section-title">Open pipeline</h2>
          <div className="stack-bar" aria-hidden="true">
            {openStages.map((c) => (
              <div key={c.stage} style={{ width: `${openTotal ? (c.value_cents / openTotal) * 100 : 0}%`, background: STAGE_COLORS[c.stage] }} />
            ))}
          </div>
          <table className="mini-table">
            <tbody>
              {openStages.map((c) => (
                <tr key={c.stage}>
                  <td>
                    <i className="dot" style={{ background: STAGE_COLORS[c.stage] }} />
                    {c.stage}
                  </td>
                  <td className="num">{formatMoney(c.value_cents)}</td>
                  <td className="num muted">{formatMoney(c.expected_cents ?? 0)} exp.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2 className="section-title">Follow-ups</h2>
          {data.follow_ups.length === 0 ? (
            <p className="empty">No follow-ups due in the next 14 days.</p>
          ) : (
            <ul className="plain-list">
              {data.follow_ups.map((f) => (
                <li key={f.id} className="follow-up">
                  <div>
                    <div>{f.text}</div>
                    <div className="muted small">
                      {f.who} · {formatDate(f.due)}
                    </div>
                  </div>
                  <div className="follow-up-end">
                    <span className={`tag ${f.status === 'overdue' ? '' : 'soon'}`}>
                      {f.status === 'overdue' ? 'Overdue' : 'Upcoming'}
                    </span>
                    <button type="button" className="link-button" onClick={() => markDone(f.id)}>
                      Mark done
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="section-title">Recent activity</h2>
          <Timeline entries={data.recent} />
          <p className="muted small">
            <Link to="/pipeline">Open the pipeline</Link>
          </p>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, alert }: { label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div className={`kpi${alert ? ' alert' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="muted small">{hint}</div>
    </div>
  );
}
