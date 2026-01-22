import React, { useEffect, useState } from 'react';
import { Objective, Transaction } from '../../types/types'; // Ajuste o caminho se necessário
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../../api/supabase';
import { useObjetivoAtivo } from '../../context/ObjetivoContext';

const Dashboard: React.FC = () => {
  const { objetivoId } = useObjetivoAtivo(); 
  const [objective, setObjective] = useState<Objective | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para dados dos gráficos e cálculos
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalPoupado, setTotalPoupado] = useState(0);
  const [faltam, setFaltam] = useState(0);

  useEffect(() => {
    if (objetivoId) {
      fechDadosObjetivo(objetivoId);
    } else {
      setLoading(false);
    }
  }, [objetivoId]);

  const fechDadosObjetivo = async (id: string) => {
    setLoading(true);
    try {
      // 1. Busca o Objetivo
      const { data: objData, error: objError } = await supabase
        .from('objetivos')
        .select('*')
        .eq('id', id)
        .single();

      if (objError) throw objError;

      // 2. Busca as Transações
      const { data: transData, error: transError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('objetivo_id', id);

      if (transError) throw transError;

      const transactions = (transData as Transaction[]) || [];

      // --- PROCESSAMENTO PARA O LAYOUT ---
      
      // Cálculos de Saldo
      const entradas = transactions.filter(t => t.tipo === 'income').reduce((acc, t) => acc + Number(t.valor), 0);
      const saidas = transactions.filter(t => t.tipo === 'expense').reduce((acc, t) => acc + Number(t.valor), 0);
      const saldoReal = entradas - saidas;
      
      setTotalPoupado(saldoReal);
      setFaltam(Math.max(Number(objData.valor_meta) - saldoReal, 0));
      setObjective(objData);

      // Histórico de Poupança (Agrupado por data para o AreaChart)
      if (transactions.length > 0) {
        const history = transactions
          .sort((a, b) => new Date(a.data_transacao).getTime() - new Date(b.data_transacao).getTime())
          .map(t => ({
            name: new Date(t.data_transacao).toLocaleDateString('pt-BR', { month: 'short' }),
            value: Number(t.valor)
          }));
        setHistoryData(history);
      } else {
        setHistoryData([{ name: 'Início', value: 0 }]);
      }

      // Distribuição de Gastos (PieChart)
      const categoriesMap = transactions
        .filter(t => t.tipo === 'expense')
        .reduce((acc: any, t) => {
          acc[t.categoria] = (acc[t.categoria] || 0) + 1;
          return acc;
        }, {});

      const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7'];
      const formattedCats = Object.keys(categoriesMap).map((name, i) => ({
        name,
        value: categoriesMap[name],
        color: colors[i % colors.length]
      }));
      setCategoryData(formattedCats);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-emerald-600">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="font-bold">Carregando dados...</p>
    </div>
  );

  if (!objective) return (
    <div className="p-12 text-center bg-white rounded-[2.5rem] border border-emerald-100">
      <p className="text-emerald-600 font-bold">Nenhum objetivo selecionado.</p>
    </div>
  );

  const progressPercent = Math.min(Math.round((totalPoupado / objective.valor_meta) * 100), 100);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">{objective.titulo}</h1>
          <p className="text-emerald-600">Visão geral do seu progresso financeiro</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-3">
          <Calendar className="text-emerald-500" size={20} />
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Meta Final</p>
            <p className="text-sm font-semibold text-emerald-900">
                {objective.prazo_meta ? new Date(objective.prazo_meta + 'T00:00:00').toLocaleDateString('pt-BR') : '---'}
            </p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Total Poupado</p>
            <h3 className="text-2xl font-bold text-emerald-900">
                {totalPoupado.toLocaleString('pt-BR', { style: 'currency', currency: objective.moeda_alvo || 'BRL' })}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-400">Faltam</p>
            <h3 className="text-2xl font-bold text-amber-900">
                {faltam.toLocaleString('pt-BR', { style: 'currency', currency: objective.moeda_alvo || 'BRL' })}
            </h3>
          </div>
        </div>
        <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-100 text-white flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-100">Progresso Geral</p>
            <h3 className="text-2xl font-bold">{progressPercent}%</h3>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-emerald-900">Progresso da Meta</h3>
          <span className="text-emerald-600 font-bold">{progressPercent}% concluído</span>
        </div>
        <div className="w-full h-4 bg-emerald-50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-600 rounded-full transition-all duration-1000 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-emerald-100">
          <h3 className="text-lg font-bold text-emerald-900 mb-6">Histórico de Poupança</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100 flex flex-col">
          <h3 className="text-lg font-bold text-emerald-900 mb-6">Distribuição de Gastos</h3>
          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={80}
                  paddingAngle={5} dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {categoryData.length > 0 ? categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-emerald-700 font-medium">{cat.name}</span>
                </div>
                <span className="text-sm font-bold text-emerald-900">{cat.value} trans.</span>
              </div>
            )) : (
                <p className="text-xs text-center text-emerald-400">Nenhuma despesa registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;