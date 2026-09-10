import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "/Users/thuta/Downloads/Jersey-stock-list-and-cashbook (1).xlsx";
const outputPath = "/Users/thuta/personal/tisa/outputs/inventory-architecture-20260909/TISA_Stock_Balance_Import_2026-09-09.xlsx";
const sourceUrl = "https://1drv.ms/x/c/aaff55ed2143b338/IQDig7Y9Qn--TrRYTZleJQIkAQ6ihc2ZKSug2bzKll12D6s?e=d5K83W";

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceValues = source.worksheets.getItem("Stock").getRange("R4:X124").values;
const existingVariants = new Set([
  "spain home", "spain away", "brazil home", "brazil away", "portugal home",
  "argentina home", "argentina away", "germany home", "france home", "france away",
  "liverpool home (red)", "arsenal home (red)", "man u home (red)",
]);
const existingTeams = new Set(["spain", "brazil", "portugal", "argentina", "germany", "france", "liverpool", "arsenal", "manchester united"]);
const teamAliases = {"man u":"manchester united","manu":"manchester united","mancity":"manchester city","man chester city":"manchester city","spur":"tottenham hotspur","miami":"inter miami","atltie":"atletico madrid","bayern munchen":"bayern munich"};
const normalize = value => String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const identify = item => {
  const normalized = normalize(item);
  if (normalized.startsWith("man chester city longsleeve")) return { kit: "home", team: "manchester city", sleeve: "long" };
  const kit = normalized.match(/\b(home|away|third)\b/)?.[1] ?? "";
  const rawTeam = normalized.split(new RegExp(`\\b${kit}\\b`))[0].trim();
  return { kit, team: teamAliases[rawTeam] ?? rawTeam, sleeve: /long\s*sleeve/.test(normalized) ? "long" : "short" };
};

const stockRows = [];
const reconciliationRows = [];
const productCreates = new Map();
for (let index = 1; index < sourceValues.length; index += 1) {
  const [itemName, s, m, l, xl, xxl, balance] = sourceValues[index];
  if (!String(itemName ?? "").trim()) continue;
  const identity = identify(itemName);
  const itemKey = normalize(itemName).replace(/\s*long\s*sleeve/, " longsleeve");
  const variantExists = existingVariants.has(itemKey);
  const productExists = identity.sleeve === "short" && existingTeams.has(identity.team);
  const action = variantExists ? "Update stock" : productExists ? "Create missing kit" : "Create draft product and kit";
  const sourceRow = index + 4;
  const quantities = [["S", s], ["M", m], ["L", l], ["XL", xl], ["2XL", xxl]];
  for (const [size, quantity] of quantities) {
    stockRows.push(["", "", itemName, "", identity.sleeve, identity.kit, size, Number(quantity), "", "", "", sourceRow]);
  }
  reconciliationRows.push([sourceRow, itemName, identity.team, identity.kit, identity.sleeve, Number(balance), action, variantExists ? "Exact known variant" : productExists ? "Existing public product" : "No public product match"]);
  if (!productExists) {
    const key = `${identity.team}:${identity.sleeve}`;
    if (!productCreates.has(key)) productCreates.set(key, [identity.team, identity.sleeve, "draft", 0, "Unassigned", "Unassigned", "Complete league, season, price and images before publishing"]);
  }
}

const workbook = Workbook.create();
const inventory = workbook.worksheets.add("Inventory");
const reconciliation = workbook.worksheets.add("Reconciliation");
const products = workbook.worksheets.add("Products to Create");
const reference = workbook.worksheets.add("Reference");

const inventoryHeaders = [["inventory_id", "variant_id", "item_name", "sku", "sleeve", "kit", "size", "quantity", "reserved", "available", "version", "source_row"]];
inventory.getRangeByIndexes(0, 0, stockRows.length + 1, inventoryHeaders[0].length).values = [...inventoryHeaders, ...stockRows];
inventory.tables.add(`A1:L${stockRows.length + 1}`, true, "InventoryImport").style = "TableStyleMedium2";
inventory.freezePanes.freezeRows(1);
inventory.showGridLines = false;
inventory.getRange(`H2:H${stockRows.length + 1}`).format.numberFormat = "#,##0";
inventory.getRange(`I2:K${stockRows.length + 1}`).format.fill = "#F3F4F6";
inventory.getRange("A1:L1").format = { fill: "#17324D", font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center" };
inventory.getUsedRange().format.font = { name: "Arial", size: 10 };
inventory.getRange("A:L").format.autofitColumns();
inventory.getRange("C:C").format.columnWidth = 34;

const reconHeaders = [["Source row", "Item", "Matched team", "Kit", "Sleeve", "Balance", "Import action", "Match basis"]];
reconciliation.getRangeByIndexes(0, 0, reconciliationRows.length + 1, 8).values = [...reconHeaders, ...reconciliationRows];
reconciliation.tables.add(`A1:H${reconciliationRows.length + 1}`, true, "ReconciliationReport").style = "TableStyleMedium2";
reconciliation.freezePanes.freezeRows(1);
reconciliation.showGridLines = false;
reconciliation.getRange("A1:H1").format = { fill: "#17324D", font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center" };
reconciliation.getUsedRange().format.font = { name: "Arial", size: 10 };
reconciliation.getUsedRange().format.autofitColumns();
reconciliation.getRange("B:B").format.columnWidth = 38;
reconciliation.getRange("G:H").format.columnWidth = 28;

const productRows = [...productCreates.values()];
products.getRangeByIndexes(0, 0, productRows.length + 1, 7).values = [["Team", "Sleeve", "Status", "Base price", "League", "Season", "Required action"], ...productRows];
products.tables.add(`A1:G${productRows.length + 1}`, true, "MissingProducts").style = "TableStyleMedium2";
products.freezePanes.freezeRows(1);
products.showGridLines = false;
products.getRange("A1:G1").format = { fill: "#17324D", font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center" };
products.getRange(`C2:G${productRows.length + 1}`).format.fill = "#FFF7D6";
products.getUsedRange().format.font = { name: "Arial", size: 10 };
products.getUsedRange().format.autofitColumns();
products.getRange("G:G").format.columnWidth = 52;

const referenceRows = [
  ["Field", "Meaning"],
  ["Source", sourceUrl],
  ["Snapshot", "Stock worksheet, Stock Balance table, downloaded 2026-09-06"],
  ["Quantity", "Authoritative remaining balance. Explicit zero clears stock."],
  ["Blank quantity", "Leaves existing stock unchanged."],
  ["XXL", "Mapped to canonical size 2XL."],
  ["Reserved / available", "Read-only. The import does not overwrite reserved stock."],
  ["Version", "The server verifies the latest version during preview and commit."],
  ["Missing products", "Created as drafts. Missing kits remain disabled until catalog details and price are completed."],
  ["Longsleeve", "Kept as a separate product identity from short-sleeve jerseys."],
];
reference.getRangeByIndexes(0, 0, referenceRows.length, 2).values = referenceRows;
reference.showGridLines = false;
reference.getRange("A1:B1").format = { fill: "#17324D", font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center" };
reference.getRange(`A2:A${referenceRows.length}`).format.font = { name: "Arial", bold: true, size: 10 };
reference.getUsedRange().format.font = { name: "Arial", size: 10 };
reference.getRange("A:A").format.columnWidth = 24;
reference.getRange("B:B").format.columnWidth = 90;
reference.getRange(`B2:B${referenceRows.length}`).format.wrapText = true;

workbook.recalculate();
const checks = await workbook.inspect({ kind: "table", range: "Inventory!A1:L12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 12 });
console.log(checks.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
for (const sheetName of ["Inventory", "Reconciliation", "Products to Create", "Reference"]) {
  const rendered = await workbook.render({ sheetName, autoCrop: "all", scale: 1.2, format: "png" });
  await fs.writeFile(`/Users/thuta/personal/tisa/outputs/inventory-architecture-20260909/${sheetName.replaceAll(" ", "_")}.png`, new Uint8Array(await rendered.arrayBuffer()));
}
await fs.mkdir(new URL(".", `file://${outputPath}`).pathname, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
