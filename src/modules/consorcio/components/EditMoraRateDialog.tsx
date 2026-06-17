import { useEffect } from "react";
import { useForm, Controller, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { consorcioApi } from "@/services/api";
import type { Consorcio, MoraVigenciaMode } from "@/services/interfaces/IConsorcioService";
import { toast } from "sonner";
import { getAppTodayIso } from "@/lib/appDate";

const formSchema = z
  .object({
    tasa_mora: z.coerce.number().min(0, "La tasa debe ser mayor o igual a 0").max(100, "La tasa debe ser menor o igual a 100"),
    vigencia_mode: z.enum(["next_period", "current_period", "particular_date"]),
    particular_date: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.vigencia_mode === "particular_date" && !values.particular_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe indicar la fecha particular de vigencia",
        path: ["particular_date"],
      });
    }
  });

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

interface EditMoraRateDialogProps {
  consorcio: Consorcio;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const modeLabel: Record<MoraVigenciaMode, string> = {
  next_period: "A partir del proximo periodo mensual",
  current_period: "A partir del periodo actual",
  particular_date: "A partir de una fecha particular",
};

export default function EditMoraRateDialog({ consorcio, open, onOpenChange, onSuccess }: EditMoraRateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tasa_mora: consorcio.tasa_mora,
      vigencia_mode: "next_period",
      particular_date: getAppTodayIso(),
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      tasa_mora: consorcio.tasa_mora,
      vigencia_mode: "next_period",
      particular_date: getAppTodayIso(),
    });
  }, [open, consorcio.tasa_mora, reset]);

  const vigenciaMode = useWatch({ control, name: "vigencia_mode" });

  const vigenciaDescription =
    vigenciaMode === "next_period"
      ? "La nueva tasa se aplicará desde el primer día del próximo período mensual."
      : vigenciaMode === "current_period"
        ? "La nueva tasa se aplicará desde el primer día del período actual."
        : vigenciaMode === "particular_date"
          ? "La nueva tasa se aplicará desde la fecha seleccionada."
          : "";

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      await consorcioApi.updateMoraRate(consorcio.id, {
        tasa_mora: values.tasa_mora,
        vigencia_mode: values.vigencia_mode,
        particular_date: values.vigencia_mode === "particular_date" ? values.particular_date : undefined,
      });

      toast.success("Tasa de mora actualizada");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la tasa de mora");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tasa de mora</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nueva tasa de mora (%)</label>
            <Input type="number" step="0.01" {...register("tasa_mora")} />
            {errors.tasa_mora && <p className="text-xs text-red-500">{errors.tasa_mora.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Inicio de vigencia</label>
            <Controller
              name="vigencia_mode"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full h-10 px-3 flex items-center justify-between">
                    <span>{modeLabel[field.value]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next_period">A partir del proximo periodo mensual</SelectItem>
                    <SelectItem value="current_period">A partir del periodo actual</SelectItem>
                    <SelectItem value="particular_date">A partir de una fecha particular</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-slate-500 leading-relaxed">{vigenciaDescription}</p>
          </div>

          {vigenciaMode === "particular_date" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha particular de vigencia</label>
              <Input type="date" {...register("particular_date")} />
              {errors.particular_date && <p className="text-xs text-red-500">{errors.particular_date.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
