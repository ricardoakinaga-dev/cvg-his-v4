# Observações da tentativa de inspeção direta

Data: 2026-04-24

## Resultado técnico da tentativa

- a sessão automatizada ficou parada no desafio de segurança da Cloudflare antes de abrir a tela real;
- o artefato [estado-pos-login.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-30-01-103Z-esteira-exames/estado-pos-login.json) registra a página `Um momento...` com `Executando verificação de segurança`;
- a checagem HTTP simples na rota `https://erp.vetus.com.br/Sistema/Atendimento/EsteiraExames.htm` retornou `HTTP/2 403` com cabeçalho `cf-mitigated: challenge`.

## Consequência para a análise

Nesta passada, a inspeção do módulo `Esteira de Exames` precisou ser fechada por:

- rota confirmada pelo menu legado;
- documentação interna do fluxo;
- consistência com o domínio já mapeado em `laboratório`.
