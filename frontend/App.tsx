import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './src/components/Layout';
import Login from './src/features/auth/Login';
import GoalSelection from './src/features/objetivos/GoalSelection';
import Dashboard from './src/features/dashboard/Dashboard';
import Finance from './src/features/financeiro/Finance';
import { ObjetivoProvider, useObjetivoAtivo } from './src/context/ObjetivoContext';
import { supabase } from './src/api/supabase';
import { useState as useLocalState } from 'react';
import { Objective } from './src/types/types';
import Documents from './src/features/documentos/Documents';
import Settings from './src/features/perfil/Settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Objectives from './src/features/objetivos/Objectives';

// --- COMPONENTES DE PROTEÇÃO DE ROTA ---

const RotaObjetivoProtegida = ({ children }: { children: React.ReactNode }) => {
  const { objetivoId } = useObjetivoAtivo();
  return objetivoId ? <>{children}</> : <Navigate to="/selecionar-objetivo" replace />;
};

const RotaAutenticada = ({ children, loggedIn }: { children: React.ReactNode; loggedIn: boolean | null }) => {
  if (loggedIn === false) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RotaPublica = ({ children, loggedIn }: { children: React.ReactNode; loggedIn: boolean | null }) => {
  if (loggedIn === true) return <Navigate to="/selecionar-objetivo" replace />;
  return <>{children}</>;
};

// --- WRAPPER PARA O LAYOUT ---

const InternalLayout = ({ children }: { children: React.ReactNode }) => {
  const { objetivoId, setObjetivoId } = useObjetivoAtivo();
  const [objectiveName, setObjectiveName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchObjectiveName = async () => {
      if (!objetivoId) return;

      const { data, error } = await supabase
        .from('objetivos')
        .select('titulo')
        .eq('id', objetivoId)
        .maybeSingle(); // Não gera erro se encontrar 0 linhas

      if (error || !data) {
        // Se o ID for inválido ou não existir no banco, limpa e redireciona
        setObjetivoId(null);
        navigate('/selecionar-objetivo');
        return;
      }
      
      setObjectiveName(data.titulo);
    };
    fetchObjectiveName();
  }, [objetivoId, setObjetivoId, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleClearObjective = () => {
    setObjetivoId(null);
    navigate('/selecionar-objetivo');
  };

  return (
    <Layout 
      selectedObjectiveName={objectiveName} 
      onClearObjective={handleClearObjective} 
      onLogout={handleLogout}
    >
      {children}
    </Layout>
  );
};

const queryClient = new QueryClient();

// --- COMPONENTE PRINCIPAL ---

// Loader component to fetch Objective by id and render Finance

function FinanceLoader({ objetivoId }: { objetivoId: string | null }) {
  const [objective, setObjective] = useLocalState<Objective | null>(null);
  const [loading, setLoading] = useLocalState(true);
  const { setObjetivoId } = useObjetivoAtivo(); // Importe para limpar se necessário

  useEffect(() => {
    const fetchObjective = async () => {
      if (!objetivoId) return;
      
      const { data, error } = await supabase
        .from('objetivos')
        .select('*')
        .eq('id', objetivoId)
        .maybeSingle();

      if (error || !data) {
        setObjetivoId(null);
        return;
      }

      setObjective(data as Objective);
      setLoading(false);
    };
    fetchObjective();
  }, [objetivoId, setObjetivoId]);

  if (loading || !objective) {
    return <div className="flex h-screen items-center justify-center text-emerald-600 font-bold">Carregando...</div>;
  }

  return <Finance objective={objective} />;
}

function DocumentsLoader({ objetivoId }: { objetivoId: string | null }) {
  const [objective, setObjective] = useState<Objective | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObjective = async () => {
      if (!objetivoId) return;
      const { data } = await supabase
        .from('objetivos')
        .select('*')
        .eq('id', objetivoId)
        .single();
      setObjective(data as Objective);
      setLoading(false);
    };
    fetchObjective();
  }, [objetivoId]);

  if (loading || !objective) {
    return <div className="flex h-screen items-center justify-center text-emerald-600 font-bold">Carregando...</div>;
  }

  // Adapte para o tipo esperado em Documents
  return <Documents objetivoSelecionado={{ id: objective.id, nome: objective.titulo }} />;
}

function AppContent() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { objetivoId } = useObjetivoAtivo();

  const checkLoginStatus = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setLoggedIn(data.session !== null);
  }, []);

  useEffect(() => {
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setLoggedIn(session !== null);
      if (event === 'SIGNED_OUT') navigate('/login');
    });

    return () => subscription.unsubscribe();
  }, [checkLoginStatus, navigate]);

  if (loggedIn === null) {
    return <div className="flex h-screen items-center justify-center text-emerald-600 font-bold">Carregando...</div>;
  }

  return (
    <Routes>
      {/* Rotas sem Layout (Login e Seleção) */}
      <Route path="/login" element={
        <RotaPublica loggedIn={loggedIn}>
          <Login onLogin={() => setLoggedIn(true)} />
        </RotaPublica>
      } />

      <Route path="/selecionar-objetivo" element={
        <RotaAutenticada loggedIn={loggedIn}>
          <GoalSelection />
        </RotaAutenticada>
      } />

      {/* Rotas Internas com Layout e Proteção */}
      <Route path="/dashboard" element={
        <RotaAutenticada loggedIn={loggedIn}>
          <RotaObjetivoProtegida>
            <InternalLayout>
              <Dashboard objetivoId={objetivoId} />
            </InternalLayout>
          </RotaObjetivoProtegida>
        </RotaAutenticada>
      } />

      {/* Rota Financeiro com Loader */}
      <Route path="/financeiro" element={
        <RotaAutenticada loggedIn={loggedIn}>
          <RotaObjetivoProtegida>
            <InternalLayout>
              <FinanceLoader objetivoId={objetivoId} />
            </InternalLayout>
          </RotaObjetivoProtegida>
        </RotaAutenticada>
      } />

      <Route path="/documentos" element={
        <RotaAutenticada loggedIn={loggedIn}>
          <RotaObjetivoProtegida>
            <InternalLayout>
              <DocumentsLoader objetivoId={objetivoId} />
            </InternalLayout>
          </RotaObjetivoProtegida>
        </RotaAutenticada>
      } />

      <Route path="/marcos" element={
        <RotaAutenticada loggedIn={loggedIn}>
          <RotaObjetivoProtegida>
            <InternalLayout>
              <Objectives objetivoId={objetivoId} />
            </InternalLayout>
          </RotaObjetivoProtegida>
        </RotaAutenticada>
      } />

      <Route path="/ajustes" element={
        <RotaAutenticada loggedIn={loggedIn}>
          <RotaObjetivoProtegida>
          <InternalLayout>
            <Settings objetivoId={objetivoId} />
          </InternalLayout>
          </RotaObjetivoProtegida>
        </RotaAutenticada>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// Export final com os Providers necessários
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ObjetivoProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </ObjetivoProvider>
    </QueryClientProvider>
  );
}