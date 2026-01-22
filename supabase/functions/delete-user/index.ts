import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Resposta para o navegador (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    // Validação básica
    if (!userId) {
      throw new Error("ID do usuário é obrigatório")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Deletar da tabela de perfis primeiro (devido a possíveis chaves estrangeiras)
    const { error: profileError } = await supabaseAdmin
      .from('perfis')
      .delete()
      .eq('id', userId)
    
    if (profileError) throw profileError

    // 2. Deletar da autenticação (Auth)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) throw authError

    return new Response(JSON.stringify({ message: "Usuário removido com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("Erro na função:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})