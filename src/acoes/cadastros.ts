'use server'

import { alterarStatusCliente, atualizarCliente, criarCliente, listarEventosCliente } from '@/lib/servicos/clientes'
import { alterarStatusSocio, atualizarSocio, criarSocio } from '@/lib/servicos/socios'
import { sessaoDaAcao } from '@/lib/servicos/sessao'
import type { Evento, Resultado, StatusCadastro } from '@/lib/tipos'
import { documentoValido, normalizarDocumento } from '@/lib/validacao/documento'

import { SESSAO_EXPIRADA, atualizarTelas, ehUuid, texto } from './comum'

export async function salvarCliente(dados: FormData): Promise<Resultado<{ id: string }>> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const id = dados.get('id')
  const nome = texto(dados.get('nome'), 160)
  const cnpj = normalizarDocumento(texto(dados.get('cnpj'), 30))
  const contato = texto(dados.get('contato'), 160)
  const observacoes = texto(dados.get('observacoes'), 2000)

  const campos: Record<string, string> = {}
  if (!nome) campos.nome = 'Informe o nome do cliente.'
  if (!documentoValido(cnpj)) campos.cnpj = 'CPF ou CNPJ inválido. Confira os números.'
  if (Object.keys(campos).length) return { ok: false, erro: 'Confira os campos destacados.', campos }

  const registro = { nome, cnpj, contato, observacoes }

  if (id) {
    if (!ehUuid(id)) return { ok: false, erro: 'Cliente não encontrado.' }
    const erro = await atualizarCliente(sessao.supabase, id, registro)
    if (erro) return { ok: false, erro, campos: /CNPJ/.test(erro) ? { cnpj: erro } : undefined }
    atualizarTelas()
    return { ok: true, mensagem: 'Cliente atualizado.', dados: { id } }
  }

  const r = await criarCliente(sessao.supabase, registro)
  if ('erro' in r) return { ok: false, erro: r.erro, campos: /CNPJ/.test(r.erro) ? { cnpj: r.erro } : undefined }
  atualizarTelas()
  return { ok: true, mensagem: 'Cliente criado.', dados: { id: r.id } }
}

export async function mudarStatusCliente(id: string, status: StatusCadastro): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }
  if (!ehUuid(id) || (status !== 'ATIVO' && status !== 'INATIVO')) return { ok: false, erro: 'Operação inválida.' }

  const erro = await alterarStatusCliente(sessao.supabase, id, status)
  if (erro) return { ok: false, erro }
  atualizarTelas()
  return { ok: true, mensagem: status === 'INATIVO' ? 'Cliente desativado.' : 'Cliente reativado.' }
}

export async function carregarEventos(
  clienteId: string,
  limite: number,
): Promise<{ eventos: Evento[]; temMais: boolean } | null> {
  const sessao = await sessaoDaAcao()
  if (!sessao || !ehUuid(clienteId)) return null
  return listarEventosCliente(sessao.supabase, clienteId, Math.min(Math.max(limite, 10), 500))
}

export async function salvarSocio(dados: FormData): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const id = dados.get('id')
  const registro = {
    nome: texto(dados.get('nome'), 160),
    telefone: texto(dados.get('telefone'), 40),
    chave_pix: texto(dados.get('chave_pix'), 140),
  }
  if (!registro.nome) return { ok: false, erro: 'Informe o nome do sócio.', campos: { nome: 'Informe o nome.' } }

  if (id) {
    if (!ehUuid(id)) return { ok: false, erro: 'Sócio não encontrado.' }
    const erro = await atualizarSocio(sessao.supabase, id, registro)
    if (erro) return { ok: false, erro }
    atualizarTelas()
    return { ok: true, mensagem: 'Sócio atualizado.' }
  }

  const erro = await criarSocio(sessao.supabase, registro)
  if (erro) return { ok: false, erro }
  atualizarTelas()
  return { ok: true, mensagem: 'Sócio cadastrado.' }
}

export async function mudarStatusSocio(id: string, status: StatusCadastro): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }
  if (!ehUuid(id) || (status !== 'ATIVO' && status !== 'INATIVO')) return { ok: false, erro: 'Operação inválida.' }

  const erro = await alterarStatusSocio(sessao.supabase, id, status)
  if (erro) return { ok: false, erro }
  atualizarTelas()
  return { ok: true, mensagem: status === 'INATIVO' ? 'Sócio desativado.' : 'Sócio reativado.' }
}
