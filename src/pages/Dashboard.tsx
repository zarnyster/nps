import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { trpc } from "@/providers/trpc"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, BarChart3, ThumbsDown, ThumbsUp, ClipboardList,
} from "lucide-react"

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]
const CATEGORY_COLORS = ["#ef4444","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#6366f1","#10b981","#64748b"]

function monthLabel(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`
}

export default function Dashboard() {
  const [projectId, setProjectId] = useState<number | undefined>()
  const [period, setPeriod] = useState("")
  const navigate = useNavigate()

  const { data: projects } = trpc.projects.list.useQuery()
  const { data: calendar } = trpc.reviews.calendar.useQuery({ projectId })

  useEffect(() => {
    if (calendar && calendar.length > 0 && !period) {
      const last = calendar[calendar.length - 1]
      setPeriod(`${last.year}-${last.month}`)
    }
  }, [calendar, period])

  const [year, month] = period ? period.split("-").map(Number) : [undefined, undefined]

  const { data: stats } = trpc.reviews.stats.useQuery(
    { projectId, year, month },
    { enabled: !!period }
  )
  const { data: processing } = trpc.reviews.processingStats.useQuery(
    { year, month },
    { enabled: !!period }
  )

  const chartData = useMemo(
    () => (calendar || []).map((c) => ({
      name: `${MONTHS[c.month - 1].slice(0, 3)} ${String(c.year).slice(2)}`,
      nps: c.nps,
      total: c.total,
    })),
    [calendar]
  )

  const openReviews = (params: Record<string, string> = {}) => {
    const [y, m] = period ? period.split("-") : ["", ""]
    const sp = new URLSearchParams({
      ...(y ? { year: y, month: m } : {}),
      hasComment: "false",
      ...params,
    })
    navigate(`/reviews?${sp.toString()}`)
  }

  if (!projects || !calendar) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    )
  }

  const npsColor = stats ? (stats.nps >= 50 ? "text-emerald-600" : stats.nps >= 0 ? "text-amber-600" : "text-red-600") : ""
  const npsBg = stats ? (stats.nps >= 50 ? "bg-emerald-50" : stats.nps >= 0 ? "bg-amber-50" : "bg-red-50") : ""

  const categories = (stats?.negativeCategoryDistribution || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c, i) => ({ name: c.category || "Без категории", count: c.count, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))

  const coverage = processing && processing.totals.withComment > 0
    ? Math.round((processing.totals.processed / processing.totals.withComment) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Дашборд NPS</h1>
          <p className="text-sm text-slate-500">{period ? monthLabel(year!, month!) : "Выберите период"}</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              {[...(calendar || [])].reverse().map((c) => (
                <SelectItem key={`${c.year}-${c.month}`} value={`${c.year}-${c.month}`}>
                  {monthLabel(c.year, c.month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={projectId?.toString() || "all"}
            onValueChange={(v) => { setProjectId(v === "all" ? undefined : parseInt(v)); setPeriod("") }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Все системы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все системы</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={npsBg}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              {stats && stats.nps >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              NPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${npsColor}`}>{stats?.nps ?? "—"}</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats ? (stats.nps >= 50 ? "Отлично" : stats.nps >= 0 ? "Нормально" : "Критично") : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openReviews(projectId ? { projectId: String(projectId) } : {})}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Всего оценок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-800">{stats?.totalReviews ?? "—"}</div>
            <p className="text-xs text-slate-500 mt-1">за выбранный период · нажмите, чтобы открыть</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openReviews({ scoreType: "detractor", ...(projectId ? { projectId: String(projectId) } : {}) })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-500" /> Негативы (0–6)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{stats?.detractors ?? "—"}</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats ? `${stats.negativesWithComment} с комментарием` : ""} · нажмите, чтобы открыть
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500" /> Позитивы (9–10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-600">{stats?.promoters ?? "—"}</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats && stats.totalReviews > 0 ? `${Math.round((stats.promoters / stats.totalReviews) * 100)}% от всех` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Динамика NPS по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="nps" name="NPS" stroke="#3b82f6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Категории негативов за период</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categories} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Отзывов"
                    fill="#ef4444"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) =>
                      openReviews({ scoreType: "detractor", category: data.name, ...(projectId ? { projectId: String(projectId) } : {}) })
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                Нет негативов за период
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">Нажмите на категорию, чтобы открыть её отзывы</p>
          </CardContent>
        </Card>
      </div>

      {processing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              Отработка негативов — {period ? monthLabel(year!, month!) : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <div className="text-2xl font-bold text-slate-800">{processing.totals.withComment}</div>
                <div className="text-xs text-slate-500">негативов с комментарием</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{processing.totals.processed}</div>
                <div className="text-xs text-slate-500">отработано редакцией</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{coverage}%</div>
                <div className="text-xs text-slate-500">покрытие разборами</div>
              </div>
              <div className="flex gap-2 flex-wrap ml-auto">
                {processing.byStatus.map((s) => (
                  <Badge key={s.statusId ?? "none"} variant="outline" className="text-xs">
                    {s.statusName}: {s.count}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Система</th>
                    <th className="text-right px-4 py-2 font-medium">Негативов</th>
                    <th className="text-right px-4 py-2 font-medium">С комментарием</th>
                    <th className="text-right px-4 py-2 font-medium">Отработано</th>
                    <th className="text-right px-4 py-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {processing.byProject.map((p) => (
                    <tr
                      key={p.projectId}
                      className="border-t hover:bg-blue-50 cursor-pointer"
                      onClick={() => openReviews({ scoreType: "detractor", projectId: String(p.projectId) })}
                      title="Нажмите, чтобы открыть негативы этой системы"
                    >
                      <td className="px-4 py-2 text-blue-700 underline-offset-2 hover:underline">{p.projectName}</td>
                      <td className="px-4 py-2 text-right">{p.negatives}</td>
                      <td className="px-4 py-2 text-right">{p.withComment}</td>
                      <td className="px-4 py-2 text-right text-emerald-700 font-medium">{p.processed}</td>
                      <td className="px-4 py-2 text-right">
                        {p.withComment > 0 ? Math.round((p.processed / p.withComment) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
