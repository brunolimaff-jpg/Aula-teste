'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RedDustEngine } from '../red-dust/engine';
import { getObjectiveSummary } from '../red-dust/logic';
import type {
  GameState,
  InteractableDef,
  MissionState,
  PerfSnapshot,
  QualityProfile,
  QualitySetting,
} from '../red-dust/types';

function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function RedDustShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RedDustEngine | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [state, setState] = useState<GameState>('title');
  const [mission, setMission] = useState<MissionState | null>(null);
  const [focused, setFocused] = useState<InteractableDef | null>(null);
  const [qualitySetting, setQualitySetting] = useState<QualitySetting>('auto');
  const [profile, setProfile] = useState<QualityProfile | null>(null);
  const [muted, setMuted] = useState(false);
  const [sens, setSens] = useState(1.0);
  const [perf, setPerf] = useState<PerfSnapshot | null>(null);
  const [showPerf, setShowPerf] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new RedDustEngine(canvas, {
      onUiSync: (snap) => {
        setState(snap.state);
        setMission(snap.mission);
        setFocused(snap.focused);
        setQualitySetting(snap.qualitySetting);
        setProfile(snap.profile);
        setMuted(snap.muted);
        setPerf(snap.perf);
      },
      onError: (msg) => setErrorMsg(msg),
    });

    engineRef.current = engine;
    engine.init();

    const onF3 = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setShowPerf((v) => !v);
      }
    };
    window.addEventListener('keydown', onF3);

    return () => {
      window.removeEventListener('keydown', onF3);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const objective = mission ? getObjectiveSummary(mission.step) : getObjectiveSummary('purge_valve');
  const ringOffset = 125.7 * (1 - (mission?.holdProgress ?? 0));

  return (
    <div id="rd-root">
      <canvas
        ref={canvasRef}
        id="rd-canvas"
        onClick={() => {
          if (state === 'playing') engineRef.current?.requestPointerLock();
        }}
      />

      {errorMsg && (
        <div className="rd-modal-backdrop">
          <div className="rd-card">
            <div className="rd-eyebrow">FALHA DE VÍDEO</div>
            <h2>Não foi possível iniciar o motor WebGL2</h2>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* TITLE SCREEN */}
      {state === 'title' && !errorMsg && (
        <div className="rd-title-scrim">
          <div className="rd-title-block">
            <div className="rd-eyebrow">USINA HORIZONTE · 05H42 · PÓS-TEMPESTADE</div>
            <h1 className="rd-title">RED DUST</h1>
            <p className="rd-premise">
              Temporal derrubou o barramento da Casa de Força. Inspecione a linha de vapor,
              isole o ramal e restabeleça a energia do pátio antes da entrada de turno.
            </p>

            <div className="rd-qual-row" role="group" aria-label="Qualidade gráfica">
              {(['auto', 'alta', 'media', 'baixa'] as QualitySetting[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  className={qualitySetting === q ? 'rd-seg-btn active' : 'rd-seg-btn'}
                  onClick={() => engineRef.current?.setQuality(q)}
                >
                  {q === 'auto' ? 'Auto' : q === 'alta' ? 'Alta' : q === 'media' ? 'Média' : 'Baixa'}
                </button>
              ))}
            </div>

            <div className="rd-actions">
              <button
                type="button"
                id="rd-start-btn"
                className="rd-btn-primary"
                onClick={() => engineRef.current?.startGame()}
              >
                <Play size={15} />
                <span>Entrar no pátio</span>
                <kbd>Enter</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAMEPLAY HUD */}
      {state === 'playing' && (
        <div className="rd-hud">
          {/* Top-left objective strip */}
          <div className="rd-obj">
            <div className="rd-obj-kicker">{objective.label}</div>
            <div className="rd-obj-detail">{objective.detail}</div>
          </div>

          {/* Top-right compact timer + pause */}
          <div className="rd-top-right">
            <span className="rd-timer">{formatElapsed(mission?.elapsedSeconds ?? 0)}</span>
            <button
              type="button"
              className="rd-icon-btn"
              title="Pausar (P)"
              onClick={() => engineRef.current?.pauseGame()}
            >
              <Pause size={15} />
              <span>Pausa</span>
            </button>
          </div>

          {/* Center reticle */}
          <div className={focused ? 'rd-reticle focused' : 'rd-reticle'} />

          {/* Context interaction prompt */}
          {focused && (
            <div
              className="rd-interact"
              onMouseDown={() => engineRef.current?.setInteractHeld(true)}
              onMouseUp={() => engineRef.current?.setInteractHeld(false)}
              onMouseLeave={() => engineRef.current?.setInteractHeld(false)}
              onTouchStart={() => engineRef.current?.setInteractHeld(true)}
              onTouchEnd={() => engineRef.current?.setInteractHeld(false)}
            >
              <div className="rd-ring-wrap">
                <svg viewBox="0 0 48 48">
                  <circle className="bg" cx="24" cy="24" r="20" />
                  <circle
                    className="fg"
                    cx="24"
                    cy="24"
                    r="20"
                    style={{ strokeDashoffset: ringOffset }}
                    transform="rotate(-90 24 24)"
                  />
                </svg>
                <span>E</span>
              </div>
              <div className="rd-interact-label">
                <strong>{focused.title}</strong>
                <small>{focused.subtitle}</small>
              </div>
            </div>
          )}

          {/* Radio subtitle strip */}
          {mission?.radioText && (
            <div className="rd-radio">
              <span>{mission.radioText}</span>
            </div>
          )}

          {/* Subtle bottom-left controls hint */}
          <div className="rd-controls-hint">
            WASD Mover · Shift Correr · Arrastar / Clique Olhar · Segurar E Interagir · P Pausa
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {state === 'paused' && (
        <div className="rd-modal-backdrop">
          <div className="rd-card">
            <div className="rd-eyebrow">PAUSA · {profile?.tier.toUpperCase() ?? 'ALTA'}</div>
            <h2>Ajustes de campo</h2>

            <div className="rd-setting-row">
              <span>Qualidade gráfica</span>
              <div className="rd-qual-row">
                {(['alta', 'media', 'baixa'] as QualitySetting[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={profile?.tier === q ? 'rd-seg-btn active' : 'rd-seg-btn'}
                    onClick={() => engineRef.current?.setQuality(q)}
                  >
                    {q === 'alta' ? 'Alta' : q === 'media' ? 'Média' : 'Baixa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rd-setting-row">
              <span>Sensibilidade da câmera</span>
              <input
                type="range"
                min={0.4}
                max={2.2}
                step={0.1}
                value={sens}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSens(v);
                  engineRef.current?.setSensitivity(v);
                }}
              />
            </div>

            <div className="rd-setting-row">
              <span>Áudio espacializado</span>
              <button
                type="button"
                className="rd-seg-btn"
                onClick={() => engineRef.current?.toggleMute()}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{muted ? 'Silenciado (M)' : 'Ativo (M)'}</span>
              </button>
            </div>

            <div className="rd-actions">
              <button
                type="button"
                className="rd-btn-primary"
                onClick={() => engineRef.current?.resumeGame()}
              >
                <Play size={15} />
                <span>Continuar</span>
              </button>
              <button
                type="button"
                className="rd-btn-secondary"
                onClick={() => engineRef.current?.restartGame()}
              >
                <RotateCcw size={15} />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / ENDING CARD */}
      {state === 'gameover' && (
        <div className="rd-modal-backdrop">
          <div className="rd-card">
            <div className="rd-eyebrow">USINA HORIZONTE · BARRAMENTO NORMALIZADO</div>
            <h2>Alimentação restabelecida</h2>
            <p>
              As turbinas retomaram rotação, os refletores do pátio acenderam e o Canavieiro
              Frota 18 foi liberado para descarga na moenda.
            </p>

            <div className="rd-checklist">
              <div>
                <Check size={15} />
                <span>Condensado purgado na Válvula V-07</span>
              </div>
              <div>
                <Check size={15} />
                <span>Ramal isolado na Seccionadora S-02</span>
              </div>
              <div>
                <Check size={15} />
                <span>Disjuntor principal fechado no QGBT-04</span>
              </div>
            </div>

            <div className="rd-summary-stat">
              <span>TEMPO DE OPERAÇÃO</span>
              <strong>{formatElapsed(mission?.elapsedSeconds ?? 0)}</strong>
            </div>

            <div className="rd-actions">
              <button
                type="button"
                id="rd-restart-btn"
                className="rd-btn-primary"
                onClick={() => engineRef.current?.restartGame()}
              >
                <RotateCcw size={15} />
                <span>Jogar novamente</span>
                <kbd>R</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPerf && perf && (
        <div className="rd-perf-box">
          {`${perf.fps} FPS · ${perf.frameMsAvg}ms (max ${perf.frameMsMax}ms)\nCalls: ${perf.drawCalls} · Tris: ${perf.triangles}\nQual: ${perf.quality}${perf.isSoftwareGl ? ' [SW]' : ''}`}
        </div>
      )}
    </div>
  );
}
