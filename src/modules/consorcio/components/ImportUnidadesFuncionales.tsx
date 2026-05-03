import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import { unidadApi } from "@/services/api";

interface ImportUnidadesFuncionalesProps {
  consorcioId: string;
  onSuccess: () => void;
}

export default function ImportUnidadesFuncionales({ consorcioId, onSuccess }: ImportUnidadesFuncionalesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        setIsUploading(true);
        const data = event.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        await processAndUpload(jsonData);
      } catch (error) {
        console.error("Error parsing the file:", error);
        toast.error("Hubo un error al leer el archivo Excel.");
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const processAndUpload = async (rawData: any[]) => {
    const formattedUnits = rawData.map(row => ({
      consorcio_id: consorcioId,
      nro_piso: String(row["Piso-Depto"] || row["Unidad"] || ""),
      propietario: String(row["Propietario"] || ""),
      superficie: parseFloat(row["Superficie"] || row["Superficie m2"] || 0),
      email: String(row["Email"] || ""),
      telefono: String(row["Telefono"] || "")
    })).filter(u => u.nro_piso && u.superficie);

    if (formattedUnits.length === 0) {
      toast.error("No se encontraron unidades válidas en el archivo.");
      return;
    }

    try {
      for (const unit of formattedUnits) {
        await unidadApi.create(unit as any);
      }
      
      toast.success(`${formattedUnits.length} unidades cargadas exitosamente`);
      onSuccess(); 
    } catch (error) {
      console.error("Error uploading to server", error);
      toast.error("Hubo un problema al guardar las unidades en el servidor.");
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        ref={fileInputRef}
        style={{ display: 'none' }} 
        onChange={handleFileUpload} 
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleImportClick}
        disabled={isUploading}
      >
        <Upload className="mr-2 h-5 w-5" /> 
        {isUploading ? "Cargando..." : "Importar unidades desde Excel..."}
      </Button>
    </>
  );
}