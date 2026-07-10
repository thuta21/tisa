import type * as XLSX from "xlsx";

export const productImportKits = ["home", "away", "third"] as const;
export const productImportStatuses = ["draft", "active", "archived"] as const;

export type ProductImportKit = (typeof productImportKits)[number];
export type ProductImportStatus = (typeof productImportStatuses)[number];

export type ProductImportReference = {
  leagues: { id: string; name: string }[];
  teams: { id: string; name: string; league_id: string | null; leagues?: { name: string } | null }[];
  seasons: { id: string; name: string }[];
  sizes: { id: string; label: string; sort_order: number }[];
};

export type ProductImportExistingProduct = {
  id: string;
  slug: string;
  product_variants?: {
    id: string;
    kit: ProductImportKit;
    sku: string | null;
  }[];
};

export type ProductImportVariantRow = {
  kit: ProductImportKit;
  available: boolean;
  name: string;
  sku: string;
  price: number | null;
  image_front_path: string;
  image_back_path: string;
  image_arm_path: string;
  stockBySize: Record<string, number>;
};

export type ProductImportRow = {
  rowNumber: number;
  slug: string;
  name: string;
  leagueName: string;
  teamName: string;
  seasonName: string;
  collection: string;
  description: string;
  basePrice: number;
  fabric: string;
  countryColors: string;
  featured: boolean;
  status: ProductImportStatus;
  variants: Record<ProductImportKit, ProductImportVariantRow>;
  existingProductId: string | null;
  matchedBy: "slug" | "sku" | null;
};

export type ProductImportIssue = {
  rowNumber: number;
  field: string;
  message: string;
};

export type ProductImportPreview = {
  rows: ProductImportRow[];
  totalRows: number;
  validRows: number;
  createCount: number;
  updateCount: number;
  issues: ProductImportIssue[];
};

type WorksheetCell = string | number | boolean | Date | null | undefined;
type WorksheetRow = WorksheetCell[];
type XlsxModule = typeof import("xlsx");

const baseHeaders = [
  "slug",
  "product_name",
  "league",
  "team",
  "season",
  "collection",
  "description",
  "base_price",
  "fabric",
  "country_colors",
  "featured",
  "status",
];

function normalizeLookupValue(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeHeader(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function slugifyImport(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cellToString(value: WorksheetCell) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toNumberCell(value: WorksheetCell) {
  const text = cellToString(value);
  if (!text) return null;
  const normalized = text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanCell(value: WorksheetCell, fallback: boolean) {
  const text = cellToString(value).toLowerCase();
  if (!text) return { value: fallback, valid: true };
  if (["yes", "y", "true", "1", "active", "available"].includes(text)) {
    return { value: true, valid: true };
  }
  if (["no", "n", "false", "0", "inactive", "unavailable"].includes(text)) {
    return { value: false, valid: true };
  }
  return { value: fallback, valid: false };
}

function buildStockHeader(kit: ProductImportKit, sizeLabel: string) {
  return `${kit}_stock_${sizeLabel}`;
}

export function buildProductImportHeaders(sizeLabels: string[]) {
  const headers = [...baseHeaders];

  for (const kit of productImportKits) {
    headers.push(
      `${kit}_available`,
      `${kit}_name`,
      `${kit}_sku`,
      `${kit}_price`,
      `${kit}_front_image`,
      `${kit}_back_image`,
      `${kit}_arm_image`,
    );

    for (const sizeLabel of sizeLabels) {
      headers.push(buildStockHeader(kit, sizeLabel));
    }
  }

  return headers;
}

function getSortedSizeLabels(reference: ProductImportReference) {
  return [...reference.sizes]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((size) => size.label);
}

function buildReferenceRows(reference: ProductImportReference) {
  const rows: string[][] = [["type", "value", "related"]];

  for (const league of reference.leagues) rows.push(["league", league.name, ""]);
  for (const team of reference.teams) rows.push(["team", team.name, team.leagues?.name ?? ""]);
  for (const season of reference.seasons) rows.push(["season", season.name, ""]);
  for (const size of getSortedSizeLabels(reference).map((label) => ({ label }))) rows.push(["size", size.label, ""]);
  for (const status of productImportStatuses) rows.push(["status", status, ""]);
  rows.push(["yes_no", "yes", ""], ["yes_no", "no", ""]);

  return rows;
}

function setColumnWidths(sheet: XLSX.WorkSheet, headers: string[]) {
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, Math.min(header.length + 4, 28)) }));
}

export async function downloadProductImportTemplate(reference: ProductImportReference) {
  const XLSX = await import("xlsx");
  const sizeLabels = getSortedSizeLabels(reference);
  const headers = buildProductImportHeaders(sizeLabels);
  const productsSheet = XLSX.utils.aoa_to_sheet([headers]);
  setColumnWidths(productsSheet, headers);

  const referenceRows = buildReferenceRows(reference);
  const referenceSheet = XLSX.utils.aoa_to_sheet(referenceRows);
  setColumnWidths(referenceSheet, referenceRows[0] ?? []);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
  XLSX.utils.book_append_sheet(workbook, referenceSheet, "Reference");
  XLSX.writeFile(workbook, `TISA_Product_Import_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function buildLookupMaps(reference: ProductImportReference) {
  const leaguesByName = new Map(reference.leagues.map((league) => [normalizeLookupValue(league.name), league]));
  const seasonsByName = new Map(reference.seasons.map((season) => [normalizeLookupValue(season.name), season]));
  const teamsByName = new Map<string, ProductImportReference["teams"]>();

  for (const team of reference.teams) {
    const key = normalizeLookupValue(team.name);
    const existing = teamsByName.get(key) ?? [];
    existing.push(team);
    teamsByName.set(key, existing);
  }

  return { leaguesByName, seasonsByName, teamsByName };
}

function buildExistingMaps(existingProducts: ProductImportExistingProduct[]) {
  const productsBySlug = new Map(existingProducts.map((product) => [normalizeLookupValue(product.slug), product]));
  const productIdsBySku = new Map<string, string>();

  for (const product of existingProducts) {
    for (const variant of product.product_variants ?? []) {
      if (!variant.sku) continue;
      productIdsBySku.set(normalizeLookupValue(variant.sku), product.id);
    }
  }

  return { productsBySlug, productIdsBySku };
}

function getCell(row: WorksheetRow, headerIndexes: Map<string, number>, header: string) {
  const index = headerIndexes.get(normalizeHeader(header));
  return index === undefined ? "" : row[index];
}

function rowIsEmpty(row: WorksheetRow) {
  return row.every((cell) => !cellToString(cell));
}

function findProductsSheet(XLSX: XlsxModule, workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames.find((name) => normalizeLookupValue(name) === "products") ?? workbook.SheetNames[0];
  return sheetName ? workbook.Sheets[sheetName] : null;
}

function parseWorksheetRows(XLSX: XlsxModule, sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<WorksheetRow>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
}

export async function parseProductImportFile(
  file: File,
  reference: ProductImportReference,
  existingProducts: ProductImportExistingProduct[],
): Promise<ProductImportPreview> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      rows: [],
      totalRows: 0,
      validRows: 0,
      createCount: 0,
      updateCount: 0,
      issues: [{ rowNumber: 1, field: "file", message: "Choose an .xlsx Excel file." }],
    };
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = findProductsSheet(XLSX, workbook);
  if (!sheet) {
    return {
      rows: [],
      totalRows: 0,
      validRows: 0,
      createCount: 0,
      updateCount: 0,
      issues: [{ rowNumber: 1, field: "Products", message: "No worksheet found." }],
    };
  }

  const worksheetRows = parseWorksheetRows(XLSX, sheet).filter((row) => !rowIsEmpty(row));
  const headerRow = worksheetRows[0] ?? [];
  const dataRows = worksheetRows.slice(1);
  const headerIndexes = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cellToString(cell));
    if (normalized) headerIndexes.set(normalized, index);
  });

  const issues: ProductImportIssue[] = [];
  const parsedRows: ProductImportRow[] = [];
  const { leaguesByName, seasonsByName, teamsByName } = buildLookupMaps(reference);
  const { productsBySlug, productIdsBySku } = buildExistingMaps(existingProducts);
  const sizeLabels = getSortedSizeLabels(reference);
  const rowsBySlug = new Map<string, number>();
  const skusByRowSlug = new Map<string, { rowNumber: number; slug: string }>();

  for (const header of ["product_name", "league", "team", "season", "base_price"]) {
    if (!headerIndexes.has(normalizeHeader(header))) {
      issues.push({ rowNumber: 1, field: header, message: `Missing required column: ${header}.` });
    }
  }

  if (dataRows.length === 0) {
    issues.push({ rowNumber: 2, field: "Products", message: "No product rows found in the workbook." });
  }

  dataRows.forEach((row, dataIndex) => {
    const rowNumber = dataIndex + 2;
    const rowIssuesStart = issues.length;
    const name = cellToString(getCell(row, headerIndexes, "product_name"));
    const slug = cellToString(getCell(row, headerIndexes, "slug")) || slugifyImport(name);
    const leagueName = cellToString(getCell(row, headerIndexes, "league"));
    const teamName = cellToString(getCell(row, headerIndexes, "team"));
    const seasonName = cellToString(getCell(row, headerIndexes, "season"));
    const basePrice = toNumberCell(getCell(row, headerIndexes, "base_price"));
    const statusText = cellToString(getCell(row, headerIndexes, "status")).toLowerCase() || "active";
    const featuredParse = parseBooleanCell(getCell(row, headerIndexes, "featured"), false);
    const variants = {} as Record<ProductImportKit, ProductImportVariantRow>;

    if (!name) issues.push({ rowNumber, field: "product_name", message: "Product name is required." });
    if (!slug) issues.push({ rowNumber, field: "slug", message: "Slug could not be generated." });
    if (!leagueName) issues.push({ rowNumber, field: "league", message: "League is required." });
    if (!teamName) issues.push({ rowNumber, field: "team", message: "Team is required." });
    if (!seasonName) issues.push({ rowNumber, field: "season", message: "Season is required." });
    if (basePrice === null || basePrice < 0) {
      issues.push({ rowNumber, field: "base_price", message: "Base price must be a number greater than or equal to 0." });
    }
    if (!featuredParse.valid) issues.push({ rowNumber, field: "featured", message: "Use yes/no or true/false." });
    if (!productImportStatuses.includes(statusText as ProductImportStatus)) {
      issues.push({ rowNumber, field: "status", message: "Status must be draft, active, or archived." });
    }

    const selectedLeague = leaguesByName.get(normalizeLookupValue(leagueName));
    if (leagueName && !selectedLeague) issues.push({ rowNumber, field: "league", message: `Unknown league: ${leagueName}.` });

    const teamsWithName = teamsByName.get(normalizeLookupValue(teamName)) ?? [];
    const selectedTeam = selectedLeague
      ? teamsWithName.find((team) => team.league_id === selectedLeague.id)
      : teamsWithName[0];
    if (teamName && !selectedTeam) {
      issues.push({
        rowNumber,
        field: "team",
        message: selectedLeague ? `Unknown team for ${selectedLeague.name}: ${teamName}.` : `Unknown team: ${teamName}.`,
      });
    }

    if (seasonName && !seasonsByName.has(normalizeLookupValue(seasonName))) {
      issues.push({ rowNumber, field: "season", message: `Unknown season: ${seasonName}.` });
    }

    const duplicateSlugRow = rowsBySlug.get(normalizeLookupValue(slug));
    if (duplicateSlugRow) {
      issues.push({ rowNumber, field: "slug", message: `Duplicate slug also appears on row ${duplicateSlugRow}.` });
    } else if (slug) {
      rowsBySlug.set(normalizeLookupValue(slug), rowNumber);
    }

    for (const kit of productImportKits) {
      const stockBySize: Record<string, number> = {};
      let stockTotal = 0;
      for (const sizeLabel of sizeLabels) {
        const stockCell = getCell(row, headerIndexes, buildStockHeader(kit, sizeLabel));
        const stock = stockCell === "" ? 0 : toNumberCell(stockCell);
        if (stock === null || stock < 0 || !Number.isInteger(stock)) {
          issues.push({ rowNumber, field: buildStockHeader(kit, sizeLabel), message: "Stock must be a whole number greater than or equal to 0." });
          stockBySize[sizeLabel] = 0;
        } else {
          stockBySize[sizeLabel] = stock;
          stockTotal += stock;
        }
      }

      const variantPrice = toNumberCell(getCell(row, headerIndexes, `${kit}_price`));
      const variantName = cellToString(getCell(row, headerIndexes, `${kit}_name`));
      const sku = cellToString(getCell(row, headerIndexes, `${kit}_sku`));
      const frontImage = cellToString(getCell(row, headerIndexes, `${kit}_front_image`));
      const backImage = cellToString(getCell(row, headerIndexes, `${kit}_back_image`));
      const armImage = cellToString(getCell(row, headerIndexes, `${kit}_arm_image`));
      const hasKitData = Boolean(variantName || sku || frontImage || backImage || armImage || variantPrice !== null || stockTotal > 0);
      const availableParse = parseBooleanCell(getCell(row, headerIndexes, `${kit}_available`), kit === "home" || hasKitData);

      if (!availableParse.valid) issues.push({ rowNumber, field: `${kit}_available`, message: "Use yes/no or true/false." });
      if (variantPrice !== null && variantPrice < 0) {
        issues.push({ rowNumber, field: `${kit}_price`, message: "Variant price must be greater than or equal to 0." });
      }

      variants[kit] = {
        kit,
        available: availableParse.value,
        name: variantName,
        sku,
        price: variantPrice,
        image_front_path: frontImage,
        image_back_path: backImage,
        image_arm_path: armImage,
        stockBySize,
      };
    }

    let existingProductId: string | null = null;
    let matchedBy: ProductImportRow["matchedBy"] = null;
    const existingBySlug = productsBySlug.get(normalizeLookupValue(slug));
    if (existingBySlug) {
      existingProductId = existingBySlug.id;
      matchedBy = "slug";
    }

    const skuProductIds = new Set<string>();
    const rowSkus = new Map<string, ProductImportKit>();
    for (const variant of Object.values(variants)) {
      if (!variant.sku) continue;
      const normalizedSku = normalizeLookupValue(variant.sku);
      const firstKit = rowSkus.get(normalizedSku);
      if (firstKit) {
        issues.push({ rowNumber, field: `${variant.kit}_sku`, message: `SKU also appears in ${firstKit}_sku for this row.` });
      } else {
        rowSkus.set(normalizedSku, variant.kit);
      }

      const seenSku = skusByRowSlug.get(normalizedSku);
      if (seenSku && seenSku.slug !== normalizeLookupValue(slug)) {
        issues.push({ rowNumber, field: `${variant.kit}_sku`, message: `SKU also appears on row ${seenSku.rowNumber}.` });
      } else {
        skusByRowSlug.set(normalizedSku, { rowNumber, slug: normalizeLookupValue(slug) });
      }

      const skuProductId = productIdsBySku.get(normalizedSku);
      if (skuProductId) skuProductIds.add(skuProductId);
    }

    if (!existingProductId && skuProductIds.size === 1) {
      existingProductId = [...skuProductIds][0] ?? null;
      matchedBy = "sku";
    } else if (!existingProductId && skuProductIds.size > 1) {
      issues.push({ rowNumber, field: "sku", message: "SKUs in this row belong to multiple existing products." });
    } else if (existingProductId && [...skuProductIds].some((productId) => productId !== existingProductId)) {
      issues.push({ rowNumber, field: "sku", message: "One or more SKUs belong to another existing product." });
    }

    if (issues.length === rowIssuesStart) {
      parsedRows.push({
        rowNumber,
        slug,
        name,
        leagueName,
        teamName,
        seasonName,
        collection: cellToString(getCell(row, headerIndexes, "collection")),
        description: cellToString(getCell(row, headerIndexes, "description")),
        basePrice: basePrice ?? 0,
        fabric: cellToString(getCell(row, headerIndexes, "fabric")),
        countryColors: cellToString(getCell(row, headerIndexes, "country_colors")),
        featured: featuredParse.value,
        status: statusText as ProductImportStatus,
        variants,
        existingProductId,
        matchedBy,
      });
    }
  });

  return {
    rows: parsedRows,
    totalRows: dataRows.length,
    validRows: parsedRows.length,
    createCount: parsedRows.filter((row) => !row.existingProductId).length,
    updateCount: parsedRows.filter((row) => row.existingProductId).length,
    issues,
  };
}
