import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { pagoApi } from "@/services/api";
import { toast } from "sonner";
import type { Unidad } from "@/services/interfaces/IDetailServices";
import { useEffect, useState } from "react";

const formSchema = z.object({
  unidad_id: z.string().min(1, "La unidad es requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().min(1, "La fecha es requerida"),
  periodo: z.string().min(1, "El período es requerido"),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

interface NewPagoDialogProps {
  consorcioId: string;
  unidades: Unidad[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewPagoDialog({ consorcioId, unidades, open, onOpenChange, onSuccess }: NewPagoDialogProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidad_id: "",
      monto: 0,
      fecha: new Date().toISOString().slice(0, 10),
      periodo: currentMonth,
    },
  });

  const [periodoBloqueado, setPeriodoBloqueado] = useState(false);
  const selectedPeriodo = useWatch({ control, name: "periodo" });

  useEffect(() => {
    let active = true;
    if (!open || !selectedPeriodo) return;

    pagoApi
      .isPeriodoBloqueado(consorcioId, selectedPeriodo)
      .then((b) => active && setPeriodoBloqueado(b))
      .catch(() => active && setPeriodoBloqueado(false));

    return () => {
      active = false;
    };
  }, [open, consorcioId, selectedPeriodo]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const blocked = await pagoApi.isPeriodoBloqueado(consorcioId, values.periodo);
    if (blocked) {
      toast.error(`El período ${values.periodo} está bloqueado.`);
      return;
    }

    await pagoApi.create({
      ...values,
      consorcio_id: consorcioId,
      tipo: "normal",
    });

    toast.success("Pago registrado correctamente");
    reset();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Unidad</label>
            <Controller
              name="unidad_id"
              control={control}
              render={({ field }) => {
                return (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full h-10 px-3 flex items-center justify-between">
                      <SelectValue placeholder="Seleccione unidad">
                        {field.value ? (() => {
                          const u = unidades.find(x => x.id === field.value);
                          return u ? `${u.nro_piso} - ${u.propietario}` : "Seleccione unidad";
                        })() : "Seleccione unidad"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nro_piso} - {u.propietario}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
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

          {periodoBloqueado && (
            <p className="text-sm text-red-500">El período seleccionado está bloqueado por vencimiento.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || periodoBloqueado}>
              {isSubmitting ? "Guardando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
