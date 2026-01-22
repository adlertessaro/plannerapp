
import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, MoreHorizontal, X } from 'lucide-react';
import { Transaction, Objective, Currency } from '../../types/types';
import { CURRENCIES, CATEGORIES, EXCHANGE_RATES } from '../../../src/constants';
import { supabase } from '../../api/supabase';

interface FinanceProps {
  objective: Objective;
}

const Finance: React.FC<FinanceProps> = ({ objective }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewCurrency, setViewCurrency] = useState<Currency>('BRL');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTx, setNewTx] = useState({
    description: '',
    amount: '',
    currency: 'BRL' as Currency,
    type: 'income' as 'income' | 'expense',
    category: 'Outros'
  });

  useEffect(() => {
    if (objective?.id) fechTransactions();
  }, [objective?.id]);

  const fechTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('objetivo_id', objective.id);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  //salvar transação no bando
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newTx.amount.replace(',', '.'));

    console.log("Dados para inserção:", {
    descricao: newTx.description,
    valor: amountNum,
    objetivo_id: objective?.id
  });

    if (!newTx.description || isNaN(amountNum) || !objective?.id) return;

    try {
      const currentExchangeRate = EXCHANGE_RATES[newTx.currency] || 1;
      const { data, error } = await supabase
        .from('transacoes')
        .insert({
          objetivo_id: objective.id,
          valor: amountNum,
          tipo: newTx.type,
          moeda: newTx.currency,
          categoria: newTx.category,
          descricao: newTx.description,
          data_transacao: new Date().toISOString().split('T')[0],
          criado_em: new Date().toISOString(),
          taxa_cambio: currentExchangeRate,
        })
        .select()
        .single();

      if (error) throw error;
      
      //atualizar valores exibidos
      setTransactions([data, ...transactions]);
        setNewTx({ description: '', amount: '', currency: 'BRL', type: 'income', category: 'Outros' });
        setShowAddModal(false);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        alert('Erro ao adicionar transação: ' + errorMessage);
        console.error('Erro ao adicionar transação:', error);
      }
  };

  const formatCurrency = (val: number, cur: Currency) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
    };

  const calculateConverted = (amount: number, from: Currency, to: Currency) => {
    const amountInBRL = amount * EXCHANGE_RATES[from];
    return amountInBRL / EXCHANGE_RATES[to];
  };

  // Totals based on current view currency
  const totalBalance = transactions.reduce((acc, tx) => {
    const val = calculateConverted(tx.valor, tx.moeda as Currency, viewCurrency);
    return tx.tipo === 'income' ? acc + val : acc - val;
  }, 0);

  const totalIncome = transactions.filter(t => t.tipo === 'income').reduce((acc, tx) => acc + calculateConverted(tx.valor, tx.moeda as Currency, viewCurrency), 0);
  const totalExpense = transactions.filter(t => t.tipo === 'expense').reduce((acc, tx) => acc + calculateConverted(tx.valor, tx.moeda as Currency, viewCurrency), 0);
  const flags: Record<Currency, string> = { BRL: '🇧🇷', USD: '🇺🇸', EUR: '🇪🇺' };

  return (
    <div className="space-y-8 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Financeiro</h1>
          <p className="text-emerald-600">Gestão global de transações e conversões</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95"
        >
          <Plus size={20} />
          Nova Transação
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Saldo Consolidado</p>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">EM {viewCurrency}</span>
            </div>
            <h3 className="text-4xl font-black text-emerald-900">
              {formatCurrency(totalBalance, viewCurrency)}
            </h3>
          </div>
          
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-emerald-400 uppercase text-center md:text-right">Mudar Visualização</p>
            <div className="flex gap-2 bg-emerald-50 p-1.5 rounded-2xl border border-emerald-100">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setViewCurrency(cur)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    viewCurrency === cur 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  <span className="text-lg">{flags[cur]}</span>
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <ArrowUpCircle size={20} />
              </div>
              <p className="text-sm font-bold text-emerald-900">Ganhos</p>
            </div>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(totalIncome, viewCurrency)}</p>
          </div>
          <div className="h-px bg-emerald-50 w-full" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                <ArrowDownCircle size={20} />
              </div>
              <p className="text-sm font-bold text-emerald-900">Gastos</p>
            </div>
            <p className="text-lg font-black text-red-600">{formatCurrency(totalExpense, viewCurrency)}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar transações..."
            className="w-full bg-white border border-emerald-100 rounded-2xl py-3 pl-12 pr-4 text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <button className="flex items-center gap-2 bg-white border border-emerald-100 text-emerald-600 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all">
          <Filter size={20} />
          Filtrar
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-emerald-50/50">
              <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-wider text-right">Valor Original</th>
              <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-wider text-right">Equivalente ({viewCurrency})</th>
              <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-emerald-50/30 transition-colors group">
                <td className="px-6 py-4 text-sm font-medium text-emerald-600">{new Date(tx.data_transacao).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-emerald-900">{tx.descricao}</span>
                    <span className={`text-[10px] font-bold uppercase ${tx.tipo === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.tipo === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-100/50 text-emerald-600 text-xs font-bold rounded-full">
                    {tx.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-700">
                  <div className="flex items-center justify-end gap-1">
                    <span>{flags[tx.moeda as Currency]}</span>
                    <span>{formatCurrency(tx.valor, tx.moeda as Currency)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-black text-emerald-900">
                  <span className={tx.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}>
                    {tx.type === 'expense' ? '- ' : '+ '}
                    {formatCurrency(calculateConverted(tx.valor, tx.moeda as Currency, viewCurrency), viewCurrency)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-emerald-300 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50">
                    <MoreHorizontal size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold">Nova Transação</h2>
                <p className="text-emerald-100 text-sm">Adicione um novo registro financeiro</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-emerald-50 p-1 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setNewTx({...newTx, type: 'income'})}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${newTx.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-400'}`}
                >
                  Entrada
                </button>
                <button 
                  type="button"
                  onClick={() => setNewTx({...newTx, type: 'expense'})}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${newTx.type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-emerald-400'}`}
                >
                  Saída
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-emerald-400 uppercase ml-2 mb-1 block">Descrição</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Reserva Hotel"
                    value={newTx.description}
                    onChange={e => setNewTx({...newTx, description: e.target.value})}
                    className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-emerald-400 uppercase ml-2 mb-1 block">Valor</label>
                      <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0,00"
                    value={newTx.amount}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, ''); // só números

                      if (v === '') {
                        setNewTx({...newTx, amount: ''});
                        return;
                      }

                      // remove zeros à esquerda (mas deixa um se tudo for zero)
                      v = v.replace(/^0+(?=\d)/, '');

                      if (v.length === 1) {
                        setNewTx({...newTx, amount: `0,0${v}`});
                      } else if (v.length === 2) {
                        setNewTx({...newTx, amount: `0,${v}`});
                      } else {
                        const inteiro = v.slice(0, -2);
                        const decimal = v.slice(-2);
                        setNewTx({...newTx, amount: `${inteiro},${decimal}`});
                      }
                    }}
                      className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />

                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-400 uppercase ml-2 mb-1 block">Moeda</label>
                    <select 
                      value={newTx.currency}
                      onChange={e => setNewTx({...newTx, currency: e.target.value as Currency})}
                      className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                    >
                      <option value="BRL">🇧🇷 BRL</option>
                      <option value="USD">🇺🇸 USD</option>
                      <option value="EUR">🇪🇺 EUR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-emerald-400 uppercase ml-2 mb-1 block">Categoria</label>
                  <select 
                    value={newTx.category}
                    onChange={e => setNewTx({...newTx, category: e.target.value})}
                    className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]"
              >
                Adicionar Registro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
