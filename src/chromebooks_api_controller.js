function writeChromebooksToSheet(sheetName, headerRow = 1) {
    const apiClient = new ChromebooksClient();
    const results = apiClient.getChromebooks();
    if (!results) {
        return;
    }
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const writeFromRow = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
}