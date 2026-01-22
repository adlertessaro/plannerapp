import React, { useState, useEffect, useCallback } from 'react';
import { Target, CheckCircle2, Circle, Sparkles, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Objective } from '../../types/types';
import { generateMilestones } from '../../../../api/geminiService';
import { supabase } from '../../api/supabase';
import { useObjetivoAtivo } from '../../context/ObjetivoContext';

interface ObjectivesProps {
  objective: Objective | null;
}

interface MilestoneDB {
  id: string;
  objetivo_id: string;
  descricao: string;
  atingido: boolean;
  ordem: number;
}

const Objectives: React.FC = () => {
  const { objetivoId } = useObjetivoAtivo();
  const [milestones, setMilestones] = useState<MilestoneDB[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  const fetchMilestones = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('marcos')
        .select('*')
        .eq('objetivo_id', id)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error("Erro ao buscar marcos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Monitora o objetivoId. Assim que o Dashboard carregar, ele dispara a busca.
  useEffect(() => {
    if (objetivoId) {
      fetchMilestones(objetivoId);
    }
  }, [objetivoId, fetchMilestones]);

  const toggleMilestone = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('marcos')
        .update({ atingido: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, atingido: !currentStatus } : m));
    } catch (error) {
      console.error("Erro ao atualizar marco:", error);
    }
  };

  const deleteMilestone = async (id: string) => {
    try {
      const { error } = await supabase.from('marcos').delete().eq('id', id);
      if (error) throw error;
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error("Erro ao deletar marco:", error);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneText.trim() || !objetivoId) return;

    try {
      const { error } = await supabase.from('marcos').insert({
        objetivo_id: objetivoId,
        descricao: newMilestoneText,
        atingido: false,
        ordem: milestones.length
      });

      if (error) throw error;
      setNewMilestoneText('');
      setShowAddModal(false);
      fetchMilestones(objetivoId);
    } catch (error) {
      console.error("Erro ao criar marco:", error);
    }
  };

  const handleRetryAI = async () => {
    if (!objetivoId) return;
    setIsGenerating(true);
    try {
      const aiResult = await generateMilestones(
        "Objetivo Exemplo",
        "Descrição Exemplo",
        1000,
        "USD"
      );

      if (aiResult && aiResult.length > 0) {
        const novosMarcos = aiResult.map((m: any, index: number) => ({
          objetivo_id: objetivoId,
          descricao: m.title,
          atingido: false,
          ordem: milestones.length + index
        }));
        await supabase.from('marcos').insert(novosMarcos);
        fetchMilestones(objetivoId);
      }
    } catch (err) {
      alert("IA instável. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Se não tem objetivo, mostra apenas um estado vazio neutro em vez de travar
  if (!objetivoId) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-emerald-900">Trilha da Conquista</h1>
        <div className="flex gap-2">
          {milestones.length === 0 && !isLoading && (
            <button 
              onClick={handleRetryAI}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              IA: Gerar Marcos
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold"
          >
            <Plus size={18} /> Novo Passo
          </button>
        </div>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm relative overflow-hidden">
        <div className="relative ml-6">
          {milestones.length > 0 && (
            <div className="absolute left-6 top-10 bottom-10 w-1 bg-gradient-to-b from-emerald-600 to-emerald-50 rounded-full" />
          )}

          <div className="space-y-8">
            {isLoading ? (
              <div className="text-center py-10 text-emerald-300"><Loader2 className="animate-spin mx-auto" /></div>
            ) : milestones.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-emerald-400 italic">Sua trilha está vazia.</p>
              </div>
            ) : (
              milestones.map((ms) => (
                <div key={ms.id} className="flex gap-8 group relative">
                  <button 
                    onClick={() => toggleMilestone(ms.id, ms.atingido)}
                    className={`z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                      ms.atingido 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                        : 'bg-white border-2 border-emerald-200 text-emerald-100 hover:border-emerald-400'
                    }`}
                  >
                    {ms.atingido ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>

                  <div className={`flex-1 p-6 rounded-[2rem] border transition-all flex items-start justify-between ${
                    ms.atingido 
                      ? 'bg-emerald-50/40 border-transparent opacity-70' 
                      : 'bg-white border-emerald-50 shadow-sm hover:border-emerald-200'
                  }`}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-1">Passo {ms.ordem + 1}</span>
                      <h4 className={`text-lg font-bold ${ms.atingido ? 'line-through text-emerald-900/50' : 'text-emerald-900'}`}>
                        {ms.descricao}
                      </h4>
                    </div>
                    <button onClick={() => deleteMilestone(ms.id)} className="text-red-100 hover:text-red-500 p-2">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-8 flex justify-between items-center text-white">
              <h2 className="text-2xl font-bold">Novo Marco</h2>
              <button onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddManual} className="p-8 space-y-6">
              <textarea 
                required
                value={newMilestoneText}
                onChange={e => setNewMilestoneText(e.target.value)}
                className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none"
                placeholder="Descreva o passo..."
              />
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg">
                Adicionar Marco
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Objectives;