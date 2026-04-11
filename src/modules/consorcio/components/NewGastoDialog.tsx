import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gastoApi } from "@/services/api";
import { toast } from "sonner";
import type { Unidad } from "@/services/interfaces/IDetailServices";

const formSchema = z.object({
  descripcion: z.string().min(3, "La descripción es requerida"),
  monto: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha: z.string().min(1, "La fecha es requerida"),
  tipo: z.enum(["comun", "extraordinario", "particular"]),
  unidad_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewGastoDialogProps {
  consorcioId: string;
  unidades: Unidad[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewGastoDialog({ consorcioId, unidades, open, onOpenChange, onSuccess }: NewGastoDialogProps) {
  const { register, handleSubmit, reset, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      descripcion: "",
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
      tipo: "comun",
      unidad_id: "",
    }
  });

  const tipo = watch("tipo");

  const onSubmit = async (values: FormValues) => {
    try {
      await gastoApi.create({
        ...values,
        consorcio_id: consorcioId,
      });
      toast.success("Gasto registrado correctamente");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar el gasto");
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "comun": return "Común / Ordinario";
      case "extraordinario": return "Extraordinario";
      case "particular": return "Particular (A una unidad)";
      default: return "Seleccione tipo";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Input {...register("descripcion")} placeholder="Ej: Reparación de ascensor" />
            {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto ($)</label>
              <Input type="number" step="0.01" {...register("monto")} />
              {errors.monto && <p className="text-xs text-red-500">{errors.monto.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input type="date" {...register("fecha")} />
              {errors.fecha && <p className="text-xs text-red-500">{errors.fecha.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Gasto</label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full h-10 px-3 flex items-center justify-between">
                    <span>{getTipoLabel(field.value)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comun">Común / Ordinario</SelectItem>
                    <SelectItem value="extraordinario">Extraordinario</SelectItem>
                    <SelectItem value="particular">Particular (A una unidad)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {tipo === "particular" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidad Destino</label>
              <Controller
                name="unidad_id"
                control={control}
                render={({ field }) => {
                  const selectedUnidad = unidades.find(u => u.id === field.value);
                  return (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 px-3 flex items-center justify-between">
                        <span className={!selectedUnidad ? "text-slate-500" : ""}>
                          {selectedUnidad 
                            ? `${selectedUnidad.nro_piso} - ${selectedUnidad.propietario}` 
                            : "Seleccione unidad"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map(u => (
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
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Registrar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
