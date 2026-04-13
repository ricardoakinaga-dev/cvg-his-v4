# VETUS — Relatório Anexo de Laboratório
**Evidências principais:** `screenshots/laboratorio-*.png`, `modulos/lab-*.png`

## 1. Síntese

Laboratório tem boa cobertura funcional no legado e baixa cobertura operacional no shell SPA.

## 2. Evidências funcionais no legado

### 2.1 Exames

`modulos/lab-01-exames.png` mostra:

- título `Exames`;
- botão verde `Incluir`;
- filtros por cliente, animal e data;
- pesquisa;
- grade com coluna `Abrir`.

### 2.2 Laudos

`modulos/lab-02-laudos.png` mostra:

- código do laudo;
- cliente;
- proprietário;
- animal;
- data de finalização;
- data de entrada;
- corpo do laudo;
- opção de pesquisar laudos fechados.

### 2.3 Outros submódulos cobertos

Também há capturas para:

- hemogramas;
- urina;
- bioquímico;
- equipamentos;
- tipos de laudo;
- referência de hemograma;
- referência bioquímica.

## 3. Evidências problemáticas no shell

As capturas a seguir aparecem indisponíveis:

- `laboratorio-bioquimico-01.png`
- `laboratorio-exames-01.png`
- `laboratorio-hemogramas-01.png`
- `laboratorio-laudos-01.png`
- `laboratorio-urina-01.png`

Logo, a navegação beta não está entregando bem o domínio laboratorial.

## 4. Conclusão

Laboratório deve ser documentado como:

- **robusto no legado**;
- **mal exposto pelo shell SPA**;
- **forte candidato a migração gradual**, porque o domínio já está claramente modelado, mas ainda depende de telas clássicas.
