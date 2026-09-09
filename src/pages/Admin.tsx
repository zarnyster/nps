import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { trpc } from "@/providers/trpc"
import { Plus, Trash2, RefreshCw } from "lucide-react"

const COLORS = [
  { value: "gray", label: "Серый" },
  { value: "blue", label: "Синий" },
  { value: "green", label: "Зелёный" },
  { value: "orange", label: "Оранжевый" },
  { value: "red", label: "Красный" },
]

const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
}

export default function AdminPage() {
  const { data: statuses, refetch: refetchStatuses } = trpc.statuses.list.useQuery()
  const createStatus = trpc.statuses.create.useMutation({ onSuccess: () => refetchStatuses() })
  const updateStatus = trpc.statuses.update.useMutation({ onSuccess: () => refetchStatuses() })
  const deleteStatus = trpc.statuses.delete.useMutation({ onSuccess: () => refetchStatuses() })

  const { data: rules, refetch: refetchRules } = trpc.categoryRules.list.useQuery()
  const createRule = trpc.categoryRules.create.useMutation({ onSuccess: () => refetchRules() })
  const deleteRule = trpc.categoryRules.delete.useMutation({ onSuccess: () => refetchRules() })

  const [newStatus, setNewStatus] = useState("")
  const [newColor, setNewColor] = useState("gray")
  const [pattern, setPattern] = useState("")
  const [category, setCategory] = useState("")
  const [reclassMsg, setReclassMsg] = useState<string | null>(null)

  const reclassify = trpc.categoryRules.reclassify.useMutation({
    onSuccess: (r) => setReclassMsg(`Проверено: ${r.checked}, переклассифицировано: ${r.changed}, осталось: ${r.remaining}`),
    onError: (e) => setReclassMsg(`Ошибка: ${e.message}`),
  })

  const addStatus = () => {
    if (!newStatus.trim()) return
    createStatus.mutate({ name: newStatus.trim(), color: newColor, sortOrder: (statuses?.length || 0) + 1 })
    setNewStatus("")
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Администрирование</h1>
        <p className="text-sm text-slate-500">Справочники и настройки</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Статусы отработки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(statuses || []).map((s) => (
            <div key={s.id} className="flex items-center gap-3 border rounded-lg px-4 py-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${COLOR_CLASSES[s.color] || COLOR_CLASSES.gray}`}>
                {s.name}
              </span>
              {!!s.isDefault && <span className="text-xs text-slate-400">(по умолчанию)</span>}
              <div className="ml-auto flex items-center gap-2">
                <Select value={s.color} onValueChange={(v) => updateStatus.mutate({ id: s.id, color: v })}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!s.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => {
                      if (confirm(`Удалить статус «${s.name}»? Отзывы перейдут в статус по умолчанию.`)) {
                        deleteStatus.mutate({ id: s.id })
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Новый статус..."
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStatus()}
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addStatus} disabled={createStatus.isPending || !newStatus.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Правила категорий</CardTitle>
          <p className="text-xs text-slate-500">
            Если в комментарии негатива встречается подстрока — проставляется категория. Срабатывает первое правило
            сверху вниз. Правила применяются автоматически при загрузке новых файлов; для уже загруженных отзывов
            нажмите «Пересчитать категории» — будут обновлены только отзывы без категории или в «Общее недовольство»
            (вручную проставленные категории не затираются).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => { setReclassMsg(null); reclassify.mutate() }}
              disabled={reclassify.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${reclassify.isPending ? "animate-spin" : ""}`} />
              Пересчитать категории
            </Button>
            {reclassMsg && <span className="text-xs text-slate-600">{reclassMsg}</span>}
          </div>
          <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Подстрока</th>
                  <th className="text-left px-4 py-2 font-medium">Категория</th>
                  <th className="px-4 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {(rules || []).map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-1.5 font-mono text-xs">{r.pattern}</td>
                    <td className="px-4 py-1.5">{r.category}</td>
                    <td className="px-4 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                        onClick={() => deleteRule.mutate({ id: r.id })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Input placeholder="Подстрока (напр. звонк)" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            <Input placeholder="Категория (напр. Звонки/спам)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Button
              onClick={() => {
                if (!pattern.trim() || !category.trim()) return
                createRule.mutate({ pattern, category })
                setPattern("")
                setCategory("")
              }}
              disabled={createRule.isPending || !pattern.trim() || !category.trim()}
            >
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
