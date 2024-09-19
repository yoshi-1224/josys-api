function getHrbrainCredentials() {
    const worksheet = SpreadsheetApp.getActiveSpreadsheet();
    const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
    const serverDomain = authSheet.getRange(CREDENTIALS_HRBRAIN_SUBDOMAIN).getValue();
    const token = authSheet.getRange(CREDENTIALS_HRBRAIN_TOKEN).getValue();
    return [serverDomain, token];
  }
  
function writeHrbrainMembersToSheet(sheetName, headerRow = 1) {
    const [serverDomain, token] = getHrbrainCredentials();
    const apiClient = new HrbrainApiClient(serverDomain, token);
    const results = apiClient.getAllMembers();
    if (!results) {
        return;
    }
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const writeFromRow = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
}

function getMemberColumns() {
    const [serverDomain, token] = getHrbrainCredentials();
    const apiClient = new HrbrainApiClient(serverDomain, token);
    const results = apiClient.getMemberColumns();
    console.log(results.length);
}

function getItems() {
    const [serverDomain, token] = getHrbrainCredentials();
    const apiClient = new HrbrainApiClient(serverDomain, token);
    const results = apiClient.getItemsInOrganizationPulldown("ba07316b-2807-487f-b7db-62ff55a1d612");
    console.log(results);
}