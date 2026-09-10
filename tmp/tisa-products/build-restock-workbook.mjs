import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/thuta/personal/tisa/output";
const outputPath = `${outputDir}/TISA_Products_Restock_2026-27.xlsx`;

const sourceRows = [
  ["Liverpool", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/242450058?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Liverpool", "Home", 1, 1, 0, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/232655559?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Manchester United", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/235150138?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Manchester United", "Home", 1, 2, 1, 2, 2, "https://baocheng3f888.x.yupoo.com/albums/239371024?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Arsenal", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/232426179?uid=1&isSubCate=false&referrercate=3517272"],
  ["Arsenal", "Home", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/231612188?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Manchester City", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/240385645?uid=1&isSubCate=false&referrercate=3517272"],
  ["Manchester City", "Home", 1, 2, 1, 2, 2, "https://baocheng3f888.x.yupoo.com/albums/232654771?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Chelsea", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/239703891?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Chelsea", "Home", 1, 2, 2, 2, 1, "https://baocheng3f888.x.yupoo.com/albums/239703775?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Real Madrid", "Away", 1, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/239903325?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Real Madrid", "Home", 1, 3, 3, 3, 2, "https://baocheng3f888.x.yupoo.com/albums/229895833?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Barcelona", "Away", 1, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/239511765?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Barcelona", "Home", 1, 3, 3, 3, 2, "https://baocheng3f888.x.yupoo.com/albums/239028951?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Atletico Madrid", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/241759715?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["PSG", "Home", 1, 2, 2, 2, 1, "https://baocheng3f888.x.yupoo.com/albums/240387395?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["PSG", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/239704078?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Bayern Munich", "Home", 1, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/237197267?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Tottenham Hotspur", "Home", 1, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/243508204?uid=1&isSubCate=false&referrercate=3517272&utm_source=qrcode"],
  ["Inter Miami", "Home", 1, 2, 2, 2, 1, ""],
  ["Manchester United (Long Sleeve)", "Home", 1, 1, 1, 2, 1, "https://baocheng3f888.x.yupoo.com/albums/238652256?uid=1&isSubCate=false&referrercate=3517272"],
  ["Arsenal (Long Sleeve)", "Home", 1, 1, 1, 2, 1, "https://baocheng3f888.x.yupoo.com/albums/238351701?uid=1&isSubCate=false&referrercate=3517272"],
  ["Manchester City (Long Sleeve)", "Home", 1, 1, 1, 2, 1, "https://baocheng3f888.x.yupoo.com/albums/238663094?uid=1&isSubCate=false&referrercate=3517272"],
  ["Liverpool (Long Sleeve)", "Home", 1, 1, 1, 2, 1, "https://baocheng3f888.x.yupoo.com/albums/239312598?uid=1&isSubCate=false&referrercate=3517272"],
  ["Barcelona (Long Sleeve)", "Home", 1, 2, 2, 2, 2, "https://baocheng3f888.x.yupoo.com/albums/245998035?uid=1&isSubCate=false&referrercate=3517272"],
  ["Real Madrid (Long Sleeve)", "Home", 1, 2, 2, 2, 2, "https://baocheng3f888.x.yupoo.com/albums/230882013?uid=1&isSubCate=false&referrercate=3517272"],
  ["Spain", "Home", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/217242729?uid=1&isSubCate=false&referrercate=3517272"],
  ["Spain", "Away", 0, 1, 1, 1, 1, "https://baocheng3f888.x.yupoo.com/albums/232197547?uid=1&isSubCate=false&referrercate=3517272"],
  ["Argentina", "Home", 1, 2, 2, 2, 2, "https://baocheng3f888.x.yupoo.com/albums/216672541?uid=1&isSubCate=false&referrercate=3517272"],
  ["France", "Home", 0, 0, 0, 0, 1, "https://baocheng3f888.x.yupoo.com/albums/217097177?uid=1&isSubCate=false&referrercate=3517272"],
];

const meta = {
  "Liverpool": ["Premier League", "Liverpool"],
  "Manchester United": ["Premier League", "Manchester United"],
  "Arsenal": ["Premier League", "Arsenal"],
  "Manchester City": ["Premier League", ""],
  "Chelsea": ["Premier League", "Chelsea"],
  "Real Madrid": ["La Liga", "Real Madrid"],
  "Barcelona": ["La Liga", "Barcelona"],
  "Atletico Madrid": ["La Liga", "Atletico Madrid"],
  "PSG": ["Ligue 1", "Paris Saint-Germain"],
  "Bayern Munich": ["Bundesliga", "Bayern Munich"],
  "Tottenham Hotspur": ["Premier League", "Tottenham Hotspur"],
  "Inter Miami": ["MLS", "Inter Miami CF"],
  "Spain": ["World Cup", "Spain"],
  "Argentina": ["World Cup", "Argentina"],
  "France": ["World Cup", "France"],
};

function baseName(sourceName) {
  return sourceName.replace(/\s*\(Long Sleeve\)$/i, "");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const grouped = new Map();
for (const row of sourceRows) {
  const [sourceName, kit, s, m, l, xl, xxl, url] = row;
  const sleeve = /long sleeve/i.test(sourceName) ? "long" : "short";
  const teamKey = baseName(sourceName);
  const key = `${teamKey}|${sleeve}`;
  if (!grouped.has(key)) grouped.set(key, { teamKey, sleeve, variants: {} });
  grouped.get(key).variants[kit.toLowerCase()] = { s, m, l, xl, xxl, url };
}

const headers = [
  "slug", "product_name", "sleeve", "league", "team", "season", "collection", "description",
  "base_price", "fabric", "country_colors", "featured", "status",
];
for (const kit of ["home", "away", "third"]) {
  headers.push(
    `${kit}_available`, `${kit}_name`, `${kit}_sku`, `${kit}_price`,
    `${kit}_front_image`, `${kit}_back_image`, `${kit}_arm_image`,
    `${kit}_stock_S`, `${kit}_stock_M`, `${kit}_stock_L`, `${kit}_stock_XL`, `${kit}_stock_2XL`,
  );
}

const productRows = [];
for (const entry of grouped.values()) {
  const [league, team] = meta[entry.teamKey] ?? ["", ""];
  const longSuffix = entry.sleeve === "long" ? " Long Sleeve" : "";
  const sellingPrice = entry.sleeve === "long" ? 75 : 65;
  const row = [
    `${slugify(entry.teamKey)}-2026-27-player${entry.sleeve === "long" ? "-long-sleeve" : ""}`,
    `${entry.teamKey} 2026/27 Player Version${longSuffix}`,
    entry.sleeve,
    league,
    team,
    "2026/27",
    "Player Version",
    "",
    sellingPrice,
    "",
    "",
    "no",
    "draft",
  ];
  for (const kit of ["home", "away", "third"]) {
    const variant = entry.variants[kit];
    if (variant) {
      row.push(
        "yes",
        `${kit[0].toUpperCase()}${kit.slice(1)} Player Version${longSuffix}`,
        "",
        sellingPrice,
        "",
        "",
        "",
        variant.s,
        variant.m,
        variant.l,
        variant.xl,
        variant.xxl,
      );
    } else {
      row.push("no", "", "", "", "", "", "", "", "", "", "", "");
    }
  }
  productRows.push(row);
}

const workbook = Workbook.create();
const products = workbook.worksheets.add("Products");
const sources = workbook.worksheets.add("Source Links");
const reference = workbook.worksheets.add("Reference");

products.showGridLines = false;
products.getRange("A1").write([headers, ...productRows]);
products.freezePanes.freezeRows(1);
products.freezePanes.freezeColumns(2);
products.getRange(`A1:AW${productRows.length + 1}`).format.font = { name: "Arial", size: 10 };
products.getRange("A1:AW1").format = {
  fill: "#0F766E",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  wrapText: true,
  verticalAlignment: "center",
};
products.getRange(`A2:AW${productRows.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#D9E3E0" };
products.getRange("A1:AW1").format.rowHeightPx = 42;
products.getRange(`A2:AW${productRows.length + 1}`).format.rowHeightPx = 24;
products.getRange("A:A").format.columnWidthPx = 300;
products.getRange("B:B").format.columnWidthPx = 390;
products.getRange("C:G").format.columnWidthPx = 130;
products.getRange("H:H").format.columnWidthPx = 180;
products.getRange("I:M").format.columnWidthPx = 105;
for (const range of ["N:T", "Z:AF", "AL:AR"]) products.getRange(range).format.columnWidthPx = 120;
for (const range of ["U:Y", "AG:AK", "AS:AW"]) {
  products.getRange(range).format.columnWidthPx = 92;
  products.getRange(`${range.split(":")[0]}2:${range.split(":")[1]}${productRows.length + 1}`).format.numberFormat = "0";
}
products.getRange(`C2:C${productRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["short", "long"] } };
products.getRange(`L2:L${productRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["yes", "no"] } };
products.getRange(`M2:M${productRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["draft", "active", "archived"] } };
for (const col of ["N", "Z", "AL"]) products.getRange(`${col}2:${col}${productRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["yes", "no"] } };
products.tables.add(`A1:AW${productRows.length + 1}`, true, "TisaProductsImport");

sources.showGridLines = false;
sources.getRange("A1:I1").merge();
sources.getRange("A1").values = [["Restock source - Player Version Products (2026/27)"]];
sources.getRange("A1:I1").format = { fill: "#0F766E", font: { name: "Arial", size: 14, bold: true, color: "#FFFFFF" }, verticalAlignment: "center" };
sources.getRange("A2:I2").merge();
sources.getRange("A2").values = [["Source: restock-orders (1).pdf. QR URLs are references only and are not imported as product images."]];
sources.getRange("A2:I2").format = { fill: "#E8F3F0", font: { name: "Arial", size: 10, color: "#315B53" } };
const sourceHeader = ["Item", "Kit", "S", "M", "L", "XL", "2XL", "Total Qty", "QR / Source URL"];
sources.getRange("A3").write([sourceHeader, ...sourceRows.map((r) => [...r.slice(0, 7), null, r[7]])]);
sources.getRange("H4").formulas = [["=SUM(C4:G4)"]];
sources.getRange(`H4:H${sourceRows.length + 3}`).fillDown();
sources.getRange(`A3:I${sourceRows.length + 3}`).format.font = { name: "Arial", size: 10 };
sources.getRange("A3:I3").format = { fill: "#134E4A", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, verticalAlignment: "center" };
sources.getRange(`A4:I${sourceRows.length + 3}`).format.borders = { preset: "all", style: "thin", color: "#D9E3E0" };
sources.getRange("A:A").format.columnWidthPx = 245;
sources.getRange("B:B").format.columnWidthPx = 90;
sources.getRange("C:H").format.columnWidthPx = 76;
sources.getRange("I:I").format.columnWidthPx = 560;
sources.getRange(`C4:H${sourceRows.length + 3}`).format.numberFormat = "0";
sources.freezePanes.freezeRows(3);
sources.tables.add(`A3:I${sourceRows.length + 3}`, true, "RestockSourceRows");

const referenceRows = [
  ["field", "instruction"],
  ["import_order", "Import Products first. Inventory balances can then be imported through the Inventory workspace."],
  ["images", "Optional. Front/back/arm image cells may remain blank and images can be uploaded later in Admin."],
  ["image_paths", "Image columns expect product-images storage paths, not the QR/source URLs from the PDF."],
  ["sleeve", "Required. Use short or long. Long-sleeve jerseys are separate products."],
  ["status", "Rows are draft because the PDF does not provide selling prices. Add a positive price and complete metadata before activating."],
  ["stock", "The PDF quantities are preserved in the Products sheet and Source Links sheet. Blank means no source value; explicit 0 means zero."],
  ["missing_team", "Manchester City is not currently in the database team reference, so its team cell is blank and must be assigned after adding the team."],
  ["source", "restock-orders (1).pdf, supplied 2026-09-09"],
];
reference.getRange("A1").write(referenceRows);
reference.showGridLines = false;
reference.getRange(`A1:B${referenceRows.length}`).format.font = { name: "Arial", size: 11 };
reference.getRange("A1:B1").format = { fill: "#0F766E", font: { name: "Arial", size: 11, bold: true, color: "#FFFFFF" } };
reference.getRange(`A2:B${referenceRows.length}`).format.borders = { preset: "all", style: "thin", color: "#D9E3E0" };
reference.getRange("A:A").format.columnWidthPx = 145;
reference.getRange("B:B").format.columnWidthPx = 720;
reference.getRange(`B2:B${referenceRows.length}`).format.wrapText = true;
reference.getRange(`A2:B${referenceRows.length}`).format.rowHeightPx = 34;
reference.tables.add(`A1:B${referenceRows.length}`, true, "ImportReference");

workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });

const productsPreview = await workbook.render({ sheetName: "Products", range: `A1:M${productRows.length + 1}`, scale: 1.3, format: "png" });
await fs.writeFile("/Users/thuta/personal/tisa/tmp/tisa-products/products-preview.png", new Uint8Array(await productsPreview.arrayBuffer()));
const sourcePreview = await workbook.render({ sheetName: "Source Links", range: `A1:I${sourceRows.length + 3}`, scale: 1.1, format: "png" });
await fs.writeFile("/Users/thuta/personal/tisa/tmp/tisa-products/source-preview.png", new Uint8Array(await sourcePreview.arrayBuffer()));
const referencePreview = await workbook.render({ sheetName: "Reference", range: `A1:B${referenceRows.length}`, scale: 1.3, format: "png" });
await fs.writeFile("/Users/thuta/personal/tisa/tmp/tisa-products/reference-preview.png", new Uint8Array(await referencePreview.arrayBuffer()));

const keyCheck = await workbook.inspect({
  kind: "table",
  range: `Products!A1:AW${productRows.length + 1}`,
  include: "values,formulas",
  tableMaxRows: 24,
  tableMaxCols: 49,
  maxChars: 26000,
});
console.log(keyCheck.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, products: productRows.length, sourceRows: sourceRows.length }));
