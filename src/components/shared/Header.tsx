import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <Building2 className="h-6 w-6 text-blue-600" />
          <span>ConsorciApp</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">Administración Central</span>
        </div>
      </div>
    </header>
  );
}
