# ASSETS.md — Registro de Assets CC0 e Procedurais

Todos os assets externos utilizados neste projeto são de domínio público sob licença **CC0 1.0 Universal** (Poly Haven), baixados localmente em `public/assets/cc0/` para execução offline/estática sem chamadas externas em tempo de execução.

Nenhum asset de jogo comercial, nenhuma marca real de máquina agrícola e nenhuma textura sem licença clara é utilizada.

---

## 1. Texturas PBR CC0 (Poly Haven — 1K JPG: Diffuse, Normal OpenGL, ARM [AO/Roughness/Metalness])

| ID Poly Haven | Nome | Autor(es) | Licença | URL Fonte | Uso no Mundo | Arquivos Locais (`public/assets/cc0/<id>/`) |
|---|---|---|---|---|---|---|
| `brown_mud_02` | Brown Mud 02 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/brown_mud_02 | Solo exposto / base da terra vermelha do Mato Grosso (com tingimento TSL laterítico `#7a331c`) | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `gravel_ground_01` | Gravel Ground 01 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/gravel_ground_01 | Estradas rurais cascalhadas, acostamentos e trilhos de caminhão/colhedora | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `concrete_floor_worn_001` | Concrete Floor Worn 001 | Dimitrios Savva, Rico Cilliers | CC0 1.0 | https://polyhaven.com/a/concrete_floor_worn_001 | Pátios da oficina, balança, base industrial, cais do porto e docas | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `asphalt_02` | Asphalt 02 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/asphalt_02 | Vias pavimentadas da controladoria, centro de gestão e acesso portuário | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `corrugated_iron_02` | Corrugated Iron 02 | Jenelle van Heerden, Sergej Majboroda | CC0 1.0 | https://polyhaven.com/a/corrugated_iron_02 | Galpões da oficina, fechamento da usina, armazém, telhados metálicos e contêineres | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `blue_metal_plate` | Blue Metal Plate | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/blue_metal_plate | Chapas pintadas desgastadas de máquinas, moendas, tanques e equipamentos portuários | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `rust_coarse_01` | Rust Coarse 01 | Dimitrios Savva, Rico Cilliers | CC0 1.0 | https://polyhaven.com/a/rust_coarse_01 | Chassis pesados, cabeços de amarração do cais, tubos industriais e desgaste de implementos | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `sparse_grass` | Sparse Grass | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/sparse_grass | Capim de beira de estrada, talhões em pousio e gramado da sede/controladoria | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `rough_wood` | Rough Wood | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/rough_wood | Paletes do armazém, cercas rurais, bancadas e decks | `diff.jpg`, `nor.jpg`, `arm.jpg` |
| `blue_plaster_wall` | Blue Plaster Wall | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/blue_plaster_wall | Alvenaria e reboco da Sede, Guarita da Balança, Controladoria e Centro de Gestão (com variação de cor por instância) | `diff.jpg`, `nor.jpg`, `arm.jpg` |

---

## 2. Céu, Atmosfera, Água e Vegetação (Procedurais via Three.js 0.187.0 + TSL)

| Sistema | Implementação | Licença / Origem | Observação |
|---|---|---|---|
| Céu físico e nuvens volumétricas | `SkyMesh` (`three/addons/objects/SkyMesh.js`) | MIT (Three.js r187) | Scattering Preetham + nuvens fBm animadas; varia continuamente de 05:30 (`amanhecer`) a 18:30 (`pôr do sol`). |
| Iluminação global baseada em imagem (IBL) | `PMREMGenerator` (`three/webgpu`) capturando `SkyMesh` | MIT (Three.js r187) | Recaptura throttled conforme avanço da hora do dia; alimenta `scene.environment`. |
| Cana-de-açúcar e palhada | Textura procedural `CanvasTexture` + geometria multi-nível (LOD0 colmos 3D + folhas curvas; LOD1 touceiras cruzadas; LOD2 faixas distantes) | Própria (gerada no app) | Animada no vértice via TSL (`time` + vento direcional) e variação de cor por instância (inclui reboleira amarelada/praga no Talhão 12). |
| Oceano / Canal portuário | Material TSL (`MeshStandardNodeMaterial`) com ondas normais duplas animadas, Fresnel e espuma de quebra-mar junto ao cais | Própria (gerada no app) | Substitui o plano liso da v5. |
| Poeira de terra vermelha e vapor | Sprites procedurais suaves em `CanvasTexture` + `Points`/instâncias | Própria (gerada no app) | Poeira levantada pela colhedora/transbordo/veículos e vapor das chaminés da usina. |

---

## 3. Tipografia e Áudio

- **Fontes**: `Archivo` e `Inter` via `next/font/google` (ou fallback local de sistema se offline).
- **Áudio**: 100% sintetizado em tempo real via Web Audio API (`src/audio/soundEngine.ts`) — sem arquivos MP3/WAV externos: ambiente rural/industrial/portuário dinâmico por posição X, motor de colhedora com ruído filtrado estéreo, passos na terra/concreto, canto de pássaros ao amanhecer, chiado de rádio, feedback positivo/negativo e arpejo de fechamento.
