'use client';

import { useEffect, useRef } from 'react';
import { PARADAS, type ParadaSpec } from '../game/data';
import type { ConcreteQuality, GameState } from '../game/rules';
import { UmDiaEngine, type PerfSnapshot, type UIBridge } from '../engine/gameEngine';

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compassRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<UmDiaEngine | null>(null);

  const cargaRef = useRef<HTMLDivElement | null>(null);
  const cargaStatusRef = useRef<HTMLSpanElement | null>(null);
  const cargaFillRef = useRef<HTMLElement | null>(null);

  const trilhaRef = useRef<HTMLDivElement | null>(null);
  const relogioRef = useRef<HTMLElement | null>(null);
  const pontosRef = useRef<HTMLElement | null>(null);
  const pontosLblRef = useRef<HTMLSpanElement | null>(null);
  const btMenuRef = useRef<HTMLButtonElement | null>(null);

  const alvoRef = useRef<HTMLDivElement | null>(null);
  const alvoHoraRef = useRef<HTMLDivElement | null>(null);
  const alvoNomeRef = useRef<HTMLHeadingElement | null>(null);
  const alvoDicaRef = useRef<HTMLParagraphElement | null>(null);
  const btIrRef = useRef<HTMLButtonElement | null>(null);
  const miraRef = useRef<HTMLDivElement | null>(null);
  const ajudaRef = useRef<HTMLDivElement | null>(null);

  const falaRef = useRef<HTMLDivElement | null>(null);
  const falaAnelRef = useRef<SVGCircleElement | null>(null);
  const falaTxtRef = useRef<HTMLElement | null>(null);
  const falaSubRef = useRef<HTMLElement | null>(null);
  const btFalaRef = useRef<HTMLButtonElement | null>(null);

  const localRef = useRef<HTMLDivElement | null>(null);
  const localNomeRef = useRef<HTMLElement | null>(null);
  const localSubRef = useRef<HTMLSpanElement | null>(null);

  const avisosRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const radioRef = useRef<HTMLDivElement | null>(null);
  const radioTxtRef = useRef<HTMLSpanElement | null>(null);
  const radioTimerRef = useRef<number | null>(null);
  const localTimerRef = useRef<number | null>(null);

  const medicaoRef = useRef<HTMLDivElement | null>(null);
  const medTxtRef = useRef<HTMLSpanElement | null>(null);

  const pausaVeuRef = useRef<HTMLDivElement | null>(null);
  const pausaFolhaRef = useRef<HTMLDivElement | null>(null);
  const veuRef = useRef<HTMLDivElement | null>(null);
  const folhaRef = useRef<HTMLDivElement | null>(null);

  const mancheRef = useRef<HTMLDivElement | null>(null);
  const mancheKnobRef = useRef<HTMLElement | null>(null);
  const lastPerfTextRef = useRef('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const compass = compassRef.current;
    if (!canvas || !compass) return;

    const isTouch = matchMedia('(pointer:coarse)').matches;
    document.body.classList.toggle('toque', isTouch);
    document.body.dataset.state = 'title';

    const urlParams = new URLSearchParams(window.location.search);
    const qualParam = urlParams.get('qual');
    const initialQual: ConcreteQuality | undefined =
      qualParam === 'alta' || qualParam === 'media' || qualParam === 'baixa' ? qualParam : undefined;
    const autostart = urlParams.get('autostart');

    const ui: UIBridge = {
      setLoading: (status, pct, done) => {
        if (cargaStatusRef.current) cargaStatusRef.current.textContent = status;
        if (cargaFillRef.current) cargaFillRef.current.style.width = `${pct}%`;
        if (done && cargaRef.current) {
          cargaRef.current.style.opacity = '0';
          window.setTimeout(() => {
            if (cargaRef.current) cargaRef.current.hidden = true;
          }, 600);
        }
      },

      syncHud: (state: GameState, evidCounts) => {
        const playing = state.on;
        document.body.dataset.state = state.fim
          ? 'gameover'
          : playing
            ? 'playing'
            : 'title';

        if (trilhaRef.current) {
          trilhaRef.current.innerHTML = PARADAS.map((p, idx) => {
            const cls = state.feitas[p.id] ? 'ok' : idx === state.i ? 'now' : '';
            return `<i class="${cls}" title="${p.hora} · ${p.lugar}"></i>`;
          }).join('');
        }

        const stop = PARADAS[state.i];
        if (relogioRef.current) relogioRef.current.textContent = state.fim ? '18:30' : stop.hora;

        if (pontosRef.current && pontosLblRef.current) {
          if (state.demo) {
            pontosRef.current.textContent = `${Object.keys(state.feitas).length}/10`;
            pontosLblRef.current.textContent = 'paradas';
          } else {
            pontosRef.current.textContent = String(state.pontos);
            pontosLblRef.current.textContent = 'pontos';
          }
        }

        if (btMenuRef.current) btMenuRef.current.hidden = !playing;
        if (alvoRef.current) alvoRef.current.hidden = !playing;
        if (miraRef.current) miraRef.current.hidden = !playing;
        if (ajudaRef.current) ajudaRef.current.hidden = !playing;
        if (compassRef.current) compassRef.current.hidden = !playing;
        if (mancheRef.current) mancheRef.current.hidden = !playing;

        if (btIrRef.current) btIrRef.current.hidden = state.fim;
        if (alvoHoraRef.current && alvoNomeRef.current && alvoDicaRef.current) {
          if (state.fim) {
            alvoHoraRef.current.textContent = '18:30';
            alvoNomeRef.current.textContent = 'Dia completo';
            alvoDicaRef.current.textContent =
              'Você pode explorar a usina ou rever o relatório.';
          } else if (stop) {
            alvoHoraRef.current.textContent = stop.hora;
            alvoNomeRef.current.textContent = stop.lugar;
            alvoDicaRef.current.textContent =
              stop.quem +
              (evidCounts.total > 0 ? ` · ${evidCounts.done} de ${evidCounts.total} evidências aqui` : '');
          }
        }
      },

      showNotice: (msg) => {
        if (!avisosRef.current) return;
        const el = document.createElement('div');
        el.className = 'aviso';
        el.textContent = msg;
        avisosRef.current.appendChild(el);
        window.setTimeout(() => el.remove(), 3100);
      },

      showRadio: (msg) => {
        if (!msg || !radioRef.current || !radioTxtRef.current) return;
        radioTxtRef.current.textContent = msg;
        radioRef.current.style.opacity = '1';
        if (radioTimerRef.current) window.clearTimeout(radioTimerRef.current);
        radioTimerRef.current = window.setTimeout(() => {
          if (radioRef.current) radioRef.current.style.opacity = '0';
        }, 7200);
      },

      showLocalCard: (parada: ParadaSpec) => {
        if (!localRef.current || !localNomeRef.current || !localSubRef.current) return;
        localNomeRef.current.textContent = parada.lugar;
        localSubRef.current.textContent = `${parada.hora} · ${parada.quem}`;
        localRef.current.classList.remove('on');
        void localRef.current.offsetWidth;
        localRef.current.classList.add('on');
        if (localTimerRef.current) window.clearTimeout(localTimerRef.current);
        localTimerRef.current = window.setTimeout(() => {
          localRef.current?.classList.remove('on');
        }, 3800);
      },

      setInteractionPrompt: (visible, title, sub, btnText, ringProgress) => {
        if (!falaRef.current) return;
        falaRef.current.hidden = !visible;
        if (!visible) return;
        if (falaTxtRef.current) falaTxtRef.current.textContent = title;
        if (falaSubRef.current) falaSubRef.current.textContent = sub;
        if (btFalaRef.current) btFalaRef.current.textContent = btnText;
        if (falaAnelRef.current) {
          const offset = 125.7 * (1 - Math.max(0, Math.min(1, ringProgress)));
          falaAnelRef.current.style.strokeDashoffset = String(offset);
        }
      },

      setModalHtml: (html, centered = false, isTitle = false) => {
        if (!veuRef.current || !folhaRef.current) return;
        if (html === null) {
          veuRef.current.hidden = true;
          veuRef.current.classList.remove('meio', 'titulo');
          folhaRef.current.innerHTML = '';
          document.body.classList.remove('falando');
          if (engineRef.current?.state.on) {
            document.body.dataset.state = engineRef.current.state.fim ? 'gameover' : 'playing';
          }
          return;
        }
        veuRef.current.hidden = false;
        veuRef.current.classList.toggle('meio', Boolean(centered));
        veuRef.current.classList.toggle('titulo', Boolean(isTitle));
        folhaRef.current.innerHTML = html;
        folhaRef.current.scrollTop = 0;

        if (!isTitle) {
          document.body.classList.add('falando');
          try {
            document.exitPointerLock?.();
          } catch {
            // ignore
          }
        } else {
          document.body.dataset.state = 'title';
        }
      },

      setPauseOpen: (open, html) => {
        if (!pausaVeuRef.current || !pausaFolhaRef.current) return;
        pausaVeuRef.current.hidden = !open;
        if (open) {
          if (html !== undefined) pausaFolhaRef.current.innerHTML = html;
          document.body.classList.add('falando');
          document.body.dataset.state = 'paused';
          try {
            document.exitPointerLock?.();
          } catch {
            // ignore
          }
        } else {
          pausaFolhaRef.current.innerHTML = '';
          if (veuRef.current?.hidden) document.body.classList.remove('falando');
          if (engineRef.current?.state.on) {
            document.body.dataset.state = engineRef.current.state.fim ? 'gameover' : 'playing';
          }
        }
      },

      updatePerfOverlay: (perf: PerfSnapshot, visible: boolean) => {
        if (!medicaoRef.current || !medTxtRef.current) return;
        medicaoRef.current.hidden = !visible;
        if (!visible) return;
        const txt = [
          `backend: ${perf.backend} · qual: ${perf.quality}`,
          `fps: ${perf.fps} (${perf.avgFrameMs} ms, pior ${perf.worstFrameMs} ms)`,
          `chamadas: ${perf.draws} · tris: ${perf.triangles.toLocaleString('pt-BR')}`,
          `dpr: ${perf.pixelRatio.toFixed(2)}${perf.memoryMB != null ? ` · mem: ${perf.memoryMB} MB` : ''}`,
        ].join('\n');
        lastPerfTextRef.current = txt;
        medTxtRef.current.textContent = txt;
      },

      flashScreen: (opacity) => {
        if (flashRef.current) flashRef.current.style.opacity = String(opacity);
      },
    };

    const engine = new UmDiaEngine(canvas, compass, ui);
    engineRef.current = engine;

    engine
      .init(initialQual)
      .then(() => {
        if (autostart === '1') {
          engine.startGame(false);
        } else if (autostart === 'demo') {
          engine.startGame(true);
        }
      })
      .catch((err) => {
        console.error('Erro ao iniciar motor 3D:', err);
        if (cargaStatusRef.current) {
          cargaStatusRef.current.textContent =
            'Falha ao iniciar o contexto gráfico do navegador. Tente o modo Baixa.';
        }
      });

    // Touch joystick binding
    const manche = mancheRef.current;
    const knob = mancheKnobRef.current;
    let joyPointerId: number | null = null;
    const onJoyDown = (e: PointerEvent) => {
      joyPointerId = e.pointerId;
      manche?.setPointerCapture(e.pointerId);
      updateJoy(e);
    };
    const updateJoy = (e: PointerEvent) => {
      if (!manche || !knob || joyPointerId !== e.pointerId) return;
      const r = manche.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 36) {
        dx *= 36 / len;
        dy *= 36 / len;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      engine.setJoystick(dx / 36, dy / 36);
    };
    const onJoyUp = (e: PointerEvent) => {
      if (joyPointerId !== e.pointerId) return;
      joyPointerId = null;
      if (knob) knob.style.transform = '';
      engine.setJoystick(0, 0);
    };
    manche?.addEventListener('pointerdown', onJoyDown);
    manche?.addEventListener('pointermove', updateJoy);
    manche?.addEventListener('pointerup', onJoyUp);
    manche?.addEventListener('pointercancel', onJoyUp);

    return () => {
      manche?.removeEventListener('pointerdown', onJoyDown);
      manche?.removeEventListener('pointermove', updateJoy);
      manche?.removeEventListener('pointerup', onJoyUp);
      manche?.removeEventListener('pointercancel', onJoyUp);
      if (radioTimerRef.current) window.clearTimeout(radioTimerRef.current);
      if (localTimerRef.current) window.clearTimeout(localTimerRef.current);
      engine.dispose();
    };
  }, []);

  const handleCopyPerf = () => {
    if (!lastPerfTextRef.current) return;
    navigator.clipboard?.writeText(lastPerfTextRef.current).catch(() => {});
  };

  return (
    <div id="app">
      <canvas
        id="view"
        ref={canvasRef}
        tabIndex={0}
        data-testid="game-canvas"
        aria-label="Usina Horizonte e operação agroindustrial em 3D"
      />
      <div id="ui">
        <div id="top">
          <div className="marca">
            <i />
            <span>
              Um Dia de Safra
              <small>Senior · Agro · Usina Horizonte</small>
            </span>
          </div>
          <div id="trilha" ref={trilhaRef} aria-hidden="true" />
          <div className="dado">
            <b id="relogio" ref={relogioRef}>
              05:30
            </b>
            <span>hora do dia</span>
          </div>
          <div className="dado">
            <b id="pontos" ref={pontosRef}>
              0
            </b>
            <span id="pontosLbl" ref={pontosLblRef}>
              pontos
            </span>
          </div>
          <button
            id="btMenu"
            ref={btMenuRef}
            hidden
            type="button"
            onClick={() => engineRef.current?.togglePauseModal()}
          >
            Pausa
          </button>
        </div>

        <div id="alvo" ref={alvoRef} hidden>
          <div className="hora" id="alvoHora" ref={alvoHoraRef} />
          <h2 id="alvoNome" ref={alvoNomeRef} />
          <p id="alvoDica" ref={alvoDicaRef} />
          <div className="linha-b">
            <button
              className="bt bt-s"
              id="btIr"
              ref={btIrRef}
              type="button"
              onClick={() => engineRef.current?.goToCurrentStop()}
            >
              Ir até lá <kbd>G</kbd>
            </button>
            <button
              className="bt bt-s"
              id="btPlat"
              type="button"
              onClick={() => engineRef.current?.openPlatformModal()}
            >
              Plataforma <kbd>M</kbd>
            </button>
          </div>
        </div>

        <div id="mira" ref={miraRef} hidden />

        <div id="fala" ref={falaRef} hidden>
          <div className="anel">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle className="bg" cx="24" cy="24" r="20" />
              <circle
                className="fg"
                id="falaAnel"
                ref={falaAnelRef}
                cx="24"
                cy="24"
                r="20"
                transform="rotate(-90 24 24)"
              />
            </svg>
            <span>E</span>
          </div>
          <div className="rot">
            <b id="falaTxt" ref={falaTxtRef} />
            <small id="falaSub" ref={falaSubRef} />
          </div>
          <button
            className="bt bt-a"
            id="btFala"
            ref={btFalaRef}
            type="button"
            onPointerDown={() => engineRef.current?.setTouchHold(true)}
            onPointerUp={() => engineRef.current?.setTouchHold(false)}
            onPointerCancel={() => engineRef.current?.setTouchHold(false)}
            onClick={() => {
              if (!engineRef.current?.findObservedEvidence()) {
                engineRef.current?.openCurrentConversation();
              }
            }}
          >
            Conversar
          </button>
        </div>

        <div id="local" ref={localRef} aria-live="polite">
          <i />
          <b id="localNome" ref={localNomeRef} />
          <span id="localSub" ref={localSubRef} />
        </div>

        <div id="ajuda" ref={ajudaRef} hidden>
          WASD anda · mouse olha · Shift corre · E interage · G vai até a parada · M plataforma · P pausa
        </div>

        <div id="manche" ref={mancheRef} hidden>
          <i ref={mancheKnobRef} />
        </div>

        <div id="avisos" ref={avisosRef} aria-live="polite" />
        <div id="flash" ref={flashRef} aria-hidden="true" />
        <canvas id="bussola" ref={compassRef} width={340} height={30} hidden aria-hidden="true" />

        <div id="radio" ref={radioRef} aria-live="polite">
          <b>RÁDIO · CENTRO DE OPERAÇÕES</b>
          <span id="radioTxt" ref={radioTxtRef} />
        </div>

        <div id="medicao" ref={medicaoRef} hidden>
          <span id="medTxt" ref={medTxtRef} />
          <br />
          <button id="btMedCop" type="button" onClick={handleCopyPerf}>
            copiar medição
          </button>
        </div>

        <div className="veu meio" id="pausaVeu" ref={pausaVeuRef} hidden>
          <div className="folha" id="pausaFolha" ref={pausaFolhaRef} role="dialog" aria-modal="true" />
        </div>

        <div className="veu" id="veu" ref={veuRef} hidden>
          <div className="folha" id="folha" ref={folhaRef} role="dialog" aria-modal="true" />
        </div>

        <div id="carga" ref={cargaRef}>
          <b>Um Dia de Safra</b>
          <span id="cargaStatus" ref={cargaStatusRef}>
            Montando a operação…
          </span>
          <div className="barra-c">
            <i id="cargaFill" ref={cargaFillRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
