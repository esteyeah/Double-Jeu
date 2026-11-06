'use client';

import type { GameSetting } from '@arcade/game-sdk';

/** Options d'un jeu (durée, manches…), éditables par l'hôte ou en lecture seule. */
export function SettingsForm({
  settings,
  config,
  onChange,
  readOnly = false,
}: {
  settings: GameSetting[] | undefined;
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  if (!settings?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {settings.map((setting) => {
        const current = setting.choices.findIndex((c) => c.value === config[setting.key]);
        const id = `setting-${setting.key}`;
        return (
          <div key={setting.key} className="flex flex-col gap-1 text-sm">
            <label htmlFor={id} className="text-muted">
              {setting.label}
            </label>
            {readOnly ? (
              <span id={id} className="font-semibold">
                {setting.choices[current]?.label ?? '—'}
              </span>
            ) : (
              <select
                id={id}
                value={current}
                onChange={(e) =>
                  onChange({ [setting.key]: setting.choices[Number(e.target.value)]?.value })
                }
                className="rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
              >
                {setting.choices.map((choice, i) => (
                  <option key={i} value={i}>
                    {choice.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
