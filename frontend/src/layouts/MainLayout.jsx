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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
        : "text-slate-500 border-transparent hover:text-primary hover:bg-slate-50"
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

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/docentes", icon: Users, label: "Docentes" },
    { to: "/importar", icon: FileUp, label: "Lançamento de Horas" },
    { to: "/relatorios", icon: FileText, label: "Relatórios" },
  ];

  if (user?.role === 'ADMIN') {
    menuItems.push({ to: "/usuarios", icon: UserCog, label: "Utilizadores" });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/docentes': return 'Docentes';
      case '/importar': return 'Lançamento de Horas';
      case '/relatorios': return 'Relatórios';
      case '/usuarios': return 'Utilizadores';
      default: return 'Página';
    }
  };

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  const userRoleText = user?.role === 'ADMIN' ? 'Administrador Geral' : 'Director de Curso';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
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
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 z-20 no-print sticky top-16 h-[calc(100vh-64px)] justify-between">
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
             <div className="bg-secondary/40 p-4 rounded-2xl border border-secondary/50 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Acesso Ativo</span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  {user?.role === 'ADMIN' ? <ShieldAlert size={12} className="text-primary" /> : <User size={12} className="text-primary" />}
                  {user?.username}
                </span>
             </div>
             
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
        <div className="flex-1 flex flex-col">
           {/* Breadcrumb Header */}
           <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-100 no-print">
              <div>
                 <h2 className="text-xl font-bold text-slate-800">{getBreadcrumbTitle()}</h2>
                 <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                    <Link to="/" className="hover:text-primary transition-colors">Início</Link>
                    <ChevronRight size={12} className="text-slate-300" />
                    <span className="text-slate-400 font-bold">{getBreadcrumbTitle()}</span>
                 </p>
              </div>
           </div>

           <main className="p-8 max-w-[1600px] w-full mx-auto flex-1">
              <Outlet />
           </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white flex flex-col justify-between" onClick={e => e.stopPropagation()}>
             <div>
               <div className="h-16 bg-primary flex items-center px-6 gap-2 border-b border-white/10">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-sm">SG</div>
                  <span className="text-white font-bold text-sm uppercase tracking-wide">SGFS Nocturno</span>
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
               <div className="bg-secondary/40 p-4 rounded-2xl border flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Utilizador</span>
                  <span className="text-xs font-bold text-foreground">{user?.username} ({userRoleText})</span>
               </div>
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
    </div>
  );
};

export default MainLayout;
