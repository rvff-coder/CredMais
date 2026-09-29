/**
 * Limite do comprovante, lido pela tela e pelo servidor.
 *
 * 4 MB porque na Vercel o corpo de cada requisição para em 4,5 MB, e o
 * arquivo sobe junto com o formulário do recebimento (mais a sobra do
 * multipart). Acima disso a requisição nem chegaria ao servidor.
 */
export const TAMANHO_MAXIMO_COMPROVANTE = 4 * 1024 * 1024
export const MENSAGEM_TAMANHO_COMPROVANTE = 'O comprovante deve ter no máximo 4 MB.'
