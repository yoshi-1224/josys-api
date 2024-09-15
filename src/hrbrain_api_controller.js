function getHrbrainCredentials() {
    const worksheet = SpreadsheetApp.getActiveSpreadsheet();
    const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
    // const serverDomain = authSheet.getRange("F6").getValue();
    // const clientId = authSheet.getRange("F7").getValue();
    // const clientSecret = authSheet.getRange("F8").getValue();

    serverDomain = "https://temp-raksul.oapi.hrbrain.jp";
    clientSecret = "AUoHqk4fsA6pjhCYqeioalaMaKCveEccNg1L9DKW";
    clientId = "temp-raksul";
    return [serverDomain, clientId, clientSecret];
  }
  
function writeHrbrainMembersToSheet(sheetName="hrbrain_members", headerRow = 1) {
    const [serverDomain, clientId, clientSecret] = getHrbrainCredentials();
    const apiClient = new HrbrainApiClient(clientId, clientSecret);
    const results = apiClient.getAllMembers();
    if (!results) {
        return;
    }
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const writeFromRow = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
}

function getMemberColumns() {
    const [serverDomain, clientId, clientSecret] = getHrbrainCredentials();
    const apiClient = new HrbrainApiClient(clientId, clientSecret);
    const results = apiClient.getMemberColumns();
    console.log(results.length);
}