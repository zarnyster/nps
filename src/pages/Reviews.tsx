import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MultiSelect } from "@/components/ui/multi-select"
import { trpc } from "@/providers/trpc"
import {
  MessageSquare, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Search, CheckCircle2, Pencil,
} from "lucide-react"

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]
const PAGE_SIZE = 50

const V = [
  { value: "detractor", label: "Негативы (0–6)" },
  { value: "neutral", label: "Нейтралы (7–8)" },
  { value: "promoter", label: "Позитивы (9–10)" },
]
const K = ["Звонки/спам","Поиск","Поддержка","Платформа","Контент","Цена","Обучение","Общее недовольство"]

export default function Reviews() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState<number | undefined>(
    searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : undefined
  )
  const [year, setYear] = useState<number | undefined>(
    searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined
  )
  const [month, setMonth] = useState<number | undefined>(
    searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined
  )
  const [statusId, setStatusId] = useState<number | undefined>(
    searchParams.get("statusId") ? parseInt(searchParams.get("statusId")!) : undefined
  )
  const [category, setCategory] = useState<string | undefined>(searchParams.get("category") || undefined)
  const [scoreTypeParam] = useState(searchParams.get("scoreType") || undefined)
  const [scoreTypesParam] = useState(searchParams.get("scoreTypes") || undefined)
  const [hasCommentParam] = useState(searchParams.get("hasComment") || undefined)
  const [hasEditorialParam] = useState(searchParams.get("hasEditorial") || undefined)

  const { data: projects } = trpc.projects.list.useQuery()
  const { data: statuses } = trpc.statuses.list.useQuery()
  const { data: apiCategories } = trpc.reviews.categories.useQuery()
  const { data: calendar } = trpc.reviews.calendar.useQuery({ projectId })

  const allMonths = useMemo(
    () => (calendar || []).map((c) => ({ value: `${c.year}-${c.month}`, label: `${MONTHS[c.month - 1]} ${c.year}` })),
    [calendar]
  )

  const [months, setMonths] = useState<string[]>([])
  useEffect(() => {
    if (year && month) {
      setMonths([`${year}-${month}`])
    } else if (allMonths.length > 0 && months.length === 0) {
      setMonths([allMonths[allMonths.length - 1].value])
    }
  }, [year, month, allMonths])

  const [scoreTypes, setScoreTypes] = useState<string[]>(
    scoreTypesParam ? scoreTypesParam.split(",").filter(Boolean) : scoreTypeParam ? [scoreTypeParam] : []
  )
  const [hasComment, setHasComment] = useState<boolean>(
    hasCommentParam ? hasCommentParam === "true" : true
  )
  const [hasEditorial, setHasEditorial] = useState<"all" | "true" | "false">(
    hasEditorialParam === "true" ? "true" : "all"
  )
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(0) }, [months, projectId, scoreTypes, statusId, category, hasComment, hasEditorial, debouncedSearch])

  const { data, isLoading } = trpc.reviews.list.useQuery({
    projectId,
    months: months.length > 0 ? months : undefined,
    scoreTypes: scoreTypes.length > 0 ? scoreTypes : undefined,
    statusId,
    category,
    hasComment: hasComment || undefined,
    hasEditorial: hasEditorial === "all" ? undefined : hasEditorial === "true",
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<any>(null)
  const [selStatus, setSelStatus] = useState<number | undefined>()
  const [selCategory, setSelCategory] = useState("")
  const [comment, setComment] = useState("")

  const utils = trpc.useUtils()
  const saveEditorial = trpc.reviews.saveEditorial.useMutation({
    onSuccess: () => { utils.reviews.list.invalidate(); setOpen(false) },
  })
  const setStatus = trpc.reviews.setStatus.useMutation({
    onSuccess: () => utils.reviews.list.invalidate(),
  })
  const setCategoryMut = trpc.reviews.setCategory.useMutation({
    onSuccess: () => utils.reviews.list.invalidate(),
  })

  const fe = (key: string) => {
    setPage(0)
    if (key === "all") {
      setScoreTypes([])
      setHasComment(true)
      setHasEditorial("all")
    } else if (key === "negatives") {
      setScoreTypes(["detractor", "neutral"])
      setHasComment(true)
      setHasEditorial("all")
    } else if (key === "todo") {
      setScoreTypes(["detractor", "neutral"])
      setHasComment(true)
      setHasEditorial("true")
    }
  }
  const Oe = useMemo(() => {
    if (scoreTypes.length === 0 && hasEditorial !== "true") return "all"
    if (scoreTypes.includes("detractor") && scoreTypes.includes("neutral") && !scoreTypes.includes("promoter")) {
      if (hasComment && hasEditorial === "true") return "todo"
      return "negatives"
    }
    return ""
  }, [scoreTypes, hasComment, hasEditorial])

  const openDialog = (r: any) => {
    setCurrent(r)
    setSelStatus(r.status?.id ?? undefined)
    setSelCategory(r.category || "")
    setComment(r.comments?.[0]?.commentText || "")
    setOpen(true)
  }
  const save = () => {
    if (!current) return
    const prev = (current.comments?.[0]?.commentText || "").trim()
    const next = comment.trim()
    if (next && next !== prev) saveEditorial.mutate({ reviewId: current.id, commentText: next })
    if (selStatus && selStatus !== current.status?.id) setStatus.mutate({ reviewId: current.id, statusId: selStatus })
    if (selCategory && selCategory !== current.category) setCategoryMut.mutate({ reviewId: current.id, category: selCategory })
    if (!next && selStatus === (current.status?.id ?? undefined) && selCategory === (current.category || "")) setOpen(false)
  }

  const allCategories = [...K, ...(apiCategories || []).filter((c) => !K.includes(c))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Отработка отзывов</h1>
          <p className="text-sm text-slate-500">{data ? `Найдено: ${data.total}` : "Загрузка..."}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={Oe === "all" ? "default" : "outline"} size="sm" onClick={() => fe("all")}>Все оценки</Button>
          <Button variant={Oe === "negatives" ? "default" : "outline"} size="sm" onClick={() => fe("negatives")}>Негативы</Button>
          <Button variant={Oe === "todo" ? "default" : "outline"} size="sm" onClick={() => fe("todo")}>Требуют отработки</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <MultiSelect
              options={allMonths}
              selected={months}
              onChange={setMonths}
              placeholder="Периоды"
              allLabel="Все периоды"
            />
            <Select value={projectId?.toString() || "all"} onValueChange={(v) => setProjectId(v === "all" ? undefined : parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Все системы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все системы</SelectItem>
                {(projects || []).map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MultiSelect
              options={V}
              selected={scoreTypes}
              onChange={setScoreTypes}
              placeholder="Тип оценки"
              allLabel="Все оценки"
            />
            <Select value={statusId?.toString() || "all"} onValueChange={(v) => setStatusId(v === "all" ? undefined : parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {(statuses || []).map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="hc" checked={hasComment} onCheckedChange={(v) => setHasComment(!!v)} />
              <label htmlFor="hc" className="text-sm cursor-pointer">С комментарием</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="he"
                checked={hasEditorial === "true"}
                onCheckedChange={(v) => setHasEditorial(v ? "true" : "all")}
              />
              <label htmlFor="he" className="text-sm cursor-pointer">Без разбора редакции</label>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Поиск по тексту комментария..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Период</TableHead>
                <TableHead className="w-48">Система</TableHead>
                <TableHead className="w-20">Оценка</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead className="w-44">Категория</TableHead>
                <TableHead className="w-36">Статус</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">Загрузка...</TableCell>
                </TableRow>
              )}
              {data && data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    По заданным фильтрам отзывов не найдено
                  </TableCell>
                </TableRow>
              )}
              {(data?.items || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                    {MONTHS[r.month - 1]?.slice(0, 3)} {r.year}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{r.project?.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className={`font-bold ${r.score <= 6 ? "text-red-600" : r.score <= 8 ? "text-amber-600" : "text-emerald-600"}`}>
                        {r.score}
                      </span>
                      {r.score <= 6 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      ) : r.score <= 8 ? (
                        <Minus className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-2xl">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                      {r.comment || <span className="text-slate-400">—</span>}
                    </div>
                    {(r.comments || []).filter((rc: any) => rc.commentText?.trim()).length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 cursor-help w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> есть разбор редакции
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap text-left">
                          {(r.comments || [])
                            .filter((rc: any) => rc.commentText?.trim())
                            .map((rc: any, i: number) => (
                              <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-slate-600" : ""}>
                                {rc.user?.name ? <span className="font-semibold">{rc.user.name}: </span> : null}
                                {rc.commentText}
                              </div>
                            ))}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.category ? (
                      <Badge variant="outline" className="text-xs">{r.category}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.status ? (
                      <Badge
                        variant="outline"
                        className={
                          r.status.color === "green" ? "bg-emerald-50 text-emerald-700" :
                          r.status.color === "blue" ? "bg-blue-50 text-blue-700" :
                          r.status.color === "red" ? "bg-red-50 text-red-700" :
                          r.status.color === "orange" ? "bg-orange-50 text-orange-700" :
                          "bg-slate-50 text-slate-600"
                        }
                      >
                        {r.status.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-slate-400">Новый</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(r)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-slate-500">
                Показано {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} из {data.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= data.total}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Отработка отзыва</DialogTitle>
          </DialogHeader>
          {current && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={current.score <= 6 ? "bg-red-100 text-red-700" : current.score <= 8 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                  {current.score}
                </Badge>
                <span className="font-medium">{current.project?.name}</span>
                <span className="text-sm text-slate-500">{MONTHS[current.month - 1]} {current.year}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                {current.comment || <span className="text-slate-400">Без комментария</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Категория</label>
                  <Select value={selCategory || "none"} onValueChange={(v) => setSelCategory(v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Не выбрана" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не выбрана</SelectItem>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Статус</label>
                  <Select
                    value={selStatus?.toString() || "none"}
                    onValueChange={(v) => setSelStatus(v === "none" ? undefined : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без статуса" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без статуса</SelectItem>
                      {(statuses || []).map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Разбор редакции (виден внутри команды)</label>
                <Textarea
                  rows={4}
                  placeholder="Например: клиенту перезвонили, проблема решена, разобрались с задержкой доступа..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                <Button
                  onClick={save}
                  disabled={saveEditorial.isPending || setStatus.isPending || setCategoryMut.isPending}
                >
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
