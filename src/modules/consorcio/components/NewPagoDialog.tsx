import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pagoApi } from "@/services/api";
import { toast } from "sonner";
import type { Unidad } from "@/services/interfaces/IDetailServices";

const formSchema = z.object({
  unidad_id: z.string().min(1, "Seleccione una unidad"),
  monto: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha: z.string().min(1, "La fecha es requerida"),
  periodo: z.string().min(7, "El periodo es requerido (YYYY-MM)"),
});

type FormValues = z.infer<typeof formSchema>;

interface NewPagoDialogProps {
  consorcioId: string;
  unidades: Unidad[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewPagoDialog({ consorcioId, unidades, open, onOpenChange, onSuccess }: NewPagoDialogProps) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      unidad_id: "",
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
      periodo: currentMonth,
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await pagoApi.create({
        ...values,
        consorcio_id: consorcioId,
      });
      toast.success("Pago registrado correctamente");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar el pago");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Unidad</label>
            <Select onValueChange={(val) => setValue("unidad_id", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione unidad" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nro_piso} - {u.propietario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {errors.unidad_id && <p className="text-xs text-red-500">{errors.unidad_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto ($)</label>
              <Input type="number" step="0.01" {...register("monto")} />
              {errors.monto && <p className="text-xs text-red-500">{errors.monto.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Pago</label>
              <Input type="date" {...register("fecha")} />
              {errors.fecha && <p className="text-xs text-red-500">{errors.fecha.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Periodo (Mes a Liquidar)</label>
            <Input type="month" {...register("periodo")} />
            {errors.periodo && <p className="text-xs text-red-500">{errors.periodo.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
