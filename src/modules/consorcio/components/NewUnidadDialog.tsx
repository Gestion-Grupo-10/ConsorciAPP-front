import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unidadApi } from "@/services/api";
import { toast } from "sonner";

const formSchema = z.object({
  nro_piso: z.string().min(1, "El piso/depto es requerido"),
  propietario: z.string().min(2, "El nombre del propietario es requerido"),
  superficie: z.coerce.number().min(1, "La superficie debe ser mayor a 0"),
  email: z.string().email("Email inválido").or(z.literal("")),
  telefono: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewUnidadDialogProps {
  consorcioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewUnidadDialog({ consorcioId, open, onOpenChange, onSuccess }: NewUnidadDialogProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nro_piso: "",
      propietario: "",
      superficie: 0,
      email: "",
      telefono: "",
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await unidadApi.create({
        ...values,
        consorcio_id: consorcioId,
      });
      toast.success("Unidad creada correctamente");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al crear la unidad");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Unidad Funcional</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Piso / Depto</label>
              <Input {...register("nro_piso")} placeholder="Ej: 1° A" />
              {errors.nro_piso && <p className="text-xs text-red-500">{errors.nro_piso.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Superficie (m²)</label>
              <Input type="number" step="0.01" {...register("superficie")} />
              {errors.superficie && <p className="text-xs text-red-500">{errors.superficie.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Propietario</label>
            <Input {...register("propietario")} placeholder="Nombre completo" />
            {errors.propietario && <p className="text-xs text-red-500">{errors.propietario.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" {...register("email")} placeholder="usuario@ejemplo.com" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Teléfono</label>
            <Input {...register("telefono")} placeholder="Ej: +54 11 ..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Crear Unidad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
