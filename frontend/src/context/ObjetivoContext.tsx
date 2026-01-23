import { useQuery } from '@tanstack/react-query';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

// 1. Definimos o que o nosso "balde de informações" vai guardar
interface ObjetivoContextType {
  objetivoId: string | null;
  setObjetivoId: (id: string) => void;
}

const ObjetivoContext = createContext<ObjetivoContextType | undefined>(undefined);

// 2. O Provedor (quem espalha a informação para os filhos)
export const ObjetivoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [objetivoId, setObjetivoIdState] = useState<string | null>(() => {
    // Tenta buscar do navegador se o usuário já escolheu antes
    return localStorage.getItem('objetivo_ativo_id');
  });

  const { data: todosObjetivos } = useQuery({
  queryKey: ['todos-objetivos'],
  queryFn: async () => {
    const { data } = await supabase.from('objetivos').select('*');
    return data || [];
  }
});

  const setObjetivoId = (id: string) => {
    setObjetivoIdState(id);
    localStorage.setItem('objetivo_ativo_id', id);
  };

  return (
    <ObjetivoContext.Provider value={{ objetivoId, setObjetivoId }}>
      {children}
    </ObjetivoContext.Provider>
  );
};

// 3. Hook personalizado para facilitar o uso nas telas
export const useObjetivoAtivo = () => {
  const context = useContext(ObjetivoContext);
  if (!context) {
    throw new Error('useObjetivoAtivo deve ser usado dentro de um ObjetivoProvider');
  }
  return context;
};