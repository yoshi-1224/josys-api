class HrbrainController {
    static getHrbrainCredentials() {
        const worksheet = SpreadsheetApp.getActiveSpreadsheet();
        const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
        const serverDomain = authSheet.getRange(CREDENTIALS_HRBRAIN_SUBDOMAIN).getValue();
        const token = authSheet.getRange(CREDENTIALS_HRBRAIN_TOKEN).getValue();
        return [serverDomain, token];
    }
    
    static writeHrbrainMembersToSheet(sheetName = "", headerRow = 1) {
        if (sheetName === "") {
            sheetName = OUTPUT_SHEET_NAME_HRBRAIN_EMPLOYEES;
        }
        const [serverDomain, token] = HrbrainController.getHrbrainCredentials();
        const columnsToFetch = Utils.getColumnsFromSheet(sheetName, headerRow);
        const apiClient = new HrbrainApiClient(serverDomain, token, columnsToFetch);
        const results = apiClient.getAllMembers();
        if (!results) {
            return;
        }
        const rowToWriteFrom = headerRow + 2;
        Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columnsToFetch), sheetName, rowToWriteFrom, 1, true);
    }

    static getMemberColumns() {
        const [serverDomain, token] = HrbrainController.getHrbrainCredentials();
        const apiClient = new HrbrainApiClient(serverDomain, token);
        const results = apiClient.getMemberColumns();
        console.log(results.length);
    }
}
