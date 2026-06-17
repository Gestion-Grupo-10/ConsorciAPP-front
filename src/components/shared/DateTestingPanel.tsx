import { useEffect, useState } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearAppTodayIso,
  getAppTodayIso,
  isAppDateTestingEnabled,
  setAppTodayIso,
} from "@/lib/appDate";

export default function DateTestingPanel() {
  const [effectiveDate, setEffectiveDate] = useState(getAppTodayIso());
  const [draftDate, setDraftDate] = useState(getAppTodayIso());

  useEffect(() => {
    if (!isAppDateTestingEnabled()) return;

    const sync = () => {
      const next = getAppTodayIso();
      setEffectiveDate(next);
      setDraftDate(next);
    };

    window.addEventListener("consorciapp:app-date-change", sync);
    return () => window.removeEventListener("consorciapp:app-date-change", sync);
  }, []);

  if (!isAppDateTestingEnabled()) return null;

  const handleApply = () => {
    setAppTodayIso(draftDate);
    setEffectiveDate(draftDate);
  };

  const handleReset = () => {
    clearAppTodayIso();
    const next = getAppTodayIso();
    setEffectiveDate(next);
    setDraftDate(next);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[290px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-slate-600" />
        <p className="text-sm font-semibold text-slate-900">Fecha de testing</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha efectiva</p>
          <p className="text-sm font-medium text-slate-900">{effectiveDate}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Simular fecha</label>
          <Input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={handleApply}>
            Aplicar
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Real
          </Button>
        </div>
      </div>
    </div>
  );
}