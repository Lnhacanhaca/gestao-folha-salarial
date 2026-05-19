import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { 
  Users, 
  BookOpen, 
  Clock, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Shield, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, description, trend, colorClass }) => (
  <div className="bg-card p-6 rounded-3xl border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-extrabold tracking-tight">{value}</h3>
        {trend && (
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <TrendingUp size={12} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-medium">{description}</p>
    </div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-transform group-hover:scale-110 ${colorClass}`}>
      <Icon size={26} />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocentes: 0,
    totalCursos: 3,
    totalAdHours: 0,
    totalValor: 0,
    courseDetails: []
  });

  const [activeMonth] = useState(() => new Date().getMonth() + 1);
  const [activeYear] = useState(() => new Date().getFullYear());

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Docentes
      const { data: docentes } = await api.get('/docentes');
      
      // 2. Fetch General Month Sheet to compute total AD and valor
      const { data: generalSheet } = await api.get(`/folhas/geral?mes=${activeMonth}&ano=${activeYear}`);
      
      // Calculate totals from sheet
      let totalAd = 0;
      let totalVal = 0;
      generalSheet.forEach(row => {
        totalAd += row.total_ad || 0;
        totalVal += row.valor_receber || 0;
      });

      // Compute statistics by Course
      // We check how many teachers belong to each course & sum their AP
      const courseStats = {
        2: { id: 2, name: 'CA / CAP (Contabilidade)', teachers: 0, ap: 0, saved: false },
        3: { id: 3, name: 'EM / EPM (Minas)', teachers: 0, ap: 0, saved: false },
        4: { id: 4, name: 'EI (Informática)', teachers: 0, ap: 0, saved: false }
      };

      docentes.forEach(doc => {
        try {
          let cursosArray = [];
          if (typeof doc.cursos === 'string') {
            cursosArray = JSON.parse(doc.cursos);
          } else if (Array.isArray(doc.cursos)) {
            cursosArray = doc.cursos;
          }
          cursosArray.forEach(c => {
            const cid = c.id || c;
            if (courseStats[cid]) {
              courseStats[cid].teachers += 1;
              courseStats[cid].ap += parseFloat(c.ap) || 0;
            }
          });
        } catch(e){}
      });

      // 3. Fetch course sheet statuses to check if saved
      for (const cid of [2, 3, 4]) {
        try {
          const { data: courseSheet } = await api.get(`/folhas/curso/${cid}?mes=${activeMonth}&ano=${activeYear}`);
          if (courseSheet && courseSheet.length > 0) {
            courseStats[cid].saved = true;
          }
        } catch(e){}
      }

      setStats({
        totalDocentes: docentes.length,
        totalCursos: 3,
        totalAdHours: totalAd,
        totalValor: totalVal,
        courseDetails: Object.values(courseStats)
      });
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeMonth, activeYear]);

  // Chart data formatting
  const chartData = stats.courseDetails.map(c => ({
    name: c.id === 2 ? 'Contabilidade' : c.id === 3 ? 'Minas' : 'Informática',
    'Docentes': c.teachers,
    'Horas Programadas (AP)': c.ap
  }));

  const COLORS = ['#1e88e5', '#745af2', '#00acc1'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-semibold">Carregando indicadores do dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Intro Header */}
      <div className="bg-card border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h2 className="text-2xl font-black text-slate-800">
            Olá, {user?.username || 'Utilizador'}!
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Bem-vindo ao dashboard do Curso Nocturno do ISPT para o mês de <span className="text-primary font-bold">{meses[activeMonth - 1]} de {activeYear}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-2xl border text-xs font-bold text-muted-foreground select-none shrink-0">
          <Clock size={14} className="text-primary" />
          <span>Sincronizado em tempo real</span>
        </div>
      </div>

      {/* Grid Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Docentes"
          value={stats.totalDocentes}
          icon={Users}
          description="Professores ativos no sistema"
          colorClass="bg-blue-50 text-blue-600 border-blue-100"
        />
        <StatCard 
          title="Cursos Lecionados"
          value={stats.totalCursos}
          icon={BookOpen}
          description="Curso Nocturno Geral"
          colorClass="bg-indigo-50 text-indigo-600 border-indigo-100"
        />
        <StatCard 
          title="Aulas Dadas (AD)"
          value={`${stats.totalAdHours}h`}
          icon={Clock}
          description="Total ministrado no mês atual"
          colorClass="bg-cyan-50 text-cyan-600 border-cyan-100"
        />
        <StatCard 
          title="Folha Salarial Estimada"
          value={`${stats.totalValor.toLocaleString('pt-MZ')} Mts`}
          icon={Coins}
          description="Valor total a liquidar"
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
      </div>

      {/* Charts & Status lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-3xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Distribuição de Carga Horária e Professores</h3>
              <p className="text-xs text-muted-foreground">Visão geral do corpo docente e horas programadas semanais por área</p>
            </div>
          </div>
          
          <div className="h-[320px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: 12, paddingTop: 10}} />
                <Bar dataKey="Docentes" fill="#745af2" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="Horas Programadas (AP)" fill="#00acc1" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State of Course Sheets */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg text-slate-800">Estado de Lançamento</h3>
              <p className="text-xs text-muted-foreground">Monitoria de folhas salariais deste mês</p>
            </div>

            <div className="space-y-3">
              {stats.courseDetails.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-3.5 bg-secondary/30 rounded-2xl border hover:bg-secondary/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <span>{c.teachers} Docentes</span>
                      <span>•</span>
                      <span>{c.ap}h AP/Semana</span>
                    </p>
                  </div>
                  <div>
                    {c.saved ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Guardado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={12} />
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t mt-4">
            <Link 
              to="/importar" 
              className="w-full py-3 bg-primary text-white text-xs font-bold rounded-2xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Realizar Lançamentos de Horas
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
