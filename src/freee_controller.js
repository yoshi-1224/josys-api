function authCallback(request) {
  const [freeeClientId, freeeClientSecret] = _getFreeeCredentials();
  var service = new FreeeApiClient(freeeClientId, freeeClientSecret).getService_();
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    Logger.log("認証に成功しました。タブを閉じてください。");
    return HtmlService.createHtmlOutput("認証に成功しました。タブを閉じてください。");
  } else {
    Logger.log("認証に失敗しました。");
    return HtmlService.createHtmlOutput("認証に失敗しました。");
  };
}

function runAuth() {
  var template = HtmlService.createTemplateFromFile("認証ダイアログ");
  const [freeeClientId, freeeClientSecret] = _getFreeeCredentials();
  var authorizationUrl = new FreeeApiClient(freeeClientId, freeeClientSecret).getService_().getAuthorizationUrl();
  template.authorizationUrl = authorizationUrl;
  var page = template.evaluate();
  SpreadsheetApp.getUi().showModalDialog(page, "認証をしてください");
}

function clearService() {
  OAuth2.createService("freee")
    .setPropertyStore(PropertiesService.getUserProperties())
    .reset();
}

function setFreeeCompanyId() {
  const freeeCompanyName = _getFreeCompanyName();
  if (!freeeCompanyName || freeeCompanyName === "") {
    _setFreeeCompanyIdCell(`事業所名を入力してください`);  
    return;
  }
  const [clientId, clientSecret] = _getFreeeCredentials();
  let companies = new FreeeApiClient(clientId, clientSecret).getCompanies();
  let freeeCompanyId;
  for (c of companies) {
    if (c["display_name"] === freeeCompanyName) {
      freeeCompanyId = c["id"];
      _setFreeeCompanyIdCell(freeeCompanyId)
      return freeeCompanyId;
    }
  }
  _setFreeeCompanyIdCell(`"${freeeCompanyName}"が見つかりませんでした`);
}

function _getFreeeAuthSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
}

function _getFreeeCredentials() {
  const authSheet = _getFreeeAuthSheet();
  return [authSheet.getRange(CREDENTIALS_FREEE_CLIENT_ID).getValue(), authSheet.getRange(CREDENTIALS_FREEE_CLIENT_SECRET).getValue()];
}

function _getFreeeCompanyId() {
  const authSheet = _getFreeeAuthSheet();
  return authSheet.getRange(CREDENTIALS_FREEE_COMPANY_ID).getValue();
}

function _setFreeeCompanyIdCell(val) {
  const authSheet = _getFreeeAuthSheet();
  authSheet.getRange(CREDENTIALS_FREEE_COMPANY_ID).setValue(val);
}

function _getFreeCompanyName() {
  const authSheet = _getFreeeAuthSheet();
  return authSheet.getRange(CREDENTIALS_FREEE_COMPANY_NAME).getValue();
}

function writeFreeeMembersToSheet(freeeSheetName, headerRow = 1) {
  const companyId = _getFreeeCompanyId();
  const [freeeClientId, freeeClientSecret] = _getFreeeCredentials();
  const freeeApiClient = new FreeeApiClient(freeeClientId, freeeClientSecret);
  const results = _getEmployeesFromFreee(companyId, freeeApiClient);
  const columns = Utils.getColumnsFromSheet(freeeSheetName, headerRow);
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), freeeSheetName, headerRow + 2, 1);
}

function _getEmployeesFromFreee(companyId, freeeApiClient) {
  let results = _mergeEmployeesList(freeeApiClient.getAllEmployees(companyId), freeeApiClient.getEmployees(companyId));
  results = _mergeEmployeesList(results, freeeApiClient.getGroupMemberships(companyId));
  _add_status(results);
  return results;
}

function _mergeEmployeesList(allEmployees, employees) {
  dict = {};
  for (const e of allEmployees) {
    dict[e["id"]] = e;
  };

  for (const e of employees) {
    dict[e["id"]] = Object.assign(dict[e["id"]], e);
  }

  return Object.values(dict);
}

function _add_status(employees) {
  const today = new Date();
  for (const e of employees) {
    if (e["retire_date"] && new Date(e["retire_date"]) < today) {
      e["status"] = "退職済";
    } else if (e["entry_date"] && new Date(e["entry_date"]) > today) {
      e["status"] = "入社前";
    } else {
      e["status"] = "在籍中";
    }
  }
}
