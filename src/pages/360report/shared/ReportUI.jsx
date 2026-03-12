import React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ComposedChart
} from "recharts";

export const VALTRA_RED = "#C8102E";
export const statusColor = (s) => ({ good: "#16a34a", warning: "#f59e0b", critical: "#dc2626", passive: "#f59e0b", neutral: "#6b7280" }[s] || "#6b7280");

export const KpiCard = ({ label, value, sub, status, highlight }) => (
  <div style={{
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12, padding: "14px 18px", minWidth: 130
  }}>
    <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", letterSpacing: "0.05em", marginBottom: 4 }}>{label.toUpperCase()}</div>
    <div style={{
      fontSize: 22, fontWeight: 700, color: status ? statusColor(status) : highlight ? "#f59e0b" : "#f9fafb",
      fontFamily: "'DM Mono', monospace", lineHeight: 1
    }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{sub}</div>}
  </div>
);

export const SectionTitle = ({ icon, title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f9fafb", fontFamily: "'DM Serif Display', serif" }}>{title}</h2>
  </div>
);

export const Badge = ({ text, color }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, fontFamily: "monospace"
  }}>{text}</span>
);

export const ChartCard = ({ title, children, span = 1 }) => (
  <div style={{
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12, padding: 20, gridColumn: span === 2 ? "span 2" : "span 1"
  }}>
    {title && <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", marginBottom: 14, letterSpacing: "0.04em" }}>{title.toUpperCase()}</div>}
    {children}
  </div>
);

// ─── CUSTOMER 360 SECTIONS ────────────────────────────────────────────────────
export function C360Overview({ section }) {
  const totalDays = 64;
  const bars = section.deliveryChart?.length ? section.deliveryChart.map(d => ({ name: d.stage.replace(/\n/g, " "), start: d.start, len: d.duration, color: "#3b82f6" })) : [
    { name: "Order Confirmed", start: 0, len: 2, color: "#3b82f6" },
    { name: "Assembly", start: 2, len: 36, color: "#16a34a" },
    { name: "PDI & Delivery", start: 38, len: 26, color: "#f59e0b" }
  ];
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="Machine Specifications">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {(section.specs || []).map(([k, v], i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px 0", color: "#9ca3af", width: "45%" }}>{k}</td>
                  <td style={{ padding: "8px 0", color: "#f9fafb", fontWeight: 500 }}>
                    {String(v).includes("✓") ? <span style={{ color: "#16a34a" }}>{v}</span> : v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
        <ChartCard title="Order-to-Delivery Timeline">
          <div style={{ padding: "10px 0" }}>
            {bars.map((b, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{b.name}</div>
                <div style={{ position: "relative", height: 28, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                  <div style={{
                    position: "absolute", left: `${(b.start / totalDays) * 100}%`, width: `${(b.len / totalDays) * 100}%`,
                    height: "100%", background: b.color, borderRadius: 4, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff"
                  }}>{b.len}d</div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export function C360NPS({ section }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="NPS Score Over Time">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={section.npsData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <ReferenceLine y={9} stroke="#16a34a" strokeDasharray="4 4" />
              <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="4 4" />
              <Line dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Dealer vs Machine Satisfaction">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={section.satisfactionData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="survey" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Bar dataKey="Dealer" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Machine" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      {(section.comments || []).map((c, i) => (
        <div key={i} style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Survey — {c.date}</span>
            <Badge text={c.category} color="#f59e0b" />
            <Badge text={`Score: ${c.score}/10`} color="#3b82f6" />
            <span style={{ fontSize: 11, color: "#6b7280" }}>via {c.channel}</span>
          </div>
          <p style={{ margin: "0 0 8px", color: "#d1d5db", fontStyle: "italic", fontSize: 14 }}>"{c.comment}"</p>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#9ca3af" }}>
            <span>Dealer: <strong style={{ color: "#f9fafb" }}>{c.dealer}/10</strong></span>
            <span>Machine: <strong style={{ color: "#f9fafb" }}>{c.machine}/10</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function C360DTC({ section }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="DTC Events by System">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={section.systemData || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="system" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} width={80} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(section.systemData || []).map((d, i) => <Cell key={i} fill={["#8b5cf6", "#3b82f6", "#ef4444"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Open Fault Codes — Action Required">
          <div style={{ marginTop: 8 }}>
            {(section.openFaults || []).map((f, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "90px auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < (section.openFaults?.length || 0) - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{f.date}</span>
                <Badge text={f.code} color={f.severity === "Critical" ? "#dc2626" : "#f59e0b"} />
                <span style={{ fontSize: 13, color: "#d1d5db" }}>{f.desc}</span>
                <Badge text={f.severity} color={f.severity === "Critical" ? "#dc2626" : "#f59e0b"} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export function C360Service({ section }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Service Costs & Cumulative Spend">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={section.serviceCosts || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="event" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cost €" />
              <Line dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 5 }} name="Cumulative €" />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Services On Schedule">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={section.scheduleData || []} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                <Cell fill="#16a34a" /><Cell fill="#ef4444" />
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Service Log">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
              {["Date", "Service Type", "Hours", "On Schedule", "Total Cost"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#9ca3af", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(section.log || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{r.date}</td>
                <td style={{ padding: "10px 12px", color: "#f9fafb" }}>{r.type}</td>
                <td style={{ padding: "10px 12px", color: "#d1d5db" }}>{r.hours}</td>
                <td style={{ padding: "10px 12px" }}><Badge text="✓ Yes" color="#16a34a" /></td>
                <td style={{ padding: "10px 12px", color: "#f9fafb", fontWeight: 600 }}>{r.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

export function C360Scorecard({ section }) {
  const scoreColor = (s) => s >= 8 ? "#16a34a" : s >= 6 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: 20, background: "linear-gradient(135deg, rgba(22,163,74,0.12), rgba(59,130,246,0.08))", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 14 }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#16a34a", fontFamily: "monospace", lineHeight: 1 }}>{section.overall}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Overall Score / 10</div>
        </div>
        <div>
          <Badge text={`● ${section.status}`} color="#16a34a" />
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>Machine and customer relationship in good standing</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Health Dimensions">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={section.dimensions || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dim" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <ReferenceLine y={8} stroke="#16a34a" strokeDasharray="4 4" />
              <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="4 4" />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {(section.dimensions || []).map((d, i) => <Cell key={i} fill={scoreColor(d.score)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Dimension Breakdown">
          <div>
            {(section.dimensions || []).map((d, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 60px 1fr", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < (section.dimensions?.length || 0) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <span style={{ fontSize: 12, color: "#d1d5db" }}>{(d.dim || "").replace(/\n/g, " ")}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor(d.score), fontFamily: "monospace" }}>{d.score}/10</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{d.assessment}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
      <ChartCard title="Recommended Actions">
        {(section.actions || []).map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < (section.actions?.length || 0) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <Badge text={a.priority} color={a.color} />
            <span style={{ fontSize: 13, color: "#d1d5db" }}>{a.text}</span>
          </div>
        ))}
      </ChartCard>
    </div>
  );
}

// ─── MACHINE (FLEET) 360 SECTIONS ──────────────────────────────────────────────
export function F360Summary({ section }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <ChartCard title="Fleet Risk Distribution">
        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "10px 0" }}>
          {(section.riskData || []).map(r => (
            <div key={r.level} style={{ flex: 1, background: r.color + "18", border: `2px solid ${r.color}44`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: r.color, fontFamily: "monospace" }}>{r.count}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{r.level} Risk</div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

export function F360Composition({ section }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <ChartCard title="Fleet by Series">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={section.seriesData || []} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percentage }) => `${name} ${percentage}%`} labelLine={false}>
              {(section.seriesData || []).map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v} machines`} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Fleet by Country">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={section.countryData || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis dataKey="country" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Fleet by Transmission">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={section.txData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="type" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Bar dataKey="count" fill="#6b7280" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export function F360NPS({ section }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16 }}>
        <ChartCard title="NPS Category Split">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={section.categoryData || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                {(section.categoryData || []).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg NPS by Series">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={section.seriesNPS || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="series" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Bar dataKey="nps" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#f9fafb", fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Fleet NPS Trend (Quarterly)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={section.trendData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="q" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={2} />
              <YAxis domain={[4, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <ReferenceLine y={8} stroke="#16a34a" strokeDasharray="4 4" />
              <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="4 4" />
              <Line dataKey="nps" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export function F360DTC({ section }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <ChartCard title="DTC Severity Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={section.severityData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="severity" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(section.severityData || []).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top DTC Codes Fleet-wide">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={section.topCodes || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="code" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={60} />
              <Tooltip formatter={(v, n, p) => [v, p.payload.desc]} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#f9fafb", fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export function F360Service({ section }) {
  const ragColor = (days) => days > 500 ? "#ef4444" : days > 300 ? "#f97316" : days > 150 ? "#f59e0b" : "#16a34a";
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <ChartCard title="Days Since Last Service (per machine) — RAG Status">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={section.machineService || []} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis dataKey="vin" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={130} />
            <ReferenceLine x={150} stroke="#f59e0b" strokeDasharray="4 4" />
            <ReferenceLine x={300} stroke="#f97316" strokeDasharray="4 4" />
            <ReferenceLine x={500} stroke="#ef4444" strokeDasharray="4 4" />
            <Bar dataKey="days" radius={[0, 4, 4, 0]}>
              {(section.machineService || []).map((d, i) => <Cell key={i} fill={d.rag || ragColor(d.days)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
          {[["On Track", "#16a34a", "<150d"], ["Monitor", "#f59e0b", "150-300d"], ["Overdue", "#f97316", "300-500d"], ["Critical", "#ef4444", ">500d"]].map(([l, c, t]) => (
            <span key={l}><span style={{ color: c }}>● </span>{l} ({t})</span>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

export function F360Warranty({ section }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {section.kpis?.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <ChartCard title="Warranty Cost by Failure Mode">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={section.failureModes || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="mode" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={80} />
              <Bar dataKey="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top Warranty Components">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={section.components || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis dataKey="comp" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={110} />
              <Bar dataKey="claims" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Claims Pipeline Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={section.statusData || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                {(section.statusData || []).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10, color: "#9ca3af" }} />
              <Tooltip formatter={(v, n, p) => [`${v} claims`, p.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
