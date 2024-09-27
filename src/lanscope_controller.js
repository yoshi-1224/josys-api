function getLanscopeCredentials() {
    const worksheet = SpreadsheetApp.getActiveSpreadsheet();
    const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
    const token = authSheet.getRange(CREDENTIALS_LANSCOPE_TOKEN).getValue();
    return token;
  }
  
  function writeLanscopeDevicesToSheet(sheetName, headerRow = 1) {
    const token = getLanscopeCredentials();
    const apiClient = new LanscopeApiClient(token);
    const results = apiClient.getDevices();
    if (!results) {
      return;
    }
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const writeFromRow = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
  }