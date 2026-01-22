import React, { useState, useEffect, FormEvent } from 'react';
import { User, Target, Bell, Globe, Plus, Trash2, X, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../api/supabase';
import { Cambio, UserProfile, Currency } from '../../types/types';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { error } from 'console';
import { createClient } from '@supabase/supabase-js';

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Estados para as Modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal de Objetivo
  
  // Estados do formulário de Objetivo (Copiados de GoalSelection.tsx)
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

  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '',
    role: 'ver' as 'admin' | 'ver' | 'editor' 
  });
  const [editNome, setEditNome] = useState('');

  const [newPassword, setNewPassword] = useState('');

  // --- QUERIES ---

  const { data: perfil } = useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('perfis').select('*').eq('id', user.id).single();
      return data;
    }
  });

  const { data: taxas } = useQuery({
    queryKey: ['taxas-cambio'],
    queryFn: async () => {
      const { data } = await supabase.from('cambios').select('*').order('id', { ascending: false }).limit(1).single();
      return data as Cambio;
    }
  });

  const { data: objetivos = [], isLoading: loadingObjs } = useQuery({
  queryKey: ['objetivos'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase.from('objetivos').select('*');

    // Se NÃO for admin, filtramos apenas os objetivos do próprio usuário
    // Se for admin, a query trará todos do banco conforme solicitado
    if (perfil?.permissao !== 'admin') {
      query = query.eq('usuario_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar objetivos:", error.message);
      throw error;
  }
    return data || [];
  },
  
  enabled: !!perfil // Só executa quando tivermos as permissões do perfil
});

  const { data: listaUsuarios = [] } = useQuery({
    queryKey: ['usuarios-sistema'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('*').order('nome', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // --- MUTATIONS ---

  const mutationUpdatePerfil = useMutation({
    mutationFn: async (updates: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('perfis').update(updates).eq('id', user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['perfil'] })
  });

  const mutationAddObj = useMutation({
  mutationFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const valorTratado = parseFloat(valorMeta.replace(/\./g, '').replace(',', '.'));

    const novoObjetivo = {
      usuario_id: user.id,
      titulo: titulo, 
      descricao: descricao,
      valor_meta: valorTratado,
      moeda_alvo: moedaAlvo,
      tipo: tipoMeta,
      prazo_meta: prazoMeta,
      status: 'ativo'
    };

    const { error } = await supabase.from('objetivos').insert([novoObjetivo]);
    if (error) throw error;
  },
  onSuccess: () => {
    // 1. Invalida a query para atualizar a lista na tela
    queryClient.invalidateQueries({ queryKey: ['objetivos'] });
    
    // 2. Fecha a modal
    setIsModalOpen(false);
    
    // 3. Limpa os campos do formulário
    setTitulo('');
    setDescricao('');
    setValorMeta('');
    setTipoMeta('Outro');
    
    alert("Objetivo criado com sucesso!");
  },
  onError: (error: any) => alert("Erro ao criar: " + error.message)
});

  const mutationAddUser = useMutation({
    mutationFn: async () => {
      // 1. Criar um cliente temporário que NÃO salva sessão no navegador
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      // 2. Realizar o signUp com o cliente temporário
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { nome: newUser.name } }
      });

      if (authError) throw authError;

      // 3. Usar o cliente PRINCIPAL (o do Admin) para inserir o perfil
      // O admin mantém a sessão e tem permissão de RLS para inserir na tabela 'perfis'
      if (authData.user) {
        const { error: profileError } = await supabase.from('perfis').insert([{
          id: authData.user.id,
          nome: newUser.name,
          email: newUser.email,
          permissao: newUser.role,
          moeda_padrao: 'BRL'
        }]);
        
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] });
      setShowUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'ver' });
      alert("Usuário criado com sucesso! O administrador continua logado.");
    },
    onError: (error: any) => alert("Erro: " + error.message)
  });

  // 2. Definição do Handler (Fora da mutation, dentro do componente)
  const handleCriarUsuario = (event: React.FormEvent) => {
    event.preventDefault();
    mutationAddUser.mutate();
  };

  const mutationDelObj = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('objetivos').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['objetivos'] })
  });

  const mutationSyncCambio = useMutation({
    mutationFn: async ({ usd, eur }: { usd: number, eur: number }) => {
      const { data: currentTaxas } = await supabase.from('cambios').select('id').order('id', { ascending: false }).limit(1).single();
      const payload = {
        valor_br: 1,
        valor_usd: 1 / usd,
        valor_eur: 1 / eur,
        update_at: new Date().toISOString()
      };
      if (currentTaxas?.id) {
        await supabase.from('cambios').update(payload).eq('id', currentTaxas.id);
      } else {
        await supabase.from('cambios').insert([payload]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taxas-cambio'] })
  });

  // --- API CÂMBIO ---
  useEffect(() => {
    const fetchTurismoRates = async () => {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRLT,EUR-BRLT');
        const data = await response.json();
        if (data.USDBRLT && data.EURBRLT) {
          mutationSyncCambio.mutate({
            usd: parseFloat(data.USDBRLT.bid),
            eur: parseFloat(data.EURBRLT.bid)
          });
        }
      } catch (error) { console.error("Erro ao buscar câmbio:", error); }
    };
    fetchTurismoRates();
  }, []);

  useEffect(() => {
    if (perfil?.nome) setEditNome(perfil.nome);
  }, [perfil]);

  const isAdmin = perfil?.permissao === 'admin';
  const canEdit = perfil?.permissao === 'admin' || perfil?.permissao === 'editor';

  function handleCriarObjetivo(event: FormEvent) {
    event.preventDefault();
    mutationAddObj.mutate();
  }

  const mutationUpdatePassword = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword('');
      alert("Senha atualizada com sucesso!");
    },
    onError: (error: any) => alert("Erro ao atualizar senha: Necessário 6 digitos")
  });

  const mutationChanceRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string, newRole: 'admin' | 'ver' | 'editor' }) => {
      const { error } = await supabase.from('perfis').update({ permissao: newRole }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] });
      alert("Permissão alterada com sucesso!");
    },
    onError: (error: any) => alert("Erro ao alterar permissão: " + error.message)
  });

  // Estados para alteração de senha por admin
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [roleNew, setRoleNew] = useState<'admin' | 'ver' | 'editor'>('ver');

  // Mutação para Admin alterar senha de terceiros
  const mutationAdminChangePassword = useMutation({
    mutationFn: async ({ userId, newPassword, roleNew }: { userId: string, newPassword: string, roleNew: 'admin' | 'ver' | 'editor' }) => {
      // Isso chama o 'segurança' (Edge Function) que você enviou para a nuvem
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { userId, newPassword, roleNew },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      alert("Senha alterada com sucesso!");
      setSelectedUser(null); // Fecha a modal de senha
      setAdminNewPassword(''); // Limpa o campo
    },
    onError: (error: any) => {
      alert("Erro ao trocar senha: " + error.message);
    }
  });
  
  const mutationDeleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Note: Assim como na troca de senha, a exclusão de Auth exige uma Edge Function
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] });
      alert("Usuário removido com sucesso!");
    },
    onError: (error: any) => alert("Erro ao excluir usuário: " + error.message)
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Configurações</h1>
          <p className="text-emerald-600">Gerencie seu perfil e taxas de câmbio turismo</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Câmbio Atualizado via API</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-emerald-50">
              <div className="w-24 h-24 bg-emerald-600 rounded-[2rem] shadow-lg flex items-center justify-center text-white text-4xl font-black shrink-0">
                {perfil?.nome?.charAt(0) || 'U'}
              </div>
              <div className="text-center md:text-left flex-1 space-y-2">
                <input 
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  onBlur={() => mutationUpdatePerfil.mutate({ nome: editNome })}
                  className="bg-transparent text-xl font-bold text-emerald-900 border-b border-transparent focus:border-emerald-300 outline-none w-full"
                />
                <select 
                  value={perfil?.moeda_padrao || 'BRL'} 
                  onChange={(e) => mutationUpdatePerfil.mutate({ moeda_padrao: e.target.value })}
                  className="w-full max-w-xs bg-emerald-50/50 border border-emerald-100 rounded-2xl px-4 py-3 text-emerald-900 outline-none font-bold appearance-none"
                >
                  <option value="BRL">Real (BRL) - 🇧🇷</option>
                  <option value="USD">Dólar (USD) - 🇺🇸</option>
                  <option value="EUR">Euro (EUR) - 🇪🇺</option>
                </select>
                <div className="flex justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">{perfil?.permissao || 'ver'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                <Target className="text-emerald-500" size={24} /> 
                {isAdmin ? 'Gerenciar Objetivos do Sistema' : 'Meus Objetivos'}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loadingObjs ? (
                  <div className="col-span-full flex justify-center py-4">
                    <Loader2 className="animate-spin text-emerald-500" />
                  </div>
                ) : objetivos.length > 0 ? (
                  objetivos.map((obj: any) => (
                    <div key={obj.id} className="group flex items-center justify-between p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100 hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                          <Target size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-emerald-900">{obj.titulo}</span>
                          {isAdmin && (
                            <span className="text-[10px] text-emerald-400 font-medium">ID: {obj.usuario_id.slice(0,8)}...</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Botão de excluir visível apenas para Admin */}
                      {isAdmin && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir o objetivo "${obj.titulo}"?`)) {
                              mutationDelObj.mutate(obj.id);
                            }
                          }} 
                          disabled={mutationDelObj.isPending}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir objetivo"
                        >
                          {mutationDelObj.isPending ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-emerald-400 text-sm py-4">Nenhum objetivo encontrado.</p>
                )}

                {canEdit && (
                  <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="flex items-center justify-center gap-2 p-5 border-2 border-dashed border-emerald-200 rounded-3xl text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                  >
                    <Plus size={20} /> Novo Objetivo
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                <User className="text-emerald-500" size={24} /> Usuários do Sistema
              </h3>
              {isAdmin && (
                <button onClick={() => setShowUserModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">
                  Adicionar
                </button>
              )}
            </div>
            <div className="space-y-3">
              {listaUsuarios.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-emerald-50 rounded-2xl group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                      {u.nome?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">{u.nome}</p>
                      <p className="text-xs text-emerald-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-3 py-1 text-[10px] font-black uppercase rounded-lg bg-emerald-100 text-emerald-700 mr-2">
                      {u.permissao}
                    </span>
                    
                    {isAdmin && (
                      <>
                        {/* BOTÃO EDITAR: carrega a permissão atual para não induzir ao erro */}
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setRoleNew(u.permissao); // Carrega a permissão real do usuário no estado
                            setAdminNewPassword('');
                          }}
                          className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar Usuário"
                        >
                          <RefreshCw size={18} />
                        </button>

                        {/* BOTÃO EXCLUIR: Só aparece se o ID for diferente do usuário logado */}
                        {u.id !== perfil?.id && (
                          <button 
                            onClick={() => {
                              if (window.confirm(`Tem certeza que deseja remover ${u.nome}? Esta ação é irreversível.`)) {
                                mutationDeleteUser.mutate(u.id);
                              }
                            }}
                            disabled={mutationDeleteUser.isPending}
                            className="p-2 text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Excluir Usuário"
                          >
                            {mutationDeleteUser.isPending ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-6">
              <Globe className="text-emerald-500" size={20} /> Câmbio Turismo
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase">Dólar Turismo</span>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">
                    R$ {taxas?.valor_usd ? (1 / taxas.valor_usd).toFixed(2) : '...'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500">→ $ 1.00</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase">Euro Turismo</span>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">
                    R$ {taxas?.valor_eur ? (1 / taxas.valor_eur).toFixed(2) : '...'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500">→ € 1.00</span>
                </div>
              </div>
            </div>
          </section>

          {/* <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-6">
              <Bell className="text-emerald-500" size={20} /> Notificações
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-emerald-900">Alertas de Prazos</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-emerald-600" />
            </label>
          </section> */}
          <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
              <RefreshCw className="text-emerald-500" size={20} /> Segurança
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-emerald-600 font-medium">Alterar minha senha</p>
              <input 
                type="password" 
                placeholder="Nova senha"
                className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-sm outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button 
                onClick={() => mutationUpdatePassword.mutate(newPassword)}
                disabled={!newPassword || mutationUpdatePassword.isPending}
                className="w-full bg-emerald-100 text-emerald-700 font-bold py-2 rounded-xl text-xs hover:bg-emerald-200 transition-colors"
              >
                Atualizar Senha
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE OBJETIVO (IDÊNTICA AO GOALSELECTION.TSX) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#059669] p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold">Novo Plano</h2>
                <p className="text-emerald-100 text-sm">Configure sua próxima meta</p>
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
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0,00"
                    value={valorMeta}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, ''); // só números

                      if (v === '') {
                        setValorMeta('');
                        return;
                      }

                      // remove zeros à esquerda (mas deixa um se tudo for zero)
                      v = v.replace(/^0+(?=\d)/, '');

                      if (v.length === 1) {
                        setValorMeta(`0,0${v}`);
                      } else if (v.length === 2) {
                        setValorMeta(`0,${v}`);
                      } else {
                        const inteiro = v.slice(0, -2);
                        const decimal = v.slice(-2);
                        setValorMeta(`${inteiro},${decimal}`);
                      }
                    }}
                    className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Tipo da Meta</label>
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
                disabled={mutationAddObj.isPending}
                className="w-full bg-[#059669] hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {mutationAddObj.isPending ? <Loader2 className="animate-spin" size={20} /> : 'Começar Planejamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE USUÁRIO */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-8 flex justify-between items-center text-white">
              <h2 className="text-2xl font-bold">Novo Usuário</h2>
              <button onClick={() => setShowUserModal(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4">
              <input 
                type="text" placeholder="Nome Completo"
                className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
              />
              <input 
                type="email" placeholder="E-mail"
                className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
              />
              <input 
                type="password" placeholder="Definir Senha Inicial"
                className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newUser.password} 
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
              <select className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="ver">Visualizador</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </select>
              <button onClick={() => mutationAddUser.mutate()} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">
                Salvar no Banco
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-[#059669] p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold">Editar Usuário</h2>
                <p className="text-emerald-100 text-sm">Alterando: {selectedUser.nome}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Nova Senha (opcional)</label>
                <input 
                  type="password"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Deixe em branco para manter a atual"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase ml-2 mb-1 block">Permissão</label>
                <select 
                  value={roleNew}
                  onChange={(e) => setRoleNew(e.target.value as any)}
                  // Bloqueia o campo se o admin estiver editando a si mesmo
                  disabled={selectedUser.id === perfil?.id}
                  className={`w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 ${
                    selectedUser.id === perfil?.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="ver">Visualizador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
                {selectedUser.id === perfil?.id && (
                  <p className="text-[10px] text-red-400 mt-1 ml-2 italic">Você não pode alterar sua própria permissão.</p>
                )}
              </div>
              <button 
                onClick={() => mutationAdminChangePassword.mutate({ 
                  userId: selectedUser.id, 
                  newPassword: adminNewPassword,
                  roleNew: roleNew,
                })}
                // O botão só fica desativado se nada for alterado (senha vazia E role igual à original)
                disabled={mutationAdminChangePassword.isPending || (adminNewPassword === '' && roleNew === selectedUser.permissao)}
                className="w-full bg-[#059669] hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutationAdminChangePassword.isPending ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;