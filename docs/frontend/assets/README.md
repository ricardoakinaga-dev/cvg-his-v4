# CVG Pulse — estudos de material e movimento

Brief de geração, 06/09/2026. Destino: caderno de direção visual do frontend; não constitui interface implantada nem identidade aprovada.

## Direção e função

Material mineral marfim, metal azul petróleo acetinado, reflexos ciano discretos e pequeno acento champagne. Uma órbita orgânica sugere cuidado e continuidade. Luz lateral suave; composição horizontal com espaço negativo. Sem texto, animais, pessoas ou recriação do logotipo existente. A marca oficial será aplicada separadamente, preservada.

- ComfyUI: imagem conceitual 1024×576, modelo local Z Image Turbo int8, seed 609202601, oito passos, encoder na CPU. Workflow reproduzível em `workflows/`. Prefixos exclusivos e cancelamentos registrados abaixo; nenhum serviço pago ou download de modelo.
- Blender: cena própria em `source/`, checkpoint isolado; materiais, câmera e animação por MCP CLI. Render de vídeo em processo local limitado, CPU, sem ocupar a GPU compartilhada. Loop sem áudio e poster estático.
- Recorte previsto: imagem de identidade/login e demonstração editorial; nunca fundo de tabela, prontuário ou alerta. O logo não pode ser cortado; nestes estudos não há logo.
- Aceitação conceitual: textura contínua, nenhuma tipografia alucinada, bordas limpas, luz controlada, loop sem salto perceptível. Aprovação final exige composição no produto, contraste, orçamento de transferência e testes com movimento reduzido.
- Botões, ícones funcionais, estados e transições devem ser construídos em CSS/SVG/componentes, não em imagens geradas.

Os resultados e limitações da execução ficam em `evidence/` e no manifesto final. A disponibilidade do gerador não implica aprovação estética ou autorização de publicação.

## Entrega Blender e caderno

- [Vídeo MP4](video/cvg-pulse-orbit.mp4): 768×432, 24 fps, 72 frames, 3 segundos, sem áudio; aproximadamente 45 KB.
- [Poster WebP](images/cvg-pulse-orbit.webp): aproximadamente 11 KB.
- [Cena Blender](source/cvg-pulse-orbit.blend) e [script de autoria](source/create-scene.py). Criação via MCP Blender CLI, render via Blender local em CPU, seis threads, Cycles 12 samples e denoise. Codificação via FFmpeg H.264.
- [Caderno interativo](../caderno-visual.html): botões, estados simulados, tema, abas por teclado, contexto modal e vídeo iniciado por comando.
- [QA do caderno](evidence/concept-qa.json): Chromium em 390/1440 px, claro/escuro, sem overflow global ou erro JS; retorno de foco, teclado, vídeo e redução de movimento verificados. Não equivale à certificação da SPA.

## Integração na SPA — correção de identidade em 08/09/2026

Após a revisão visual, o estudo de órbitas foi retirado do palco de identidade
da tela de login: ele não representa o hospital e permanece apenas como material
conceitual deste caderno. A SPA voltou a usar o logo institucional existente,
com `apps/spa/public/art/hospital-logo-poster.webp` como poster e
`apps/spa/public/art/hospital-logo-loop.mp4` como loop opcional. O cabeçalho
continua usando `hospital-guarapiranga-logo.jpeg`.

A matriz browser [login-assets-20260908](../implementation/evidence/login-assets-20260908.json)
passa oito combinações de largura, tema e movimento reduzido; ela não é
aprovação visual, de rede, de performance ou de produção.

Inspeção autoral do render: material e luz coerentes com a proposta; órbitas geométricas deliberadamente abstratas. A exploração ainda é simples, sem identidade aprovada e sem resolução de campanha. Movimento de flutuação sutil, com trajetória periódica; o ruído do render precisa de revisão perceptiva antes de produção. Não foi realizada aprovação independente.

## Registro da execução ComfyUI

A sessão disponível passou a operar em CPU. As duas primeiras submissões foram canceladas por ID: `c22dcf4c-3921-4b51-ae6e-ff0166a2dde7` e `bcfdbf10-99df-4192-9a2a-fb47ae159b60`. Foi identificado que `set_workflow_slot` sem `stdout:false` devolvia a edição, mas não a gravava; essas submissões não representam o brief CVG. Nenhum resultado delas foi adotado.

A terceira submissão usa arquivo efetivamente gravado e conferido: `0836ac61-05c9-443d-9853-d044ac6fac39`, workflow `workflows/cvg-pulse-material-preview.json`, prefixo `cvg-pulse-frontend-20260906-preview-003`, seed 609202601, 384×224, quatro passos. O workflow de 1024×576 foi corrigido e preservado para geração posterior; não é descrito como render final entregue. Apenas jobs desta tarefa receberam cancelamento.

**Estado revalidado em 07/09/2026:** job ComfyUI concluído, saída coletada e inspecionada em [imagem de estudo](images/0836ac61_000.png). Prévia 384×224, 84.640 bytes: arco em metal azul sobre material mineral com contorno champagne, sem texto. Resultado coerente com o brief de material, mas pequeno e simples; não aprovado como asset final de produção nem aplicado à SPA. O vídeo e poster Blender continuam disponíveis. [Snapshot do job](evidence/comfyui-job-status.json).

O job concluído foi coletado pelo MCP `fetch_outputs`; não há nova submissão necessária para esta prévia. O workflow final de 1024×576 é uma proposta de render posterior, condicionado à capacidade disponível.
