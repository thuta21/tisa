import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("/Users/thuta/Downloads/TISA_Products_Template.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const summary = await workbook.inspect({
  kind: "workbook,sheet,table,region",
  maxChars: 12000,
  tableMaxRows: 15,
  tableMaxCols: 30,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);

