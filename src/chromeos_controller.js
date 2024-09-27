function writeChromeosDevicesToSheet(sheetName, headerRow = 1) {
    const apiClient = new ChromeosClient();
    const results = apiClient.getChromeOsDevices();
    if (!results) {
        return;
    }
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const rowToWriteFrom = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
}