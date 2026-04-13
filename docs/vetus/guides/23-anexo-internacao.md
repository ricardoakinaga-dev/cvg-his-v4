# VETUS — Relatório Anexo de Internação
**Evidências principais:** `screenshots/internacao-01.png`, `screenshots/internacao-boxes-01.png`, `modulos/int-01-internacao.png`, `modulos/int-02-boxes.png`, `modulos/int-03-ocorrencias.png`, `modulos/int-04-diaria.png`, `modulos/int-05-prescricao.png`

## 1. Síntese

Internação é um caso clássico de domínio funcional existente, mas mal servido pela camada beta.

## 2. Evidências funcionais

### 2.1 Internação principal

`modulos/int-01-internacao.png` mostra:

- tela `Internação`;
- abas `Animais Internados` e `Mapa de Medicamentos`;
- card por animal internado;
- nome do tutor;
- nome do animal e raça;
- botões de ação na linha;
- paginação.

### 2.2 Cadastro de boxes

`modulos/int-02-boxes.png` mostra:

- título `Cadastro de Box de Internação`;
- botão verde `Incluir`;
- filtros por código e descrição;
- pesquisa;
- tabela simples.

## 3. Evidências de falha

### 3.1 No shell beta

- `screenshots/internacao-01.png` está indisponível;
- `screenshots/internacao-boxes-01.png` está indisponível.

### 3.2 No legado direto

Há `HTTP 500` preservado em:

- `modulos/int-03-ocorrencias.png`
- `modulos/int-04-diaria.png`
- `modulos/int-05-prescricao.png`

## 4. Conclusão

Internação não está ausente do produto. O cenário real é:

- núcleo principal visível no legado;
- cadastro de boxes funcional;
- subrotinas relevantes ainda quebradas ou instáveis;
- camada beta sem entrega consistente desse domínio.
