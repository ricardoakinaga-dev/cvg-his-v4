# Modulo Pacientes — Integracao com Tutores

## 1. Fluxo obrigatorio

1. criar tutor
2. abrir detalhe do tutor
3. clicar "Adicionar paciente"
4. abrir formulario de paciente com tutor ja selecionado
5. salvar paciente
6. manter vinculo consistente

## 2. Regras

- paciente nao existe sem tutor salvo;
- tutor deve ser selecionado via sistema (busca);
- nao permitir digitacao manual de ID de tutor como caminho principal;
- quando vier do fluxo do tutor, campo de tutor deve ficar bloqueado ou somente leitura;
- fallback tecnico permitido apenas se estritamente necessario e nao como UX principal.

## 3. Compatibilidade

- manter compatibilidade com patients.ownerId existente;
- manter compatibilidade com owner-patient-links;
- primaryOwnerId no payload de create deve corresponder a tutor valido.

## 4. Exibicao do tutor no detalhe

- mostrar nome do tutor no detalhe do paciente;
- mostrar documento do tutor;
- permitir navegacao para detalhe do tutor.
