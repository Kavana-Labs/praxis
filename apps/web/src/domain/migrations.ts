import { CURRENT_SCHEMA_VERSION } from "./schema";

/**
 * Forward-only document migrations.
 *
 * Each migration takes a raw document object at version N and returns the raw
 * object at version N+1. `migrateToCurrent` applies them in sequence until the
 * document reaches `CURRENT_SCHEMA_VERSION`. There are no migrations yet (we are
 * at v1), but the mechanism is in place so a future format change is a one-line
 * registry addition rather than a rewrite.
 */

export type RawDocument = Record<string, unknown> & { schemaVersion?: number };
type Migration = (doc: RawDocument) => RawDocument;

/** Map of source version -> migration that upgrades it by one step. */
const MIGRATIONS: Record<number, Migration> = {
  // 1: (doc) => ({ ...doc, schemaVersion: 2, /* transform */ }),
};

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationError";
  }
}

export function migrateToCurrent(raw: RawDocument): RawDocument {
  let doc = raw;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 0;

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new MigrationError(
      `Document schemaVersion ${version} is newer than supported version ${CURRENT_SCHEMA_VERSION}. Upgrade Praxis to open it.`,
    );
  }

  // Guard against runaway loops if a migration forgets to bump the version.
  let guard = 0;
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new MigrationError(
        `No migration registered from schemaVersion ${version}.`,
      );
    }
    doc = migrate(doc);
    const next = typeof doc.schemaVersion === "number" ? doc.schemaVersion : version;
    if (next <= version) {
      throw new MigrationError(
        `Migration from version ${version} did not advance schemaVersion.`,
      );
    }
    version = next;
    if (++guard > 100) {
      throw new MigrationError("Migration loop exceeded safety limit.");
    }
  }

  return doc;
}
