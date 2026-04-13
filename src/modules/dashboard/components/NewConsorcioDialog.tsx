import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { consorcioApi } from "@/services/api";
import { toast } from "sonner";

const formSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  direccion: z.string().min(5, "La dirección debe tener al menos 5 caracteres"),
  comision_admin: z.coerce.number().min(0).max(100),
  tasa_mora: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface NewConsorcioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewConsorcioDialog({ open, onOpenChange, onSuccess }: NewConsorcioDialogProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nombre: "",
      direccion: "",
      comision_admin: 0,
      tasa_mora: 0,
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await consorcioApi.create(values);
      toast.success("Consorcio creado correctamente");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al crear el consorcio");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Consorcio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre del Edificio</label>
            <Input {...register("nombre")} placeholder="Ej: Edificio Central" />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección</label>
            <Input {...register("direccion")} placeholder="Ej: Av. Libertador 1234" />
            {errors.direccion && <p className="text-xs text-red-500">{errors.direccion.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Comisión Admin (%)</label>
              <Input type="number" step="0.01" {...register("comision_admin")} />
              {errors.comision_admin && <p className="text-xs text-red-500">{errors.comision_admin.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tasa Mora (%)</label>
              <Input type="number" step="0.01" {...register("tasa_mora")} />
              {errors.tasa_mora && <p className="text-xs text-red-500">{errors.tasa_mora.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Crear Consorcio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
