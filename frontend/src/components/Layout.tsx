import React, { useEffect, useState, useRef } from 'react';
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
import Logo from '../../assets/logo.png'; 

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

  const [showMenu, setShowMenu] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);

    // Fecha menu ao clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const menuButton = document.querySelector('button[title="Mais opções"]'); // ou dá id="menu-btn"
        const menuElement = document.querySelector('.absolute.-top-2.-right-2'); // seletor do dropdown
        
        if (showMenu && 
            !menuButton?.contains(event.target as Node) && 
            !menuElement?.contains(event.target as Node)) {
          setShowMenu(false);
        }
      };

      if (showMenu) {
        document.addEventListener('click', handleClickOutside);
      }

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [showMenu]);


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
            <img 
                src={Logo} 
                alt="Tessaro Labs Logo" 
                className="w-12 h-12 rounded-xl shrink-0 object-contain bg-white/20 p-1" 
              />
            
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-black text-emerald-900 tracking-tight">FOCUS</h1>
                <span className="text-emerald-600 text-[10px] font-medium tracking-tight">by Tessaro Labs</span>
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
      <main ref={mainRef} className={`flex-1 overflow-auto bg-white/50 ${isMobile ? 'pb-20 md:pb-0' : ''}`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <div className="mb-8 pb-4 border-b border-emerald-100 md:hidden">
            <div className="flex items-center justify-between w-full px-4 py-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <img 
                  src={Logo} 
                  alt="Tessaro Labs Logo" 
                  className="w-12 h-12 rounded-xl shrink-0 object-contain bg-white/20 p-1" 
                />
                <div className="min-w-0">
                  <h1 className="text-2xl font-black text-emerald-900 tracking-tight truncate">FOCUS</h1>
                  <span className="text-emerald-600 text-sm font-medium tracking-tight">by Tessaro Labs</span>
                </div>
              </div>
              
              {/* Botão 3 pontinhos - SEMPRE no canto direito */}
              <div className="relative ml-4">
                <button
                  className="p-3 rounded-2xl bg-white shadow-md border border-emerald-200 hover:shadow-lg hover:border-emerald-300 active:scale-[0.98] transition-all flex items-center justify-center w-12 h-12 text-emerald-700 font-bold text-xl z-10"
                  onClick={() => setShowMenu(!showMenu)}
                  title="Mais opções"
                >
                  ⋮⋮⋮
                </button>
                
                {/* Dropdown */}
                {showMenu && (
                  <div className="absolute -top-2 -right-2 mt-14 w-56 bg-white border border-emerald-100 rounded-3xl shadow-2xl py-3 px-2 animate-in fade-in zoom-in duration-200 z-50 backdrop-blur-sm">
                    <button
                      onClick={() => {
                        onClearObjective(); 
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-emerald-50 text-amber-700 font-semibold transition-all group text-sm"
                    >
                      <ArrowLeftRight size={20} className="shrink-0 group-hover:rotate-12" />
                      <span>Trocar Objetivo</span>
                    </button>
                    <div className="mx-2 my-1 w-full h-px bg-emerald-100" />
                    <button
                      onClick={() => {
                        onLogout(); 
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-red-50 text-red-600 font-semibold transition-all text-sm"
                    >
                      <LogOut size={20} className="shrink-0" />
                      <span>Sair da Sessão</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {children}
          
        </div>
      </main>
      {isMobile && (
        <nav className="md:hidden fixed bottom-0 -ml-1 md:ml-0 left-0 right-0 bg-white border-t z-50  px-1 py-1 shadow-lg flex justify-center">
          <div className="flex h-full items-end justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => {
                  mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 h-full justify-end ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-lg' 
                      : 'text-emerald-700 hover:bg-emerald-50 active:scale-95'
                  }`}
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