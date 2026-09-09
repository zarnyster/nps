import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload as UploadIcon, FileUp, CheckCircle2, XCircle } from "lucide-react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setStatus("idle")
      setResult(null)
      setErrorMsg("")
    }
  }

  const upload = async () => {
    if (!file) return
    setStatus("uploading")
    setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const resp = await fetch("/nps/api/upload", { method: "POST", body: formData })
      const data = await resp.json()
      if (!resp.ok) {
        setErrorMsg(data.error || "Ошибка загрузки")
        setStatus("error")
        return
      }
      setResult(data)
      setStatus("success")
      setFile(null)
    } catch (e: any) {
      setErrorMsg(e?.message || "Ошибка сети")
      setStatus("error")
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Загрузка данных</h1>
        <p className="text-sm text-slate-500">Ежемесячный файл с оценками NPS</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UploadIcon className="w-5 h-5" /> Загрузка файла
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <FileUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600 mb-2">Выберите файл с оценками за месяц</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
              id="file-upload"
            />
            <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
              Выбрать файл
            </Button>
            {file && (
              <p className="text-sm text-slate-600 mt-2">
                Выбран: <b>{file.name}</b>
              </p>
            )}
          </div>

          {file && status !== "uploading" && (
            <Button onClick={upload} className="w-full">
              <UploadIcon className="w-4 h-4 mr-2" /> Загрузить
            </Button>
          )}

          {status === "uploading" && (
            <div className="flex items-center justify-center gap-2 text-blue-600 py-4">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Импорт данных, подождите (может занять пару минут)...
            </div>
          )}

          {status === "success" && result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-5 h-5" /> Импорт завершён
              </div>
              <div className="text-sm text-slate-700 grid grid-cols-2 gap-2">
                <div>Строк в файле: <b>{result.total}</b></div>
                <div>Импортировано: <b className="text-emerald-700">{result.imported}</b></div>
                <div>Дубликаты (пропущены): <b>{result.duplicates}</b></div>
                <div>Периоды: <b>{result.yearMonths.join(", ")}</b></div>
              </div>
              {result.newProjects?.length > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 rounded p-2">
                  Новые системы (созданы автоматически): {result.newProjects.join(", ")}
                </div>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
              <XCircle className="w-5 h-5" /> {errorMsg}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Требования к файлу</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Формат: .csv или .xlsx</li>
            <li>
              Колонки: <b>Дата и время оценки, Система, Издание, Битрикс, Оценка, Комментарий, Детрактор, Нейтральный, Промоутер</b>
            </li>
            <li>Категория негативам проставляется автоматически по справочнику правил (Админ → Правила категорий)</li>
            <li>Дубликаты (та же система, дата, оценка и комментарий) пропускаются автоматически</li>
            <li>Повторная загрузка того же файла безопасна</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
