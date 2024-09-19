function getJamfCredentials() {
  const worksheet = SpreadsheetApp.getActiveSpreadsheet();
  const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
  const serverDomain = authSheet.getRange(CREDENTIALS_JAMF_SERVER_DOMAIN).getValue();
  const loginId = authSheet.getRange(CREDENTIALS_JAMF_LOGIN_ID).getValue();
  const password = authSheet.getRange(CREDENTIALS_JAMF_PASSWORD).getValue();
  return [serverDomain, loginId, password];
}

function writeJamfDevicesToSheet(sheetName, headerRow = 1) {
  const [serverDomain, loginId, password] = getJamfCredentials();
  const apiClient = new JamfApiClient(serverDomain, loginId, password);
  const results = apiClient.getComputerInventoryRecords(1000);
  if (!results) {
    return;
  }
  const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
  const writeFromRow = headerRow + 2;
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
}