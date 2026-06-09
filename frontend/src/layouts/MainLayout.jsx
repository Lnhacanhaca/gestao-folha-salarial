import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileUp, 
  FileText, 
  UserCog, 
  LogOut,
  Menu,
  X,
  User,
  ShieldAlert,
  ChevronRight,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ProfileModal from '../components/ProfileModal';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ to, icon: Icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4",
      active 
        ? "bg-primary/5 text-primary border-primary font-bold shadow-sm" 
        : "text-muted-foreground border-transparent hover:text-primary hover:bg-secondary/50 dark:hover:bg-secondary/20"
    )}
  >
    <Icon size={18} />
    <span className="text-[15px]">{label}</span>
  </Link>
);

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState(() => localStorage.getItem('themeMode') || 'light');

  const toggleTheme = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    localStorage.setItem('themeMode', nextMode);
    if (nextMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/docentes", icon: Users, label: "Docentes" },
    { to: "/lancar-notas", icon: FileUp, label: "Lançamento de Horas" },
    { to: "/relatorios", icon: FileText, label: "Relatórios" },
  ];

  if (user?.role === 'ADMIN') {
    menuItems.push({ to: "/usuarios", icon: UserCog, label: "Utilizadores" });
    menuItems.push({ to: "/auditoria", icon: ShieldAlert, label: "Auditoria" });
    menuItems.push({ to: "/configuracoes", icon: Settings, label: "Configurações" });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/docentes': return 'Docentes';
      case '/lancar-notas': return 'Lançamento de Horas';
      case '/relatorios': return 'Relatórios';
      case '/usuarios': return 'Utilizadores';
      case '/auditoria': return 'Histórico e Auditoria';
      case '/configuracoes': return 'Configurações';
      default: return 'Página';
    }
  };

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  const userRoleText = user?.role === 'ADMIN' ? 'Administrador Geral' : 'Director de Curso';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Top Bar */}
      <header className="h-16 bg-primary flex items-center justify-between px-6 shadow-md z-30 sticky top-0 no-print">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-white">
             <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center font-bold text-white border border-white/20">
               SG
             </div>
             <span className="font-bold tracking-tight text-sm sm:text-base uppercase hidden sm:block">
               Sistema de Gestão de Folhas Salariais - Nocturno
             </span>
             <span className="font-bold tracking-tight text-sm uppercase block sm:hidden">
               SGFS - Nocturno
             </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
           {/* Theme Toggle Button */}
           <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
              title={themeMode === 'light' ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
            >
              {themeMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
           </button>

           <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-white text-sm font-semibold">{user?.username || 'Utilizador'}</p>
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">{userRoleText}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold shadow-inner">
                {userInitial}
              </div>
           </div>
           
           <button className="lg:hidden text-white ml-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu size={24} />
           </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border z-20 no-print sticky top-16 h-[calc(100vh-64px)] justify-between">
          <nav className="flex-1 flex flex-col pt-4">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}
          </nav>

          <div className="p-6 border-t border-slate-50 space-y-4">
             <button
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full bg-secondary/40 hover:bg-secondary p-4 rounded-2xl border border-secondary/50 flex flex-col gap-1 transition-all text-left cursor-pointer group shadow-sm"
                title="Editar o meu perfil"
             >
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide group-hover:text-primary transition-colors">Acesso Ativo</span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  {user?.role === 'ADMIN' ? <ShieldAlert size={12} className="text-primary" /> : <User size={12} className="text-primary" />}
                  {user?.username}
                </span>
             </button>
             
             <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20 transition-all text-sm font-bold shadow-sm"
            >
              <LogOut size={16} />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
           {/* Breadcrumb Header */}
            <div className="bg-card px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-border no-print">
               <div>
                  <h2 className="text-xl font-bold text-foreground">{getBreadcrumbTitle()}</h2>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                     <Link to="/" className="hover:text-primary transition-colors">Início</Link>
                     <ChevronRight size={12} className="text-slate-300" />
                     <span className="text-slate-400 font-bold">{getBreadcrumbTitle()}</span>
                  </p>
               </div>
            </div>

            <main className="p-4 sm:p-8 max-w-[1600px] w-full mx-auto flex-1 min-w-0">
               <Outlet />
            </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-card border-r border-border flex flex-col justify-between" onClick={e => e.stopPropagation()}>
             <div>
               <div className="h-16 bg-primary flex items-center justify-between px-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-sm">SG</div>
                    <span className="text-white font-bold text-sm uppercase tracking-wide">SGFS Nocturno</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-white/80 transition-colors p-1" aria-label="Close menu">
                    <X size={22} />
                  </button>
               </div>
               <nav className="flex-1 flex flex-col pt-4">
                  {menuItems.map((item) => (
                    <SidebarItem 
                      key={item.to} 
                      {...item} 
                      active={location.pathname === item.to} 
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  ))}
               </nav>
             </div>
             
             <div className="p-6 border-t space-y-4">
               <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsProfileModalOpen(true); }}
                  className="w-full bg-secondary/40 hover:bg-secondary p-4 rounded-2xl border flex flex-col gap-1 transition-all text-left cursor-pointer group shadow-sm"
               >
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Acesso Ativo</span>
                  <span className="text-xs font-bold text-foreground">{user?.username} ({userRoleText})</span>
               </button>
               <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20 transition-all text-sm font-bold shadow-sm"
               >
                <LogOut size={16} />
                <span>Sair do Sistema</span>
               </button>
             </div>
          </div>
        </div>
      )}

      {(isProfileModalOpen || (user && user.role !== 'ADMIN' && user.first_login)) && (
        <ProfileModal 
          onClose={() => setIsProfileModalOpen(false)} 
          force={!!(user && user.role !== 'ADMIN' && user.first_login)} 
        />
      )}
    </div>
  );
};

export default MainLayout;
