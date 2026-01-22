import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Plus, Download, Trash2, Eye, 
  FileImage, X, CheckCircle2, Clock, Loader2 
} from 'lucide-react';
import { supabase } from '@/src/api/supabase';

// --- Interfaces ---
interface DocumentRecord {
  id: string;
  objetivo_id: string;
  nome: string;
  categoria: string;
  tipo: string;
  tamanho: string;
  status: string;
  conteudo_base64?: string;
  criado_em: string;
}

interface DocumentsProps {
  objetivoSelecionado?: { id: string; titulo: string };
}

const Documents: React.FC<DocumentsProps> = ({ objetivoSelecionado }) => {
  // --- Estados ---
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchingFile, setFetchingFile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  const [newDoc, setNewDoc] = useState({
    nome: '',
    categoria: 'Outros',
    tipo: 'Checklist',
    tamanho: '0 KB',
    conteudo_base64: ''
  });

  // --- Efeitos ---
  useEffect(() => {
    if (objetivoSelecionado?.id) {
      buscarDocumentos();
    }
  }, [objetivoSelecionado]);

  // --- Funções de Apoio ---
  const converterParaBase64 = (arquivo: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.readAsDataURL(arquivo);
      leitor.onload = () => resolve(leitor.result as string);
      leitor.onerror = (error) => reject(error);
    });
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await converterParaBase64(file);
    setNewDoc(prev => ({
      ...prev,
      nome: prev.nome || file.name,
      tipo: file.type.includes('pdf') ? 'PDF' : 'Imagem',
      tamanho: (file.size / 1024).toFixed(1) + ' KB',
      conteudo_base64: base64
    }));
  };

  // --- Lógica de Banco de Dados ---
  const buscarDocumentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documentos')
        .select('id, objetivo_id, nome, categoria, tipo, tamanho, status, criado_em')
        .eq('objetivo_id', objetivoSelecionado?.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Erro ao buscar:", err);
    } finally {
      setLoading(false);
    }
  };

  const visualizarDocumento = async (doc: DocumentRecord) => {
    try {
      setFetchingFile(true);
      const { data, error } = await supabase
        .from('documentos')
        .select('conteudo_base64')
        .eq('id', doc.id)
        .single();

      if (error) throw error;
      if (data?.conteudo_base64) {
        setSelectedDoc({ ...doc, conteudo_base64: data.conteudo_base64 });
      } else {
        alert("Este item não possui um arquivo anexo.");
      }
    } catch (err) {
      console.error("Erro ao carregar arquivo:", err);
      alert("Não foi possível baixar o arquivo.");
    } finally {
      setFetchingFile(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.nome || !objetivoSelecionado) return;

    try {
      setIsSaving(true);
      
      const dadosParaEnviar = {
        objetivo_id: objetivoSelecionado.id,
        nome: newDoc.nome,
        categoria: newDoc.categoria,
        conteudo_base64: newDoc.conteudo_base64 || null,
        tamanho: newDoc.conteudo_base64 ? newDoc.tamanho : '0 KB',
        status: 'pendente',
        tipo: newDoc.conteudo_base64 ? newDoc.tipo : 'Checklist'
      };

      const { data, error } = await supabase
        .from('documentos')
        .insert([dadosParaEnviar])
        .select('id, objetivo_id, nome, categoria, tipo, tamanho, status, criado_em')
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      setShowAddModal(false);
      setNewDoc({ nome: '', categoria: 'Outros', tipo: 'Checklist', tamanho: '0 KB', conteudo_base64: '' });
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      // Erro dinâmico para não confundir o usuário
      alert(`Erro ao salvar: ${err.message || "Verifique sua conexão ou as permissões do banco."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateFile = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFetchingFile(true);
    try {
      const base64 = await converterParaBase64(file);
      const tipoReal = file.type.includes('pdf') ? 'PDF' : 'Imagem';
      const tamanhoFormatado = (file.size / 1024).toFixed(1) + ' KB';

      const { data, error } = await supabase
        .from('documentos')
        .update({
          conteudo_base64: base64,
          tipo: tipoReal,
          tamanho: tamanhoFormatado,
          status: 'concluido'
        })
        .eq('id', id)
        .select('id, objetivo_id, nome, categoria, tipo, tamanho, status, criado_em')
        .single();

      if (error) throw error;

      setDocuments(prev => prev.map(d => d.id === id ? data : d));
    } catch (error: any) {
      console.error("Erro no upload posterior:", error.message);
      alert("Falha ao salvar o arquivo.");
    } finally {
      setFetchingFile(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const novoStatus = currentStatus === 'concluido' ? 'pendente' : 'concluido';
    setFetchingFile(true); 

    try {
      const { data, error } = await supabase
        .from('documentos')
        .update({ status: novoStatus })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: novoStatus } : d));
      }
    } catch (error: any) {
      alert(`Erro no banco: ${error.message}`);
    } finally {
      setFetchingFile(false);
    }
  };

  const removerDocumento = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente?")) return;
    setFetchingFile(true);
    try {
      const { error } = await supabase.from('documentos').delete().eq('id', id);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (error: any) {
      alert(`Erro ao deletar: ${error.message}`);
    } finally {
      setFetchingFile(false);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'PDF') return <FileText className="text-red-500" size={24} />;
    if (type === 'Imagem') return <FileImage className="text-blue-500" size={24} />;
    return <Clock className="text-amber-500" size={24} />;
  };

  const documentosFiltrados = documents.filter(d => 
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 relative pb-20">
      {fetchingFile && (
        <div className="fixed inset-0 z-[100] bg-emerald-950/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-emerald-100 animate-in zoom-in duration-200">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="font-bold text-emerald-900">Processando...</p>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Documentos</h1>
          <p className="text-emerald-600">Checklist e armazenamento seguro</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
        >
          <Plus size={20} /> Novo Registro
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou categoria..."
          className="w-full bg-white border border-emerald-100 rounded-2xl py-4 pl-12 pr-4 text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 text-emerald-400 animate-pulse">Carregando sua lista...</div>
        ) : documentosFiltrados.map((doc) => (
          <div key={doc.id} className={`bg-white p-6 rounded-3xl border transition-all group ${doc.status === 'concluido' ? 'border-emerald-500/30 bg-emerald-50/20' : 'border-emerald-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${doc.status === 'concluido' ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
                {getIcon(doc.tipo)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.tipo !== 'Checklist' ? (
                  <button onClick={() => visualizarDocumento(doc)} className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors">
                    <Eye size={18} />
                  </button>
                ) : (
                  <label className="p-2 text-emerald-400 hover:text-emerald-600 cursor-pointer transition-colors">
                    <Plus size={18} />
                    <input type="file" className="hidden" onChange={(e) => handleUpdateFile(doc.id, e)} />
                  </label>
                )}
              </div>
            </div>

            <h3 className={`font-bold truncate ${doc.status === 'concluido' ? 'text-emerald-900/40 line-through' : 'text-emerald-900'}`}>{doc.nome}</h3>
            <p className="text-xs text-emerald-500 font-medium mb-4">{doc.categoria} • {doc.tamanho}</p>
            
            <button 
              onClick={() => toggleStatus(doc.id, doc.status)}
              disabled={fetchingFile}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[10px] uppercase transition-all ${
                doc.status === 'concluido' ? 'bg-emerald-500 text-white' : 'bg-amber-50 text-amber-600'
              } ${fetchingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {doc.status === 'concluido' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              {doc.status}
            </button>

            <div className="mt-4 pt-4 border-t border-emerald-50 flex items-center justify-between">
              <span className="text-[10px] text-emerald-300 font-bold">{new Date(doc.criado_em).toLocaleDateString('pt-BR')}</span>
              <button onClick={() => removerDocumento(doc.id)} className="text-red-200 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Visualização */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="font-bold text-emerald-900 text-xl">{selectedDoc.nome}</h3>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={28} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 flex justify-center items-start">
              {selectedDoc.tipo === 'Imagem' ? (
                <img src={selectedDoc.conteudo_base64} alt="Doc" className="max-w-full rounded-lg shadow-md" />
              ) : (
                <iframe src={selectedDoc.conteudo_base64} className="w-full h-[70vh] rounded-lg border-0" title="PDF" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-600 p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold">Novo Registro</h2>
                <p className="text-emerald-100 text-sm">Tarefa ou documento anexo</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleAddDocument} className="p-8 space-y-5">
              <div>
                <label className='text-[10px] font-bold text-emerald-400 uppercase ml-2 mb-2 block'>Arquivo (Opcional)</label>
                <input 
                  type="file" 
                  onChange={handleFileSelection}
                  className="w-full text-sm text-emerald-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-emerald-400 uppercase ml-2 mb-1 block">Nome do Item</label>
                  <input 
                    type="text" required placeholder="Ex: Passaporte ou Visto"
                    className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newDoc.nome}
                    onChange={e => setNewDoc({...newDoc, nome: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-400 uppercase ml-2 mb-1 block">Categoria</label>
                  <select 
                    className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-emerald-900 outline-none"
                    value={newDoc.categoria}
                    onChange={e => setNewDoc({...newDoc, categoria: e.target.value})}
                  >
                    <option value="Identificação">Identificação</option>
                    <option value="Acomodação">Acomodação</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between text-[11px] font-bold text-emerald-700">
                <span>TIPO: {newDoc.tipo}</span>
                <span>TAMANHO: {newDoc.tamanho}</span>
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <><Loader2 className="animate-spin" size={20} /> Salvando...</> : 'Salvar no Planejamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;