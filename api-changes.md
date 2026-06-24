# Data Modelling AI — API Changes

Backend endpoints for the **dataset-scoped, prescriptive** AI tab in Data Modelling.
Platform-wide chat stays on `POST /api/genai_bot` (Vector AI assistant).

All endpoints require header `X-User-ID`.

Scope params (consistent with existing analytics APIs):

| Param | Type | Required | Notes |
|---|---|---|---|
| `registry_id` | integer | yes | Active dataset registry |
| `file_name` | string | yes | Dataset display / table name |
| `machine_id` / `twin_id` | string | no | Required for machine-scoped actions |
| `scope` | `"fleet"` \| `"machine"` | no | Default `"fleet"` |

---

## 1. `GET /api/analytics/ai/context`

Prefetch dataset-aware context when the AI tab opens (no GPT — fast).

**Query:** `registry_id`, `file_name`, `machine_id?`, `scope?`

**Response:**

```json
{
  "success": true,
  "dataset": {
    "registry_id": 108,
    "display_name": "machine_telemetry_q1",
    "file_name": "machine_telemetry_q1",
    "machine_id": "twin_abc__M-106",
    "scope": "machine"
  },
  "machines": [{ "twin_id": "...", "machine_serial": "M-106" }],
  "artifacts": {
    "kpis_generated": true,
    "kpis_count": 5,
    "last_forecast": { "column": "vibration_level", "frequency": "D", "period": 5 },
    "last_outlier": { "column": "engine_temp", "count": 12 },
    "last_prediction": { "target": "failure_risk", "result": "High", "at": "2026-06-23T10:00:00Z" }
  },
  "snapshot_summary": {
    "row_count": 42000,
    "date_range": ["2026-01-01", "2026-06-23"],
    "top_sensors": ["vibration_level", "engine_temp"]
  },
  "available_actions": [
    "executive_summary",
    "risk_analysis",
    "maintenance_recommendations",
    "performance_optimization",
    "ai_report"
  ]
}
```

**Backend notes:** Read parquet metadata + S3/output folders for cached KPI/ML artifacts. Optionally merge incidents from `POST /api/analytics/sync`.

---

## 2. `POST /api/analytics/ai/insights` (primary)

Run a prescriptive action for the selected dataset.

**Request:**

```json
{
  "registry_id": 108,
  "file_name": "machine_telemetry_q1",
  "machine_id": "twin_abc__M-106",
  "scope": "machine",
  "action": "risk_analysis",
  "context": {
    "kpis": [],
    "executed_kpis": [],
    "forecast": null,
    "outliers": null,
    "prediction": null,
    "prediction_insights": null
  }
}
```

- `context` is **optional**. If omitted, backend assembles from stored artifacts + parquet.
- Frontend may pass in-session results from KPI / Modelling tabs.

**`action` enum:**

| Value | Purpose |
|---|---|
| `executive_summary` | High-level brief for leadership |
| `risk_analysis` | Ranked risks with severity |
| `maintenance_recommendations` | PM actions, timelines, parts |
| `performance_optimization` | Efficiency / OEE improvement levers |
| `ai_report` | Full multi-section report |

**Response (all actions):**

```json
{
  "success": true,
  "action": "risk_analysis",
  "dataset": {
    "registry_id": 108,
    "display_name": "machine_telemetry_q1",
    "machine_id": "twin_abc__M-106",
    "scope": "machine"
  },
  "summary": "One-paragraph executive takeaway.",
  "ipr": {
    "inferences": ["..."],
    "problems": ["..."],
    "recommendations": ["..."]
  },
  "sections": [
    {
      "id": "ranked_risks",
      "title": "Ranked Risks",
      "items": [
        {
          "severity": "critical",
          "title": "Elevated vibration",
          "impact": "Unplanned downtime risk within 5 days",
          "evidence": "KPI + outlier analysis"
        }
      ]
    }
  ],
  "prescriptive_timeline": {
    "immediate": { "label": "0–5 days", "actions": ["Inspect bearing within 24h"] },
    "next_5_days": { "label": "5–10 days", "actions": ["Replace bearing assembly"] },
    "next_10_days": { "label": "10–30 days", "actions": ["Recalibrate predictive model"] },
    "next_30_days": { "label": "30+ days", "actions": ["Return to standard PM cadence"] }
  },
  "sources": ["kpi:OEE Trend", "forecast:vibration_level", "outlier:engine_temp"],
  "generated_at": "2026-06-23T10:00:00Z"
}
```

**`ai_report` extended fields:**

```json
{
  "report_meta": { "title": "Machine Intelligence Report — M-106", "version": "1.0" },
  "sections": [
    { "sectionId": "executive_summary", "title": "Executive Summary", "content": "..." },
    { "sectionId": "kpi_analysis", "title": "KPI Analysis", "items": [] },
    { "sectionId": "risk_register", "title": "Risk Register", "items": [] },
    { "sectionId": "recommended_actions", "title": "Recommended Actions", "items": [] }
  ]
}
```

**Implementation:** Reuse GPT patterns from `prediction_hints.get_prediction_insights`, KPI `chart.ipr`, `gen_plot_insights` IPR format. New service: `build_modelling_ai_context()` → `generate_prescriptive_insights(action, context)`.

---

## 3. `POST /api/analytics/ai/chat` (follow-up)

Scoped follow-up after an action, with optional session memory.

**Request:**

```json
{
  "registry_id": 108,
  "file_name": "machine_telemetry_q1",
  "machine_id": "twin_abc__M-106",
  "scope": "machine",
  "session_id": "uuid-or-null",
  "parent_action": "risk_analysis",
  "prompt": "Which machine should we prioritize first?"
}
```

**Response:** Same schema as `/insights` plus `session_id`.

Do **not** use `/api/genai_bot` — it loads all user files via `build_files_description(user_id)` and is platform-agnostic.

---

## 4. Extensions to existing endpoints

### `POST /api/analytics/ml/predict`

Add `prescriptive_timeline` to `insights`:

```json
{
  "insights": {
    "recommended_actions": ["..."],
    "prescriptive_timeline": {
      "immediate": "...",
      "next_5_days": "...",
      "next_10_days": "...",
      "next_30_days": "..."
    }
  }
}
```

### `POST /api/analytics/kpi/execute`

Ensure `chart.ipr` is always populated (already in prompt spec). AI tab consumes this.

### `POST /api/analytics/ml/outlier`

Add optional `ipr` block: `{ inferences, problems, recommendations }`.

### `POST /api/analytics/ml/arima`

Add optional `ipr` + trend interpretation string.

---

## 5. Unchanged endpoints

| Endpoint | Reason |
|---|---|
| `POST /api/genai_bot` | Platform-wide Vector AI |
| `POST /api/analytics/sync` | Reports / Vector AI snapshot |
| `POST /api/genai_report` | Legacy sustainability reports — use `/api/analytics/ai/insights?action=ai_report` for modelling |

---

## Frontend integration

Module: `src/lib/api/modellingAi.ts`

```ts
modellingAiApi.getContext(scope)
modellingAiApi.runAction(action, scope, context?)
modellingAiApi.chat(prompt, scope, options?)
```

Until backend ships, the frontend falls back to local prescriptive synthesis from shared Modelling session state (KPI / Modelling tab results) when endpoints return 404.
