import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, ChevronRight, X, Loader2 } from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useObjetivoAtivo } from '../../context/ObjetivoContext';
import { Objective, Currency } from '../../types/types';
import { generateMilestones } from '../../../../api/geminiService';

const GoalSelection: React.FC = () => {
  const [objetivos, setObjetivos] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setObjetivoId } = useObjetivoAtivo();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorMeta, setValorMeta] = useState('');
  const [moedaAlvo, setMoedaAlvo] = useState<Currency>('BRL');
  const [tipoMeta, setTipoMeta] = useState('Outro');
  
  const hoje = new Date();
  const hoje_new = new Date(hoje);
  hoje_new.setDate(hoje.getDate() + 1);
  const iso = hoje_new.toLocaleDateString('en-CA');
  const [prazoMeta, setPrazoMeta] = useState(iso);

  useEffect(() => {
    fetchObjetivos();
  }, []);

  const fetchObjetivos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('objetivos')
        .select('*')
        .eq('usuario_id', user.id);
      
      if (!error && data) setObjetivos(data);
    }
    setLoading(false);
  };

  const handleCriarObjetivo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Iniciando criação de objetivo...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada.");

      const valorNumerico = parseFloat(valorMeta.replace(/\./g, '').replace(',', '.'));

      const { data: objetivoSalvo, error: errorObj } = await supabase
        .from('objetivos')
        .insert([{
          usuario_id: user.id,
          titulo, 
          descricao,
          valor_meta: valorNumerico,
          moeda_alvo: moedaAlvo,
          tipo: tipoMeta,
          prazo_meta: prazoMeta,
        }])
        .select()
        .single();

      if (errorObj) throw errorObj;
      console.log("Objetivo criado com ID:", objetivoSalvo.id);

      // --- TENTATIVA DE IA ---
      try {
        console.log("Chamando IA para gerar marcos...");
        const aiResult = await generateMilestones(
          objetivoSalvo.titulo,
          objetivoSalvo.descricao || '',
          objetivoSalvo.valor_meta,
          objetivoSalvo.moeda_alvo
        );

        if (aiResult && aiResult.length > 0) {
          console.log("IA gerou marcos:", aiResult);
          const marcosParaInserir = aiResult.map((m: any, index: number) => ({
            objetivo_id: objetivoSalvo.id,
            descricao: m.title,
            atingido: false,
            ordem: index
          }));
          
          const { error: errorMarcos } = await supabase.from('marcos').insert(marcosParaInserir);
          if (errorMarcos) throw errorMarcos;
          console.log("Marcos inseridos com sucesso.");
        }
      } catch (aiErr) {
        console.error("Erro na IA:", aiErr);
        alert("O objetivo foi criado, mas a IA falhou ao gerar os marcos. Você pode gerá-los manualmente no painel.");
      }

      setTitulo(''); setDescricao(''); setValorMeta('');
      setIsModalOpen(false);
      fetchObjetivos(); 
    } catch (err: any) {
      console.error("Erro geral:", err);
      alert("Erro ao criar objetivo: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selecionar = (id: string) => {
    setObjetivoId(id);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-emerald-600 font-bold">Carregando seus planos...</div>;

  return (
    <div className="min-h-screen bg-emerald-50 p-6 md:p-12 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-4">
          <button onClick={handleLogout} className="text-emerald-600 hover:text-emerald-800 font-medium">Sair</button>
        </div>
        
        <header className="mb-12">
          <h1 className="text-4xl font-black text-emerald-900 mb-2">Qual o plano de hoje?</h1>
          <p className="text-emerald-600 font-medium">Selecione um objetivo para gerenciar suas finanças.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group border-2 border-dashed border-emerald-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-white transition-all min-h-[250px]"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <span className="font-bold text-emerald-700 uppercase tracking-widest text-sm">Novo Objetivo</span>
          </button>

          {objetivos.map((obj) => (
            <div 
              key={obj.id}
              onClick={() => selecionar(obj.id)}
              className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-emerald-100/50 border border-emerald-50 hover:border-emerald-500 cursor-pointer group transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 text-emerald-100 group-hover:text-emerald-500 transition-colors">
                <Target size={40} strokeWidth={1} />
              </div>

              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Objetivo Ativo</span>
                <h3 className="text-2xl font-black text-emerald-900 mt-1">{obj.titulo}</h3>
              </div>

              <div className="flex items-center gap-3 text-emerald-600 font-bold mb-8">
                <div className="px-3 py-1 bg-emerald-50 rounded-full text-xs uppercase tracking-tighter">
                  {obj.moeda_alvo}
                </div>
                <span className="text-sm">
                  Meta: {obj.valor_meta.toLocaleString('pt-BR', { style: 'currency', currency: obj.moeda_alvo })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-emerald-50">
                <span className="text-xs font-bold text-emerald-300 uppercase">Acessar Painel</span>
                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#059669] p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold">Novo Plano</h2>
                <p className="text-emerald-100 text-sm">A IA criará seus marcos automaticamente</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCriarObjetivo} className="p-8 space-y-5">
              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Título do Objetivo</label>
                <input 
                  type="text" required placeholder="Ex: Eurotrip 2026"
                  value={titulo} onChange={e => setTitulo(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Valor da Meta</label>
                <div className="flex gap-2">
                  <select 
                    value={moedaAlvo} onChange={e => setMoedaAlvo(e.target.value as Currency)}
                    className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={valorMeta}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v === '') { setValorMeta(''); return; }
                      v = (parseInt(v) / 100).toFixed(2).replace('.', ',');
                      setValorMeta(v.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                    }}
                    className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Tipo & Prazo</label>
                <div className="flex gap-2">
                  <select 
                    value={tipoMeta} onChange={e => setTipoMeta(e.target.value)}
                    className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Viagem">Viagem</option>
                    <option value="Compra">Compra</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <input 
                    type="date"
                    value={prazoMeta} onChange={e => setPrazoMeta(e.target.value)}
                    className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Descrição (Opcional)</label>
                <textarea 
                  value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Viagem de 15 dias visitando Portugal e Itália"
                  rows={2} className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#059669] hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Começar Planejamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalSelection;