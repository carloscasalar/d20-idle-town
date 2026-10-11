/** One step: true when that step spends the hour. A false result may still change state. */
export type Step<Subject, Context> = (subject: Subject, context: Context) => boolean;

/** Try steps in order. Stops at the first one that spends the hour. */
export function runSteps<Subject, Context>(subject: Subject, context: Context, steps: readonly Step<Subject, Context>[]): boolean {
  for (const step of steps) if (step(subject, context)) return true;
  return false;
}

/**
 * Resolve a list of step names against a registry.
 * An unknown name is an error. Configuration validation reports it first.
 */
export function resolveSteps<Subject, Context>(
  names: readonly string[],
  registry: Readonly<Record<string, Step<Subject, Context>>>,
): readonly Step<Subject, Context>[] {
  return names.map((name) => {
    const step = registry[name];
    if (!step) throw new Error(`Unknown step "${name}".`);
    return step;
  });
}
