const freeeAuthSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("認証情報");
const freeeClientId = freeeAuthSheet.getRange("C14").getValue();
const freeeClientSecret = freeeAuthSheet.getRange("C15").getValue();
const companyIdCell = freeeAuthSheet.getRange("C18");
const companyNameCell = freeeAuthSheet.getRange("C17");

function authCallback(request) {
  var service = new FreeeApi(freeeClientId, freeeClientSecret).getService_();
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
  var authorizationUrl = new FreeeApi(freeeClientId, freeeClientSecret).getService_().getAuthorizationUrl();
  template.authorizationUrl = authorizationUrl;
  var page = template.evaluate();
  SpreadsheetApp.getUi().showModalDialog(page, "認証をしてください");
}

function clearService() {
  OAuth2.createService("freee")
    .setPropertyStore(PropertiesService.getUserProperties())
    .reset();
}

function getFreeeCredentials() {
  return [freeeClientId, freeeClientSecret];
}

function getFreeCompanyId() {
  return companyIdCell.getValue();
}

function setFreeeCompanyId() {
  let freeeCompanyId = companyIdCell.getValue();
  if (!companyNameCell.getValue() || companyNameCell.getValue() === "") {
    companyIdCell.setValue(`事業所名を入力してください`);  
    return;
  }
  const [clientId, clientSecret] = getFreeeCredentials();
  let companies = new FreeeApi(clientId, clientSecret).getCompanies();
  for (c of companies) {
    if (c["display_name"] === companyNameCell.getValue()) {
      freeeCompanyId = c["id"];
      companyIdCell.setValue(freeeCompanyId);
      return freeeCompanyId;
    }
  }
  companyIdCell.setValue(`"${companyNameCell.getValue()}"が見つかりませんでした`);  
}

function writeFreeeMembersToSheet(freeeSheetName = "freee", headerRow = 1, companyId, app) {
  const results = _getEmployeesFromFreee(companyId, app);
  const columns = Utils.getColumnsFromSheet(freeeSheetName, headerRow);
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), freeeSheetName, headerRow + 2, 1);
}

function _getEmployeesFromFreee(companyId, app) {
  let results = _mergeEmployeesList(app.getAllEmployees(companyId), app.getEmployees(companyId));
  results = _mergeEmployeesList(results, app.getGroupMemberships(companyId));
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