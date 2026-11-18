# Design system de referência (Senior)

Fonte: artifact "Senior Design System" (slug cde3fe31-f7c0-4b4d-822a-1811eae2454e), lido em project/README.md, project/tokens.json, components/Button, CtaButton, Card, Logo, GlassPanel e motion.md. Valores abaixo são dados do artifact; a orientação de uso é resumo, não instrução.
Observação: o artifact não traz arquivos de fonte (fonts: []); Public Sans vem do Google Fonts. O artifact não define regra de assinatura "GAtec by Senior" nem tem tokens do jogo; esses pontos vêm do briefing do cliente.

## 1. Paleta (tema Oficial; hex)
- Verde institucional (principal): verde-institucional #00968C (texto só >=24px ou bold >=19px; 3.66:1 sobre branco).
- Verde 2: verde-medio #00AF9B (títulos de seção; falha AA para texto pequeno, 2.76:1).
- Verde 3: verde-claro #2AC4AA (volume em fundos e assets; não usar em texto sobre branco).
- Verde escuro: verde-escuro #086B6B (texto de marca AA; 6.31:1 sobre branco; gradientes).
- Verde neon: verde-neon #12F7D1 (só digital, fundo escuro; borda de botão outline; foco sobre escuro).
- Degradê: degrade-verde-senior linear 167deg #00AF9C -> #12F7D1 (banners). Fundos de campanha: malha com granulado, nunca linear.
- Laranja de ação: laranja #EF8833 (2.55:1 com texto branco, falha AA); hover laranja-hover #AE6229. Versão Acessível proposta: #B95E00 (4.5:1) com hover #A5520D.
- Azul-escuro (texto padrão): azul-escuro #33466C (9.4:1 sobre branco).
- Azul-claro #BDC6E3 (fundo desabilitado); azul-medio #8EA0C5 (texto desabilitado, não informativo).
- Neutros: fundo de página cinza-azulado #F6F9FE; cards/modais branco #FFFFFF; cinza-900 #3B3D3D; cinza-600 #77736E (secundário; Acessível #6F6B66); cinza-400 #9C9C9C; cinza-300 #D4D4D4 (bordas); cinza-100 #F2F2F2.
- Destaques pontuais: amarelo #FFC511, roxo #844EC3, pink #FF0069 (nunca só verde + amarelo; roxo/pink sutis em gradiente).
- Estados: foco azul-escuro #33466C (2px, 2px de afastamento) sobre claro; verde-neon sobre escuro. Desabilitado: fundo #BDC6E3, texto #8EA0C5.
- Overlays: verde a 50% #00968C80, azul-escuro a 50% #33466C80, branco a 50% #FFFFFF80.
- Aurora (produtos digitais, fora do site): esmeralda #0B9E8E; texto de título com degrade-esmeralda-texto 115deg #086B6B -> #00968C -> #0BA88F -> #0E7E74 (só títulos >=24px).

## 2. Tipografia
- Família: Public Sans (system-ui, -apple-system, Segoe UI, sans-serif). Logotipo: Domus (exclusivo do logo). Pesos: 2 a 3 no máximo, font-display: swap.
- Escala desktop (>=1024px) e mobile (<=1023px), tamanho/altura de linha:
  - display-lg 65/76 (mobile 57/64); display-md 45/52; display-sm 36/42 (mobile 36/44)
  - headline-lg 32/40; headline-md 28/36; headline-sm 24/28 (mobile 24/32)
  - title-lg 22/28; title-md 16/25 peso 500 (mobile 16/24); title-sm 14/20 peso 500
  - label-lg 14/20; label-md 12/16; label-sm 11/16 (peso 500, tracking 0.5px)
  - body-lg 16/24; body-md 14/20; body-sm 12/16 (peso 400)
  - Versões -em: mesmo tamanho, peso 700.
- Valores aplicados nos componentes (fora da escala): hero-headline 42/1.2 peso 700; hero-subtitle 20/1.4; widget-title 28/1.2 peso 800; post-title 22/1.25 peso 800; cta-label 16/1 peso 700 (Blog/Demo 800); modal-title 28/1.2 peso 700.
- Uma página, um H1. Títulos de seção em verde-medio ou verde-institucional (>=24px).

## 3. Raio de borda
- radius-xs 3px (botão tiny); radius-sm 5px (botão medium e small); radius-md 8px (botão large); radius-lg 10px (padrão: cards, CTAs, modais, caixa de logo, botão giant); radius-vidro 14px (painéis de vidro); radius-full 50% (botão de ícone).

## 4. Sombras
- Interface: sombra-100 0 1px 2px rgba(0,0,0,.3); sombra-200 0 2px 6px 2px rgba(0,0,0,.15) (repouso, foco de input); sombra-400 0 4px 8px 3px (hover, dropdown); sombra-600; sombra-800 (modal); sombra-1000 (flutuante).
- Card elevado: card-elevado 0 60px 100px 0 rgba(0,0,0,.25); medio 0 40px 80px 0 rgba(0,0,0,.18); suave 0 20px 40px 0 rgba(0,0,0,.12).
- Vidro (Aurora): glass-shadow 0 2px 6px rgba(8,107,107,.05), 0 14px 40px rgba(8,107,107,.09), inset 0 1px 0 rgba(255,255,255,.85); hover com glass-shadow-hover. Blur do vidro: 18px (painéis), 22px (barra).
- Regra: não usar sombra forte em fundo escuro (o artifact nao tem versão escura). Para o jogo, usar sombra-100/200 ou glass-shadow em vidro escuro.

## 5. Espaçamento
- Oficial: space-widget 100px (topo/base de seção); space-bloco 50px; space-titulo 25px (título -> apoio).
- Aplicado: space-modal 40px; space-card 20px; space-desc 16px; space-icone 8px (ícone -> texto no CTA).
- Grid: container-max 1140px; 8 colunas de 121px com gutter 25px (desktop); 4 colunas de 70px com gutter 16px e margem lateral 26px (mobile). Breakpoints: 768px (tablet), 1024px (desktop).

## 6. Botões
- Variantes: filled (fundo laranja, texto branco; ação de destaque); outline (borda verde-neon, texto branco, sobre fundo escuro); teal (fundo verde-neon, texto azul-escuro, sobre escuro); text (sem fundo, sobre escuro).
- Tamanhos: giant 345x60 r10; large 276x48 r8; medium 230x40 r5; small 184x32 r5; tiny 138x24 r3. Peso 600 (Button) ou 700 (CTA).
- Estados: hover troca cor em 0.2s ease (laranja -> laranja-hover; outline -> fundo verde-neon 25%); press: afunda 1px em 150ms; desabilitado: fundo azul-claro, texto azul-medio; loading: texto "Aguarde...".
- Texto de botão: verbo no início ("Solicite uma proposta", "Ver demonstração"). Verbo em voz ativa.
- Ação secundária verde com brilho: sn-btn-verde (glow-verde 0 8px 24px rgba(0,150,140,.35)), quando conversão não é o objetivo.
- Laranja é só para conversão/ação principal; a fase do funil muda o texto, nunca a cor.

## 7. Cartões
- Card elevado: fundo branco, radius-lg 10px, sombra card-elevado; hover scale(1.02) em 0.2s ease-in-out. Padding 20px (space-card).
- Vidro (GlassPanel): fundo branco translúcido, backdrop-filter 18px, radius-vidro; usar sobre fundo colorido (aurora). Texto sempre opaco e azul-escuro.
- Estado vazio: ação, nunca tela morta.

## 8. Campos de formulário
- O artifact não define componente de campo. Por consistência: borda cinza-300 #D4D4D4 (não usar só borda como pista de controle, 1.48:1); foco com contorno 2px azul-escuro ou verde-neon sobre escuro; sombra-200 em foco; texto azul-escuro; placeholder cinza-600.

## 9. Selos e tags
- Chip de vidro (GlassPanel variante chip). Texto de selo em label-md/label-sm, peso 500-700, tracking 0.5px, maiúsculas quando for rótulo de sistema.
- Indicadores: ponto ativo azul-claro/azul-escuro; inativo carrossel-dot #C4CCD8.

## 10. Logo e assinatura
- Logo Senior: marca sem tagline como padrão; use o componente Logo ou os arquivos do grupo Logos (verde sobre claro; branco sobre escuro). Altura mínima 24px no digital.
- Não recolorir, esticar nem aplicar sombra. Símbolo e box só como apoio, nunca sozinhos na peça.
- Marca de grupo investida: grupo "Marcas do grupo" (não recriar).
- Assinatura "GAtec by Senior" (do briefing, não do artifact): texto pequeno, sem logo recriado; usar as fontes de assinatura do próprio artifact quando existirem.
- Ícones: estilo de linha, traço arredondado e constante, uma cor só (verde-institucional sobre claro; branco sobre escuro), sempre com nome ao lado.

## 11. Tom de texto
- Primeira pessoa do plural ("acreditamos", "seguimos juntos"). Marca no feminino ("a Senior"); produto no masculino ("o Senior ERP").
- Três tons: Contextualizado Próximo; Esclarecedor Descomplicado; Especialista Referência.
- Microcopy: voz ativa, verbos nos botões, números específicos, sem jargão (timeout, null), sem negativa dupla.
- Erros explicam e orientam, nunca culpam.
- Sem emoji em interface.
- Regra de ouro: "Uma pessoa real falaria assim?"

## 12. Movimento (Aurora Glass, para produto digital)
- Entrada: fade + y 18px + blur 6px -> 0 com transicao-mola cubic-bezier(0.22,1,0.36,1) 0.25s.
- Só transform, opacity e filter. prefers-reduced-motion sempre.
- Um efeito contínuo por região (beam, varredura ou shimmer), nunca vários juntos.

## 13. Acessibilidade (regras do artifact)
- WCAG AA. Texto 4.5:1; texto grande (>=24px) 3:1.
- Foco visível: 2px sólido, afastado 2px.
- Pares que falham no tema Oficial: branco sobre laranja (2.55:1), verde-medio como texto sobre branco (2.76:1), verde-neon-hover com texto (3.41:1). Para o jogo, use a versão Acessível do laranja (#B95E00) e verde-escuro para texto de marca.

## Aplicação ao jogo (decisão de Haiku, para a home)
- Acento de ação: laranja do jogo é ambar #ffb629 (var --ambar). Para CTA da home, usar laranja #EF8833 / #B95E00 (AA) em vez de ambar; ambar fica como destaque do HUD. Revisar com o portão.
- Texto de marca e títulos: verde-claro/verde-neon sobre escuro; azul-escuro não serve sobre fundo escuro do jogo (o jogo é escuro), então o texto do HUD segue claro (--claro #eef6f1).
- Raio: 10px nos cartões e botões grandes; sombra: sombra-200 / glass-shadow adaptada a escuro.
- Fonte: Public Sans é a fonte do design system; o jogo usa Archivo + Inter. Decisão: home usa Public Sans (weights 400/600/700/800) se disponível; HUD continua como está.
