import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  FileText, 
  Target, 
  ArrowLeftRight,
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  selectedObjectiveName: string | null;
  onClearObjective: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, selectedObjectiveName, onClearObjective, onLogout }) => {
  const location = useLocation();
  
  // Define como true para iniciar sempre recolhido
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/financeiro', icon: <Wallet size={20} />, label: 'Financeiro' },
    { path: '/marcos', icon: <Target size={20} />, label: 'Milestones' },
    { path: '/documentos', icon: <FileText size={20} />, label: 'Documentos' },
    { path: '/ajustes', icon: <Settings size={20} />, label: 'Ajustes' },
  ];

  return (
    <div className="flex h-screen bg-emerald-50/30 overflow-hidden">
      {/* Sidebar */}
      <aside 
        // Gerencia a expansão através do hover do mouse
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`bg-white border-r border-emerald-100 flex flex-col shadow-xl transition-all duration-300 ease-in-out z-50 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header / Logo */}
        <div className={`p-6 border-b border-emerald-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">T</div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-emerald-900 truncate animate-in fade-in slide-in-from-left-2 duration-300">
                TessaroPlanner
              </span>
            )}
          </div>
        </div>

        {/* Informação do Objetivo - Aparece apenas no hover */}
        {!isCollapsed && selectedObjectiveName && (
          <div className="px-6 py-4 border-b border-emerald-50 bg-emerald-50/50 animate-in fade-in duration-300">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Objetivo Ativo</span>
            <p className="text-sm font-bold text-emerald-900 truncate">{selectedObjectiveName}</p>
          </div>
        )}

        {/* Navegação */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                // Tooltip nativo quando recolhido
                title={isCollapsed ? item.label : ''}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                  isActive ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-600 hover:bg-emerald-50'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium truncate animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé do Menu */}
        <div className="p-3 space-y-2 border-t border-emerald-100">
          <button 
            onClick={onClearObjective}
            className="flex items-center gap-3 px-3 py-3 w-full text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-medium group"
          >
            <ArrowLeftRight size={20} className="shrink-0" />
            {!isCollapsed && <span className="truncate animate-in fade-in duration-300">Trocar Objetivo</span>}
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="truncate animate-in fade-in duration-300">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto bg-white/50">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;