import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Users, 
  BookOpen, 
  Clock, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight,
  Loader2,
  Megaphone,
  Settings,
  Trophy
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { getManagedCourseIds, CURSO_NOME } from '../lib/cursos';
import { getHolidaysForMonth } from '../lib/holidays';
import AvisosModal from '../components/AvisosModal';

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
  
  // States
  const [stats, setStats] = useState({
    totalDocentes: 0,
    totalCursos: 5,
    totalAdHours: 0,
    totalValor: 0,
    courseDetails: []
  });
  const [avisos, setAvisos] = useState([]);
  const [isAvisosModalOpen, setIsAvisosModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const [activeMonth] = useState(() => new Date().getMonth() + 1);
  const [activeYear] = useState(() => new Date().getFullYear());

  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Maio", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const managedIds = getManagedCourseIds(user);

      // Fetch Avisos
      const { data: avisosData } = await api.get('/avisos');
      setAvisos(avisosData || []);

      // Fetch Analytics (Admin only)
      if (user?.role === 'ADMIN') {
        const { data: analyticsData } = await api.get(`/folhas/analytics?ano=${activeYear}`);
        setAnalytics(analyticsData);
      }

      // 1. Fetch Docentes
      const { data: docentes } = await api.get('/docentes');
      
      const filteredDocentes = docentes.filter(doc => {
        try {
          let cursosArray = [];
          if (typeof doc.cursos === 'string') {
            cursosArray = JSON.parse(doc.cursos);
          } else if (Array.isArray(doc.cursos)) {
            cursosArray = doc.cursos;
          }
          return cursosArray.some(c => managedIds.includes(parseInt(c.id || c)));
        } catch (e) {
          return false;
        }
      });

      // 2. Fetch specific course sheets
      const sheetsPromises = managedIds.map(cid => 
        api.get(`/folhas/curso/${cid}?mes=${activeMonth}&ano=${activeYear}`)
      );
      const sheetsResponses = await Promise.all(sheetsPromises);
      
      let totalAd = 0;
      let totalVal = 0;
      
      sheetsResponses.forEach(res => {
        const sheet = res.data || [];
        sheet.forEach(row => {
          totalAd += row.total_ad || 0;
          totalVal += row.valor_receber || 0;
        });
      });

      // Compute statistics by Course
      const courseStats = {};
      const allCourseStats = {
        2: { id: 2, name: 'Contabilidade e Auditoria', teachers: 0, ap: 0, saved: false },
        3: { id: 3, name: 'Contabilidade e Administração Pública', teachers: 0, ap: 0, saved: false },
        4: { id: 4, name: 'Engenharia de Minas', teachers: 0, ap: 0, saved: false },
        5: { id: 5, name: 'Engenharia de Processamento Mineral', teachers: 0, ap: 0, saved: false },
        6: { id: 6, name: 'Engenharia Informática', teachers: 0, ap: 0, saved: false }
      };

      managedIds.forEach(cid => {
        if (allCourseStats[cid]) {
          courseStats[cid] = { ...allCourseStats[cid] };
        }
      });

      filteredDocentes.forEach(doc => {
        try {
          let cursosArray = [];
          if (typeof doc.cursos === 'string') {
            cursosArray = JSON.parse(doc.cursos);
          } else if (Array.isArray(doc.cursos)) {
            cursosArray = doc.cursos;
          }
          cursosArray.forEach(c => {
            const cid = parseInt(c.id || c);
            if (courseStats[cid]) {
              courseStats[cid].teachers += 1;
              courseStats[cid].ap += parseFloat(c.ap) || 0;
            }
          });
        } catch(e){}
      });

      // Update saved status
      managedIds.forEach((cid, index) => {
        const sheet = sheetsResponses[index].data || [];
        if (sheet && sheet.length > 0) {
          if (courseStats[cid]) {
            courseStats[cid].saved = true;
          }
        }
      });

      setStats({
        totalDocentes: filteredDocentes.length,
        totalCursos: managedIds.length,
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
  }, [activeMonth, activeYear, user]);

  // Basic chart formatting
  const chartData = stats.courseDetails.map(c => ({
    name: c.id === 2 ? 'CA' : c.id === 3 ? 'CAP' : c.id === 4 ? 'Minas' : c.id === 5 ? 'Processam.' : 'Informática',
    'Docentes': c.teachers,
    'Horas Programadas (AP)': c.ap
  }));

  // Analytics formatting
  const analyticsEvolution = analytics?.evolution.map(e => ({
    name: meses[e.mes - 1],
    'Aulas Programadas (AP)': e.total_ap,
    'Aulas Dadas (AD)': e.total_ad,
    'Custo (Meticais)': e.custo_total
  })) || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-semibold">Carregando indicadores do dashboard...</p>
      </div>
    );
  }

  const holidaysInMonth = getHolidaysForMonth(activeMonth);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Quadro de Avisos */}
      {((avisos && avisos.length > 0) || user?.role === 'ADMIN') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Megaphone size={120} />
          </div>
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-4 w-full">
              <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-600" />
                Quadro de Avisos da Direção
              </h3>
              
              {avisos.length === 0 ? (
                <p className="text-sm text-indigo-700/60 font-medium italic">Nenhum aviso ativo no momento.</p>
              ) : (
                <div className="space-y-2">
                  {avisos.map(aviso => (
                    <div key={aviso.id} className="bg-white/60 p-3 rounded-xl border border-indigo-100 text-sm text-indigo-950 font-medium">
                      {aviso.mensagem}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {user?.role === 'ADMIN' && (
              <button 
                onClick={() => setIsAvisosModalOpen(true)}
                className="bg-white text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 shrink-0 border border-indigo-200"
              >
                <Settings size={14} />
                Gerir Avisos
              </button>
            )}
          </div>
        </div>
      )}

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

      {holidaysInMonth.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 p-4 rounded-xl text-sm font-medium flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <span className="text-base">📅</span>
          <div>
            <p className="font-bold">Atenção: Feriado(s) em {meses[activeMonth - 1]}</p>
            <p className="text-xs text-sky-700 mt-0.5 leading-normal">
              Este mês contém os seguintes feriados: 
              <span className="font-bold">{holidaysInMonth.map(h => ` ${h.day} (${h.name})`).join(', ')}</span>. 
              Ao lançar as horas, lembre-se de considerar estes dias nas Aulas Programadas (AP).
            </p>
          </div>
        </div>
      )}

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
          title={user?.role === 'ADMIN' ? "Cursos Lecionados" : "Cursos Geridos"}
          value={stats.totalCursos}
          icon={BookOpen}
          description={user?.role === 'ADMIN' ? "Curso Nocturno Geral" : "Cursos sob sua gestão"}
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

      {/* Admin Analytics Section */}
      {user?.role === 'ADMIN' && analytics && (
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b pb-2">
            <TrendingUp className="text-primary" /> 
            Análise Anual de Desempenho e Custos ({activeYear})
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Evolução de Custos */}
            <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Evolução de Custos Salariais</h3>
              <div className="h-[250px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsEvolution} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value) => [`${value.toLocaleString('pt-MZ')} Mt`, 'Custo']} />
                    <Line type="monotone" dataKey="Custo (Meticais)" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AP vs AD */}
            <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Aulas Programadas vs Dadas</h3>
              <div className="h-[250px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsEvolution} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: 10, paddingTop: 10}} />
                    <Bar dataKey="Aulas Programadas (AP)" fill="#00acc1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Aulas Dadas (AD)" fill="#745af2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Ranking de Custos */}
          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Ranking Anual de Custos por Curso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.ranking.map((rank, index) => (
                <div key={rank.curso_id} className="flex items-center gap-4 bg-secondary/20 p-4 rounded-2xl border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : index === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' : index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-secondary text-muted-foreground'}`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight mb-1">{CURSO_NOME[rank.curso_id] || `Curso ${rank.curso_id}`}</p>
                    <p className="text-sm font-black text-primary">{rank.custo_total.toLocaleString('pt-MZ')} Mt</p>
                  </div>
                </div>
              ))}
              {analytics.ranking.length === 0 && (
                <p className="text-xs text-muted-foreground italic col-span-full">Sem dados financeiros registados para {activeYear}.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Basic Charts & Status lists (For everyone) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-3xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Distribuição Mês Atual</h3>
              <p className="text-xs text-muted-foreground">Visão geral do corpo docente e horas programadas neste mês</p>
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
              <p className="text-xs text-muted-foreground">Monitoria de folhas salariais do mês {meses[activeMonth - 1]}</p>
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
              to="/lancar-notas" 
              className="w-full py-3 bg-primary text-white text-xs font-bold rounded-2xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Realizar Lançamentos de Horas
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {isAvisosModalOpen && (
        <AvisosModal 
          onClose={() => setIsAvisosModalOpen(false)} 
          onAvisosChanged={fetchDashboardData}
        />
      )}

    </div>
  );
};

export default Dashboard;
