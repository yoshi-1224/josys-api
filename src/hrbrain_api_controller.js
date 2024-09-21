function getHrbrainCredentials() {
    const worksheet = SpreadsheetApp.getActiveSpreadsheet();
    const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
    const serverDomain = authSheet.getRange(CREDENTIALS_HRBRAIN_SUBDOMAIN).getValue();
    const token = authSheet.getRange(CREDENTIALS_HRBRAIN_TOKEN).getValue();
    return [serverDomain, token];
  }
  
function writeHrbrainMembersToSheet(sheetName="", headerRow = 1) {
    if (sheetName === "") {
        sheetName = OUTPUT_SHEET_NAME_HRBRAIN_EMPLOYEES;
    }
    const [serverDomain, token] = getHrbrainCredentials();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    const columnsToFetch = sheet.getRange(1, 1, 1, getLastColumnNumber(sheet, 1)).getValues()[0];
    const apiClient = new HrbrainApiClient(serverDomain, token, columnsToFetch);
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

function getLastColumnNumber(sheet, row) {
    const lastColumn = sheet.getLastColumn();
    const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
    for (let col = lastColumn - 1; col >= 0; col--) {
        if (values[col] !== "") {
            return col + 1;
        }
    }
    return 0; // If the row is empty, return 0
}