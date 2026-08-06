import Dexie from "dexie";
import type { EntityTable } from "dexie";
import type { Favicon } from "./database";

/**
 * Favicon cache is intentionally isolated from the legacy Mooogor database.
 * Opening this database can never run an old configuration schema upgrade.
 */
export const faviconDb = new Dexie("MooogorFaviconCache") as Dexie & {
  favicons: EntityTable<Favicon, "domain">;
};

faviconDb.version(1).stores({
  favicons: "domain,lastUpdated",
});
