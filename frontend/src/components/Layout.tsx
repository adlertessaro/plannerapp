import React, { useEffect, useState } from 'react';
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
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/financeiro', icon: Wallet, label: 'Financeiro' },
    { path: '/marcos', icon: Target, label: 'Milestones' },
    { path: '/documentos', icon: FileText, label: 'Documentos' },
    { path: '/ajustes', icon: Settings, label: 'Ajustes' }
  ];

  const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

  return (
    <div className="flex h-screen bg-emerald-50/30 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`hidden md:block bg-white border-r border-emerald-100 flex flex-col shadow-xl transition-all duration-300 ease-in-out z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        {/* Header / Logo */}
        <div className={`p-6 border-b border-emerald-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {/* ESQUERDA: Logo + FOCUS + by Tessaro Labs */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">T</div>
            
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-black text-emerald-900 tracking-tight">FOCUS</h1>
                <span className="text-emerald-600 text-xs font-medium tracking-tight">by Tessaro Labs</span>
              </div>
            )}
          </div>
          
          {/* DIREITA: vazio quando expandido */}
          <div className="flex items-center gap-3 min-w-0" />
        </div>

        {/* Informação do Objetivo - Aparece apenas no hover */}
        {!isCollapsed && selectedObjectiveName && (
          <div className="px-6 py-4 border-b border-emerald-50 bg-emerald-50/50 animate-in fade-in duration-300">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Objetivo</span>
            <p className="text-sm font-bold text-emerald-900 truncate uppercase">{selectedObjectiveName}</p>
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
                <span className="shrink-0"><item.icon size={20} /></span>
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
      <main className={`flex-1 overflow-auto bg-white/50 ${isMobile ? 'pb-20 md:pb-0' : ''}`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <div className="mb-8 pb-4 border-b border-emerald-100 md:hidden">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shrink-0">
                F
              </div>
              <div>
                <h1 className="text-2xl font-black text-emerald-900 tracking-tight">FOCUS</h1>
                <span className="text-emerald-600 text-sm font-medium tracking-tight">by Tessaro Labs</span>
              </div>
            </div>
          </div>
          {children}

        </div>
      </main>
      {isMobile && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-2xl z-50">
          {/* Remove px-4 aqui pra centralizar perfeito */}
          <div className="flex h-full items-end justify-between">  {/* <-- Muda pra justify-between */}
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 h-full justify-end 
                          {isActive ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-700 hover:bg-emerald-50 active:scale-95'}"  // Ajustei classes inline pra clareza
                >
                  <Icon size={24} />
                  <span className="text-xs font-bold tracking-tight min-w-[60px] text-center leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

    </div>
  );
};

export default Layout;