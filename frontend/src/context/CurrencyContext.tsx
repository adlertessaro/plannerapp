// src/context/CurrencyContext.tsx - VERSÃO QUE FUNCIONA
import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import { Currency } from '../types/types';

interface CurrencyContextType {
  userCurrency: Currency;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: userCurrency, isLoading } = useQuery({
    queryKey: ['userCurrency'],
    queryFn: async () => {
      // Pega user logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        console.log('🚫 No user logged in');
        return 'BRL' as Currency;  // Default se não tem user
      }

      // Busca perfil do user
      const { data, error } = await supabase
        .from('perfis')
        .select('moeda_padrao')
        .eq('id', user.id)  // ← user.id garantido agora
        .single();

      if (error) {
        console.error('❌ Erro perfis:', error);
        return 'BRL' as Currency;
      }

      console.log('💰 User currency:', data?.moeda_padrao || 'BRL');  // Debug
      return (data?.moeda_padrao || 'BRL') as Currency;
    },
    staleTime: 5 * 60 * 1000,  // 5 min cache
  });

  return (
    <CurrencyContext.Provider value={{ 
      userCurrency: userCurrency || 'BRL', 
      isLoading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useUserCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useUserCurrency deve estar dentro de CurrencyProvider');
  return context;
};
