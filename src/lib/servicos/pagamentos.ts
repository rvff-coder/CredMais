import 'server-only'

import { MENSAGEM_TAMANHO_COMPROVANTE, TAMANHO_MAXIMO_COMPROVANTE } from '@/lib/comprovante'
import { mensagemDeErro } from '@/lib/erros'
import type { ClienteSupabase } from '@/lib/supabase/server'

export const BUCKET_COMPROVANTES = 'comprovantes'
export const TIPOS_COMPROVANTE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export function validarComprovante(arquivo: File): string | null {
  if (!TIPOS_COMPROVANTE[arquivo.type]) return 'O comprovante deve ser uma imagem (JPG, PNG, WEBP) ou PDF.'
  if (arquivo.size > TAMANHO_MAXIMO_COMPROVANTE) return MENSAGEM_TAMANHO_COMPROVANTE
  if (arquivo.size === 0) return 'O arquivo do comprovante está vazio.'
  return null
}

type ArquivoEnviado = { caminho: string; nome: string; tipo: string; tamanho: number }

async function enviarArquivo(
  supabase: ClienteSupabase,
  parcelaId: string,
  arquivo: File,
): Promise<ArquivoEnviado | { erro: string }> {
  const caminho = `${parcelaId}/${crypto.randomUUID()}.${TIPOS_COMPROVANTE[arquivo.type]}`
  const { error } = await supabase.storage.from(BUCKET_COMPROVANTES).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: false,
  })
  if (error) return { erro: 'Não foi possível enviar o comprovante. Tente novamente.' }
  return { caminho, nome: arquivo.name.slice(0, 200) || 'comprovante', tipo: arquivo.type, tamanho: arquivo.size }
}

export type ResultadoRecebimento = {
  finalizado: boolean
  proxima_numero: number | null
  proxima_vencimento: string | null
  proxima_valor: number | null
}

/**
 * Recebe uma parcela. O arquivo sobe antes (o Storage não participa da
 * transação do banco); depois, uma única chamada ao banco marca a parcela
 * como paga, lança a entrada na carteira, grava o comprovante e os eventos.
 * Se o banco recusar, o arquivo enviado é apagado.
 *
 * A proteção contra recebimento duplo está no banco: a parcela é travada
 * (FOR UPDATE) e existe um índice único de uma entrada por parcela.
 */
export async function registrarPagamento(
  supabase: ClienteSupabase,
  parcelaId: string,
  arquivo: File | null,
): Promise<{ dados: ResultadoRecebimento } | { erro: string }> {
  let enviado: ArquivoEnviado | null = null

  if (arquivo) {
    const erroArquivo = validarComprovante(arquivo)
    if (erroArquivo) return { erro: erroArquivo }

    const r = await enviarArquivo(supabase, parcelaId, arquivo)
    if ('erro' in r) return r
    enviado = r
  }

  const { data, error } = await supabase.rpc('registrar_pagamento', {
    p_parcela: parcelaId,
    p_comprovante_arquivo: enviado?.caminho ?? null,
    p_comprovante_nome: enviado?.nome ?? null,
    p_comprovante_tipo: enviado?.tipo ?? null,
    p_comprovante_tamanho: enviado?.tamanho ?? null,
  })

  if (error) {
    if (enviado) await supabase.storage.from(BUCKET_COMPROVANTES).remove([enviado.caminho])
    return { erro: mensagemDeErro(error, 'Não foi possível registrar o pagamento. Tente novamente.') }
  }

  return { dados: data as ResultadoRecebimento }
}

/** Comprovante enviado depois, para parcela já recebida sem anexo. */
export async function anexarComprovante(
  supabase: ClienteSupabase,
  parcelaId: string,
  arquivo: File,
): Promise<string | null> {
  const erroArquivo = validarComprovante(arquivo)
  if (erroArquivo) return erroArquivo

  const enviado = await enviarArquivo(supabase, parcelaId, arquivo)
  if ('erro' in enviado) return enviado.erro

  const { error } = await supabase.rpc('anexar_comprovante', {
    p_parcela: parcelaId,
    p_arquivo: enviado.caminho,
    p_nome: enviado.nome,
    p_tipo: enviado.tipo,
    p_tamanho: enviado.tamanho,
  })

  if (error) {
    await supabase.storage.from(BUCKET_COMPROVANTES).remove([enviado.caminho])
    return mensagemDeErro(error, 'Não foi possível anexar o comprovante. Tente novamente.')
  }
  return null
}

/** Link temporário para abrir o comprovante. */
export async function linkDoComprovante(supabase: ClienteSupabase, comprovanteId: string) {
  const { data } = await supabase.from('comprovantes').select('arquivo').eq('id', comprovanteId).maybeSingle()
  if (!data) return null

  const { data: assinado } = await supabase.storage
    .from(BUCKET_COMPROVANTES)
    .createSignedUrl((data as { arquivo: string }).arquivo, 60 * 5)
  return assinado?.signedUrl ?? null
}
