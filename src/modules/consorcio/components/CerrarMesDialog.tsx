import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mesCerradoApi } from "@/services/api";
import { toast } from "sonner";
import { LockIcon, LockOpenIcon, TriangleAlertIcon } from "lucide-react";

interface CerrarMesDialogProps {
  consorcioId: string;
  periodo: string; // YYYY-MM
  isCerrado: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CerrarMesDialog({
  consorcioId,
  periodo,
  isCerrado,
  open,
  onOpenChange,
  onSuccess,
}: CerrarMesDialogProps) {
  const [loading, setLoading] = useState(false);

  const periodoLabel = new Date(`${periodo}-01`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  async function handleConfirm() {
    setLoading(true);
    try {
      if (isCerrado) {
        await mesCerradoApi.abrir(consorcioId, periodo);
        toast.success(`El mes de ${periodoLabel} fue reabierto.`);
      } else {
        await mesCerradoApi.cerrar(consorcioId, periodo);
        toast.success(`El mes de ${periodoLabel} fue cerrado correctamente.`);
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCerrado ? (
              <LockOpenIcon className="size-5 text-amber-500" />
            ) : (
              <LockIcon className="size-5 text-destructive" />
            )}
            {isCerrado ? "Reabrir mes" : "Cerrar mes"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isCerrado ? (
              <>
                Estás por <strong>reabrir</strong> el mes de{" "}
                <strong className="text-foreground">{periodoLabel}</strong>. Una vez reabierto,
                se podrán volver a cargar y eliminar gastos para este período.
              </>
            ) : (
              <>
                Estás por <strong>cerrar</strong> el mes de{" "}
                <strong className="text-foreground">{periodoLabel}</strong>.
              </>
            )}
          </p>

          {!isCerrado && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Una vez cerrado, <strong>no se podrán cargar ni eliminar gastos</strong> para
                este período. Podés reabrirlo más tarde si es necesario.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={isCerrado ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? "Procesando..."
              : isCerrado
              ? "Sí, reabrir mes"
              : "Sí, cerrar mes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
