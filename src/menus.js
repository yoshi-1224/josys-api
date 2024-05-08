function onOpen(){
  getCallbackURL();
  SpreadsheetApp.getUi()
      .createMenu('自動連携')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('freee')
          .addItem('認証する', 'runAuth')
          .addItem('事業所IDを取得する', 'setFreeeCompanyId'))
      .addSeparator()
      .addItem('ジョーシスメンバー取得', 'getJosysMembers')
      .addItem('Freee従業員取得', 'getFreeeMembers')
      .addItem('メンバー連携', 'main')
      .addItem('メンバー連携（シート更新なし）', 'syncMembersToJosys')
      .addToUi();
}

function getCallbackURL() {
  const scriptId = ScriptApp.getScriptId();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("認証情報").getRange("C16").setValue(`https://script.google.com/macros/d/${scriptId}/usercallback`);
}
