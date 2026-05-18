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
  Search,
  Bell,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4",
      active 
        ? "bg-slate-50 text-primary border-primary font-bold" 
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
    { to: "/importar", icon: FileUp, label: "Importar Horas" },
    { to: "/relatorios", icon: FileText, label: "Relatórios" },
  ];

  if (user?.role === 'ADMIN') {
    menuItems.push({ to: "/usuarios", icon: UserCog, label: "Utilizadores" });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      {/* Top Bar - Material Blue */}
      <header className="h-16 bg-primary flex items-center justify-between px-6 shadow-md z-30 sticky top-0 no-print">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white">
             <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center font-bold italic text-lg">M</div>
             <span className="font-bold tracking-tight text-xl uppercase hidden sm:block">MaterialPro</span>
          </div>
          
          <div className="hidden md:flex items-center text-white/70">
             <Search size={20} className="mr-4 cursor-pointer hover:text-white" />
          </div>
        </div>

        <div className="flex items-center gap-5">
           <div className="hidden sm:flex items-center gap-4 text-white/80">
              <Bell size={20} className="cursor-pointer hover:text-white" />
              <MessageSquare size={20} className="cursor-pointer hover:text-white" />
           </div>
           
           <div className="flex items-center gap-3 pl-4">
              <span className="text-white text-sm font-medium hidden sm:block">Markarn Doe</span>
              <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white/20 overflow-hidden cursor-pointer">
                 <img src="https://i.pravatar.cc/150?u=markarn" alt="User" />
              </div>
           </div>
           
           <button className="lg:hidden text-white ml-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu size={24} />
           </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white shadow-xl z-20 no-print sticky top-16 h-[calc(100vh-64px)]">
          <nav className="flex-1 flex flex-col pt-4">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}
          </nav>

          <div className="p-6 border-t">
             <button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded shadow-lg shadow-orange-500/30 text-sm font-bold transition-all uppercase tracking-wider"
             >
                Upgrade to Pro
             </button>
             
             <button
              onClick={handleLogout}
              className="mt-4 flex items-center gap-3 text-slate-400 hover:text-destructive transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
           {/* Breadcrumb Header */}
           <div className="bg-white px-8 py-6 flex items-center justify-between shadow-sm no-print">
              <div>
                 <h2 className="text-xl font-medium text-slate-800">Dashboard</h2>
                 <p className="text-xs text-slate-400 mt-1">
                    <Link to="/" className="hover:text-primary">Home</Link>
                    <span className="mx-2 font-bold text-[10px]"> &gt; </span>
                    <span className="text-slate-300">Dashboard</span>
                 </p>
              </div>
              <button className="bg-[#fb3a7e] hover:bg-[#e91e63] text-white px-4 py-2 rounded text-xs font-bold shadow-lg shadow-pink-500/30 transition-all">
                 Upgrade to Pro
              </button>
           </div>

           <main className="p-8">
              <Outlet />
           </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="h-16 bg-primary flex items-center px-6">
                <span className="text-white font-bold text-xl uppercase">MaterialPro</span>
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
        </div>
      )}
    </div>
  );
};

export default MainLayout;
