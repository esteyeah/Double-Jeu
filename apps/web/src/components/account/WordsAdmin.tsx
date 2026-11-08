'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApiWord } from '@arcade/protocol';
import { catalog, getClientGame } from '@/games/registry';
import { api, fetchWords, loadAccount, useAccount } from '@/lib/api';
import { Button, ErrorNote, Panel } from '../ui/kit';

/** Jeux qui acceptent des mots ajoutés depuis le site. */
const wordGames = catalog.filter((g) => getClientGame(g.id)?.module.wordBank);

export function WordsAdmin() {
  const { status, user } = useAccount();
  useEffect(() => void loadAccount(), []);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="flex items-center gap-3">
        <Link href="/compte" className="text-sm text-muted hover:text-fg">
          ←
        </Link>
        <h1 className="text-xl font-bold">Mots des jeux</h1>
      </header>
      {status === 'unknown' && <p className="text-sm text-muted">Chargement…</p>}
      {status === 'anonymous' && (
        <Panel>
          <p className="text-sm">
            Cette page est réservée à l’administrateur.{' '}
            <Link href="/compte" className="text-accent">
              Connecte-toi
            </Link>
            .
          </p>
        </Panel>
      )}
      {status === 'signedIn' && !user?.admin && (
        <Panel>
          <p className="text-sm">Cette page est réservée à l’administrateur du site.</p>
        </Panel>
      )}
      {status === 'signedIn' && user?.admin && wordGames.length > 0 && <Editor />}
    </main>
  );
}

function Editor() {
  const [gameId, setGameId] = useState(wordGames[0]!.id);
  const [words, setWords] = useState<ApiWord[] | null>(null);
  const [baseCount, setBaseCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetchWords(gameId);
    if (!res.ok) return setError(res.error);
    setWords(res.words);
    setBaseCount(res.baseCount);
    setPersistent(res.persistent !== false);
  }, [gameId]);

  const gameName = wordGames.find((g) => g.id === gameId)?.name ?? gameId;
  const asText = () => (words ?? []).map((w) => w.word).join('\n');

  function download() {
    const url = URL.createObjectURL(new Blob([`${asText()}\n`], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mots-${gameId}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copie impossible : utilise plutôt « Télécharger ».');
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setDraft((d) => [d.trim(), text.trim()].filter(Boolean).join('\n'));
  }

  useEffect(() => {
    setWords(null);
    void reload();
  }, [reload]);

  async function add() {
    const list = draft.split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean);
    if (!list.length) return;
    setBusy(true);
    setError(null);
    const res = await api<{ added: ApiWord[]; skipped: { word: string; reason: string }[] }>('POST', `/api/words/${gameId}`, {
      words: list,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setReport(
      [
        `${res.added.length} mot${res.added.length > 1 ? 's' : ''} ajouté${res.added.length > 1 ? 's' : ''}.`,
        ...res.skipped.map((s) => `« ${s.word} » : ${s.reason}`),
      ].join('\n'),
    );
    // On garde dans la zone de saisie seulement les mots refusés, pour les corriger.
    setDraft(res.skipped.map((s) => s.word).join('\n'));
    await reload();
  }

  async function remove(w: ApiWord) {
    const res = await api('DELETE', `/api/words/${gameId}/${w.id}`);
    if (!res.ok) return setError(res.error);
    setWords((list) => list?.filter((x) => x.id !== w.id) ?? null);
  }

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return [...(words ?? [])].reverse().filter((w) => !f || w.word.includes(f));
  }, [words, filter]);

  return (
    <>
      {!persistent && (
        <p role="alert" className="rounded-xl border border-sabo/50 bg-sabo/10 px-4 py-3 text-sm text-sabo">
          La base de données est injoignable : les mots ajoutés maintenant seront perdus au prochain redémarrage du
          serveur. Vérifie la variable DATABASE_URL sur Render.
        </p>
      )}
      {wordGames.length > 1 && (
        <Panel>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Jeu</span>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="rounded-xl border border-line bg-bg px-3 py-2.5"
            >
              {wordGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </Panel>
      )}

      <Panel className="flex flex-col gap-3">
        <h2 className="font-semibold">Ajouter des mots à {gameName}</h2>
        <p className="text-sm text-muted">
          Un mot par ligne (ou séparés par des virgules). Ils rejoignent les {baseCount} mots de base dès la prochaine
          partie, en ligne comme sur un seul téléphone.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          aria-label="Mots à ajouter"
          placeholder={'licorne\ngrand huit\ntrottinette'}
          className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
        />
        <ErrorNote>{error}</ErrorNote>
        {report && <pre className="whitespace-pre-wrap rounded-lg font-sans border border-line bg-surface-2 px-3 py-2 text-xs">{report}</pre>}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button variant="primary" disabled={busy || !draft.trim()} onClick={() => void add()}>
            {busy ? 'Ajout…' : 'Ajouter'}
          </Button>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm hover:border-accent/60">
            Importer un fichier .txt
            <input
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Mots ajoutés ({words?.length ?? '…'})</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer"
            aria-label="Filtrer les mots"
            className="w-32 min-w-0 rounded-lg border border-line bg-bg px-2 py-1.5 text-sm"
          />
        </div>
        {words && words.length === 0 && <p className="text-sm text-muted">Aucun mot ajouté pour l’instant.</p>}
        {words && words.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
            <span className="text-muted">
              Copie de secours : garde ce fichier. Pour remettre les mots (nouvelle base…), importe-le ci-dessus puis
              « Ajouter ».
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={download}>Télécharger (.txt)</Button>
              <Button onClick={() => void copy()}>{copied ? 'Copié !' : 'Copier la liste'}</Button>
            </div>
          </div>
        )}
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((w) => (
            <li key={w.id} className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 py-1 pl-2.5 pr-1 text-sm">
              <span>{w.word}</span>
              <button
                type="button"
                onClick={() => void remove(w)}
                aria-label={`Supprimer ${w.word}`}
                className="rounded px-1.5 text-muted hover:text-sabo"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
