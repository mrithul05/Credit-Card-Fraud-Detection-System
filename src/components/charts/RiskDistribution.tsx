import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type RiskDistributionProps = { genuine: number; fraud: number }

export function RiskDistribution({ genuine, fraud }: RiskDistributionProps) {
  const data = [{ name: 'No review signal', value: genuine, color: '#2d8a68' }, { name: 'Potential fraud', value: fraud, color: '#c96b39' }]
  return <div className="risk-chart" aria-label={`No review signal ${genuine}; Potential fraud ${fraud}`}>
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={3} strokeWidth={0}>
          {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(value) => Number(value).toLocaleString()} contentStyle={{ borderRadius: 8, borderColor: '#dce3e8', boxShadow: '0 6px 20px rgba(22, 39, 53, .08)' }} />
      </PieChart>
    </ResponsiveContainer>
    <div className="chart-legend">{data.map((entry) => <div key={entry.name}><span className="legend-dot" style={{ background: entry.color }} />{entry.name}<strong>{entry.value.toLocaleString()}</strong></div>)}</div>
  </div>
}
