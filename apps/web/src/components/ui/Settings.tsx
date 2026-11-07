'use client';

import type { GameSetting } from '@arcade/game-sdk';

/** Options d'un jeu (durée, manches, composition…), éditables par l'hôte ou en lecture seule. */
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
      {settings.map((setting) =>
        setting.kind === 'multi' ? (
          <MultiSetting
            key={setting.key}
            setting={setting}
            value={Array.isArray(config[setting.key]) ? (config[setting.key] as unknown[]) : []}
            onChange={onChange}
            readOnly={readOnly}
          />
        ) : (
          <SingleSetting
            key={setting.key}
            setting={setting}
            value={config[setting.key]}
            onChange={onChange}
            readOnly={readOnly}
          />
        ),
      )}
    </div>
  );
}

function SingleSetting({
  setting,
  value,
  onChange,
  readOnly,
}: {
  setting: GameSetting;
  value: unknown;
  onChange: (patch: Record<string, unknown>) => void;
  readOnly: boolean;
}) {
  const current = setting.choices.findIndex((c) => c.value === value);
  const id = `setting-${setting.key}`;
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
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
          onChange={(e) => onChange({ [setting.key]: setting.choices[Number(e.target.value)]?.value })}
          className="w-full min-w-0 truncate rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
        >
          {setting.choices.map((choice, i) => (
            <option key={i} value={i}>
              {choice.label}
            </option>
          ))}
        </select>
      )}
      {setting.choices[current]?.hint && <span className="text-xs text-muted">{setting.choices[current]!.hint}</span>}
    </div>
  );
}

/** Choix multiples sous forme de puces à cocher, avec bornes min/max. */
function MultiSetting({
  setting,
  value,
  onChange,
  readOnly,
}: {
  setting: GameSetting;
  value: unknown[];
  onChange: (patch: Record<string, unknown>) => void;
  readOnly: boolean;
}) {
  const min = setting.min ?? 0;
  const max = setting.max ?? setting.choices.length;
  const id = `setting-${setting.key}`;
  const toggle = (v: unknown) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    if (next.length < min || next.length > max) return;
    // On garde l'ordre des choix proposés.
    onChange({ [setting.key]: setting.choices.map((c) => c.value).filter((c) => next.includes(c)) });
  };
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm sm:col-span-2">
      <span id={id} className="text-muted">
        {setting.label}{' '}
        <span className="text-xs">
          ({value.length} choisi{value.length > 1 ? 's' : ''}
          {min === max ? `, exactement ${min}` : `, de ${min} à ${max}`})
        </span>
      </span>
      {readOnly ? (
        <span className="font-semibold">
          {setting.choices
            .filter((c) => value.includes(c.value))
            .map((c) => c.label)
            .join(', ') || '—'}
        </span>
      ) : (
        <div
          className={`grid gap-1.5 ${setting.choices.some((c) => c.hint) ? 'sm:grid-cols-2' : 'grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]'}`}
          role="group"
          aria-labelledby={id}
        >
          {setting.choices.map((choice, i) => {
            const on = value.includes(choice.value);
            const locked = (on && value.length <= min) || (!on && value.length >= max);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                aria-label={choice.label}
                disabled={locked}
                onClick={() => toggle(choice.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-not-allowed ${
                  on ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'
                } ${locked ? 'opacity-60' : ''}`}
              >
                <span className="font-semibold">
                  {on ? '✓ ' : ''}
                  {choice.label}
                </span>
                {choice.hint && <span className="mt-0.5 block text-xs text-muted">{choice.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
