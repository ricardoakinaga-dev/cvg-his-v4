# Relatorio de Inspecao Vetus: detalhe de cliente, animal e prontuario

**Data:** 2026-04-27
**Escopo:** cliente e animal autorizados explicitamente pelo responsavel na sessao
**Modo de trabalho:** ERP Vetus em modo observacional, com permissao limitada para abrir cards e formularios dentro dos registros autorizados
**Restricao mantida:** proibido criar, alterar, excluir, baixar, enviar mensagens ou confirmar acoes fora desses registros autorizados

> Este documento registra estrutura, logica, navegacao e fluxos para pareamento no `cvg-his-v2`. Dados pessoais reais, nomes, telefones, documentos, emails, valores e IDs internos foram omitidos ou generalizados.

---

## 1. Metodo

Foram abertas duas rotas do Vetus:

- detalhe de cliente autorizado;
- detalhe de animal autorizado vinculado ao cliente.

A inspecao coletou:

- hierarquia visual;
- cards, acordeoes e acoes;
- campos de formularios;
- overlays/sidebar;
- destinos logicos de navegacao;
- endpoints chamados, sem payloads.

Nenhuma acao de salvar, excluir, baixar arquivo, enviar mensagem ou confirmar operacao foi executada.

---

## 2. Detalhe do Cliente

### Estrutura da pagina

Rota padrao:

```text
/cadastro/clientes/detalhes/{clientId}
```

Cabecalho:

- breadcrumb `Inicio > Clientes > Detalhes do Cliente`;
- titulo `Detalhes do Cliente`;
- botao primario `Abrir Nova Comanda`;
- card cadastral com status do cliente, identificador interno e data de cadastro;
- acoes `Editar Cadastro` e `Enviar Mensagem`.

### Card cadastral

O card principal e organizado em acordeoes:

- `Identificacao do Cliente`
  - sexo;
  - data de nascimento;
  - receber SMS;
  - grupo.
- `Informacoes de Contato`
  - telefone 1;
  - telefone 2;
  - celular;
  - email.
- `Documentacao do Cliente`
  - fisica ou juridica;
  - CPF/CNPJ;
  - RG.
- `Endereco do Cliente`
  - CEP;
  - endereco;
  - numero;
  - complemento;
  - UF;
  - cidade;
  - bairro;
  - referencia;
  - codigo do municipio.
- `Observacoes Gerais`.

### Cards operacionais do cliente

Abaixo do cadastro, o detalhe do cliente funciona como um hub operacional:

| Card | Conteudo | Acoes observadas |
|---|---|---|
| `Animais Cadastrados` | lista paginada de animais vinculados, com raca/especie/idade | `Detalhes`, `Abrir Comanda`, `Cadastrar Novo Animal` |
| `Resgate de Pontos` | pontos disponiveis e bloqueados | `Historico` |
| `Live Animal e Live Lab` | status de ativacao e usuarios dos portais | `Configurar` |
| `Agenda` | proximo agendamento, animal, servico, profissional e unidade | `Historico` |
| `Comandas e Vendas` | quantidade total, abertas e valor agregado | `Historico` |
| `Pacotes` | adicionados, executados e a expirar | `Historico` |
| `Orcamentos` | ultimo orcamento e total | `Historico` |
| `Situacao Financeira` | saldo em credito e saldo devedor | `Historico` |

Os botoes `Historico` permanecem no contexto do cliente e parecem depender de dialogs/estados internos ou filtros, nao de navegacao simples para uma rota externa visivel na primeira inspecao.

### Formulario: editar cliente

`Editar Cadastro` abre formulario lateral/overlay com secoes:

- `Cadastro`
  - switch de status ativo;
- `Identificacao`
  - nome;
  - data de nascimento;
  - sexo;
  - grupo;
  - receber SMS.
- `Informacoes de Contato`
  - telefone 1;
  - telefone 2;
  - celular;
  - email.
- `Documentacao`
  - pessoa fisica/juridica;
  - CPF/CNPJ;
  - RG.
- `Endereco`
  - CEP;
  - endereco;
  - numero;
  - complemento;
  - UF;
  - cidade;
  - bairro;
  - referencia;
  - codigo do municipio.
- `Observacoes gerais`
  - textarea com contador de caracteres.
- `Creditos e Pontos`
  - limite de debito permitido;
  - saldo em credito;
  - pontos disponiveis;
  - pontos bloqueados.

### Formulario: incluir animal a partir do cliente

`Cadastrar Novo Animal` abre sidebar `Incluir novo Animal`, ja contextualizada no cliente atual.

Campos observados:

- nome do animal;
- sexo;
- mes de nascimento;
- anos;
- meses;
- raca;
- especie;
- porte;
- numero do chip;
- numero pedigree;
- peso do animal;
- doenca cronica;
- alergia;
- cor;
- temperamento;
- situacao: `Vivo`, `Doado`, `Obito`;
- observacoes gerais.

Acoes:

- `Cancelar`;
- `Incluir Animal`.

---

## 3. Detalhe do Animal / Prontuario

### Estrutura da pagina

Rota padrao:

```text
/cadastro/animais/detalhes/{animalId}
```

Cabecalho:

- breadcrumb `Inicio > Animais > Detalhes do Animal`;
- titulo `Detalhes do Animal`;
- botao `Abrir Nova Comanda`;
- acoes cadastrais `Excluir Cadastro` e `Editar Cadastro`;
- botao `Imprimir`.

O topo da ficha mostra:

- ID interno do animal;
- nome do animal;
- raca;
- especie;
- idade;
- data de cadastro;
- doenca cronica;
- alergia;
- temperamento;
- cliente vinculado;
- informacoes de contato.

Ha acordeoes:

- `Ver mais Informacoes do Animal`;
- `Ver Informacoes de Contato`.

Acoes proximas ao vinculo com cliente:

- `Enviar Mensagem`;
- `Ver cadastro do cliente`.

### Cards do prontuario

O detalhe do animal e o cockpit clinico principal do Vetus. Cards observados:

| Card | Logica observada | Acoes |
|---|---|---|
| `Ultimos Atendimentos` | lista atendimentos recentes, com data, quantidade, responsavel e vinculo com comanda | `Ver Comanda`, `Ver mais Atendimentos` |
| `Anamneses` | estado vazio ou lista de anamneses | expandir, `Ver mais Anamneses`, `Incluir Nova Anamnese` |
| `Vacinas e Vermifugos` | estado vazio/lista de registros preventivos | `Ver Mais Vacinas/Vermifugos`, `Incluir Nova Vacina/Vermifugo` |
| `Agenda` | agendamentos vinculados ao animal | expansao do card |
| `Exames` | arquivos/resultados anexados ao animal | expandir, `Baixar Arquivo`, `Excluir`, `Ver mais Exames`, `Upload de Exame PDF` |
| `Internacao` | internações vinculadas | expandir |
| `Receituario` | receitas emitidas para o animal | expandir, `Ver Receita`, `Imprimir`, `Editar`, `Salvar`, `Ver mais Receitas`, `Incluir Nova Receita` |
| `Grafico de peso` | grafico por periodo e peso atual | expandir, `Ver mais Pesos`, `Atualizar peso` |
| `Imagens` | imagens clinicas vinculadas | expandir, `Ver mais Imagens` |
| `Historico Clinico` | area textual longitudinal do prontuario | textarea persistivel |

### Formulario: editar animal

`Editar Cadastro` abre sidebar `Editar Cadastro do Animal`.

Estrutura:

- bloco do cliente vinculado;
- botao `Trocar Cliente`;
- busca de cliente por nome, CPF, email ou ID;
- filtros de busca de cliente;
- dados do animal;
- secao `Identificacao`;
- secao `Observacoes gerais`.

Campos de identificacao:

- nome do animal;
- sexo;
- mes de nascimento;
- anos;
- meses;
- raca;
- especie;
- porte;
- numero do chip;
- numero pedigree;
- peso do animal;
- doenca cronica;
- alergia;
- cor;
- temperamento;
- situacao: `Vivo`, `Doado`, `Obito`.

Acoes:

- `Cancelar`;
- `Salvar Cadastro`.

### Formulario: nova anamnese

`Incluir Nova Anamnese` abre sidebar `Nova Anamnese`.

Campos:

- `Tipo` obrigatorio;
- `Data` obrigatoria;
- `Profissional Responsavel` obrigatorio;
- `Descricao`;
- `Informacoes Adicionais`.

Acoes visiveis:

- `Excluir`;
- `Imprimir`;
- `Salvar Anamnese`.

Observacao: dialogs de confirmacao de exclusao aparecem presentes no DOM, mas nao foram acionados.

### Formulario: vacina / vermifugo

`Incluir Nova Vacina/Vermifugo` abre formulario com:

- `Data de Registro` obrigatoria;
- `Tipo de Registro` obrigatorio;
- `Vacina/Vermifugo` obrigatorio, com busca por medicamento;
- `Observacoes` opcional;
- switch `Dose Aplicada?`.

### Formulario: upload de exame PDF

`Upload de Exame PDF` abre sidebar com:

- seletor de arquivo;
- `Descricao` obrigatoria;
- `Data de Salvamento` obrigatoria.

Acoes:

- `Cancelar`;
- `Salvar`.

### Receituario

O receituario combina lista de receitas existentes com edicao inline.

Padrao observado:

- cada receita mostra requisicao, tipo, profissional e usuario;
- acoes por item:
  - `Ver Receita`;
  - `Imprimir`;
  - `Editar`;
  - `Salvar`.
- `Incluir Nova Receita` cria uma area inline `Receita`, nao necessariamente um dialog separado;
- o campo principal observado e `Descricao`.

### Peso

`Grafico de peso` mostra:

- filtros/periodos visuais como 3 meses, 6 meses e 1 ano;
- peso atual;
- `Ver mais Pesos`;
- `Atualizar peso`.

Na inspecao, `Atualizar peso` reutilizou o fluxo de edicao cadastral do animal, expondo o campo `Peso do animal (Kg)` dentro da sidebar de cadastro.

### Historico Clinico

O card `Historico Clinico` fica no final do cockpit e apresenta textarea:

```text
Escreva aqui o historico clinico do animal
```

Esse comportamento indica que o Vetus trata o historico clinico como um registro longitudinal simples, complementar aos eventos estruturados de anamnese, exame, receita, vacina, internacao e atendimento.

---

## 4. Superficie de API observada

As chamadas abaixo foram observadas sem payloads e com IDs generalizados:

```text
GET /clients/{clientId}
GET /clients/{clientId}/detail/todos
GET /animals/client/{clientId}?page={page}&size={size}

GET /animals/{animalId}
GET /animals/{animalId}/detail/todos
GET /attendance/animal/?order={order}&page={page}&size={size}&animalId={animalId}
GET /professional/{professionalId}?buscaDisponibilidade={flag}
GET /anamnesis/animal/{animalId}?size={size}&page={page}
GET /animals/{animalId}/vaccines-dewormers?page={page}&size={size}
GET /exams/animals/{animalId}?size={size}&page={page}
GET /attendance-hospitalization/animal/{animalId}?page={page}&size={size}
GET /prescription/animal?size={size}&page={page}&animalId={animalId}
GET /animals/{animalId}/weights
GET /animals/{animalId}/attendance/photo
GET /animals/{animalId}/prescription
```

Host observado para APIs:

```text
dorylus.vetus.com.br
```

---

## 5. Implicacoes para pareamento no `cvg-his-v2`

### Cliente

O detalhe de cliente no `cvg-his-v2` deve ser tratado como hub operacional, nao apenas cadastro:

- ficha cadastral expansivel;
- animais vinculados com acoes diretas;
- pontos;
- portal/live;
- agenda;
- comandas/vendas;
- pacotes;
- orcamentos;
- financeiro;
- criacao de animal no contexto do cliente;
- edicao em sidebar, sem trocar de pagina.

### Animal / prontuario

O detalhe de animal deve ser o cockpit clinico principal:

- ficha cadastral lateral/topo;
- cliente vinculado sempre visivel;
- acoes de comanda, mensagem e retorno ao cliente;
- cards clinicos independentes;
- inclusoes clinicas via sidebar ou inline;
- historico clinico longitudinal;
- anexos/exames com upload;
- receituario com ver/imprimir/editar/salvar;
- peso integrado ao cadastro;
- imagens e internacao como cards nativos.

### Padrao de UI a reproduzir

- Cards expansíveis por dominio.
- Sidebars para criacao/edicao sem sair do contexto.
- Estados vazios textuais por card.
- Acoes de lista dentro do proprio card.
- Botoes de historico mantendo o contexto do cliente/animal.
- Diferenciar eventos estruturados de texto longitudinal:
  - anamnese, vacina, exame, receita e peso como entidades/eventos;
  - historico clinico como campo longitudinal do animal.

---

## 6. Riscos e cuidados

- Nao copiar dados reais de cliente/animal para fixtures, seeds, testes ou docs.
- Evitar botoes destrutivos (`Excluir`, `delete`) no Vetus durante novas inspecoes.
- Evitar `Baixar Arquivo` porque pode materializar documentos reais fora do navegador.
- Evitar `Enviar Mensagem`, `Abrir Nova Comanda` e `Salvar` sem confirmacao explicita da proxima tarefa.
- Ao implementar no `cvg-his-v2`, usar dados ficticios e IDs locais.
