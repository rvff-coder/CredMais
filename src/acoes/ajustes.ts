'use server'

import { redirect } from 'next/navigation'

import { atualizarLimiares, salvarConfiguracoesGerais } from '@/lib/servicos/configuracoes'
import { sessaoDaAcao } from '@/lib/servicos/sessao'
import type { Resultado } from '@/lib/tipos'

import { SESSAO_EXPIRADA, atualizarTelas, texto } from './comum'

/** "35" / "32,5" / "32.5" → 32.5; null se não for um percentual válido. */
function lerPercentual(valor: FormDataEntryValue | null): number | null {
  const t = String(valor ?? '').replace('%', '').replace(',', '.').trim()
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return n >= 0 && n <= 1000 ? n : null
}

export async function salvarLimiares(dados: FormData): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const diario = lerPercentual(dados.get('DIARIO'))
  const semanal = lerPercentual(dados.get('SEMANAL'))
  const mensal = lerPercentual(dados.get('MENSAL'))

  const campos: Record<string, string> = {}
  if (diario === null) campos.DIARIO = 'Percentual inválido.'
  if (semanal === null) campos.SEMANAL = 'Percentual inválido.'
  if (mensal === null) campos.MENSAL = 'Percentual inválido.'
  if (diario === null || semanal === null || mensal === null) {
    return { ok: false, erro: 'Os percentuais devem estar entre 0% e 1000%, com até duas casas decimais.', campos }
  }

  const erro = await atualizarLimiares(sessao.supabase, { DIARIO: diario, SEMANAL: semanal, MENSAL: mensal })
  if (erro) return { ok: false, erro }

  atualizarTelas()
  return { ok: true, mensagem: 'Regra atualizada.' }
}

export async function salvarConfiguracoes(dados: FormData): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const nomeSistema = texto(dados.get('nome_sistema'), 60)
  if (!nomeSistema) return { ok: false, erro: 'Informe o nome do sistema.', campos: { nome_sistema: 'Obrigatório.' } }

  const itens = Number(dados.get('itens_por_pagina'))

  const erro = await salvarConfiguracoesGerais(sessao.supabase, sessao.usuario.id, {
    nome_sistema: nomeSistema,
    razao_social: texto(dados.get('razao_social'), 160),
    cnpj_negocio: texto(dados.get('cnpj_negocio'), 20),
    telefone_negocio: texto(dados.get('telefone_negocio'), 40),
    email_negocio: texto(dados.get('email_negocio'), 160),
    endereco_negocio: texto(dados.get('endereco_negocio'), 300),
    itens_por_pagina: [10, 20, 50, 100].includes(itens) ? itens : 20,
    notificar_vencimentos: dados.get('notificar_vencimentos') === 'on',
    notificar_atrasos: dados.get('notificar_atrasos') === 'on',
  })
  if (erro) return { ok: false, erro }

  atualizarTelas()
  return { ok: true, mensagem: 'Configurações salvas.' }
}

export async function salvarPerfil(dados: FormData): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const nome = texto(dados.get('nome'), 80)
  if (!nome) return { ok: false, erro: 'Informe seu nome.', campos: { nome: 'Obrigatório.' } }

  const { error } = await sessao.supabase.from('perfis').update({ nome }).eq('id', sessao.usuario.id)
  if (error) return { ok: false, erro: 'Não foi possível salvar o perfil. Tente novamente.' }

  atualizarTelas()
  return { ok: true, mensagem: 'Perfil atualizado.' }
}

export async function alterarSenha(dados: FormData): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const senha = String(dados.get('senha') ?? '')
  const confirmacao = String(dados.get('confirmacao') ?? '')
  if (senha.length < 8) return { ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres.' }
  if (senha !== confirmacao) return { ok: false, erro: 'As senhas não conferem.' }

  const { error } = await sessao.supabase.auth.updateUser({ password: senha })
  if (error) {
    return {
      ok: false,
      erro: /same|different/i.test(error.message)
        ? 'A nova senha deve ser diferente da atual.'
        : 'Não foi possível alterar a senha. Tente novamente.',
    }
  }
  return { ok: true, mensagem: 'Senha alterada.' }
}

export async function sair() {
  const sessao = await sessaoDaAcao()
  if (sessao) await sessao.supabase.auth.signOut()
  redirect('/login')
}
