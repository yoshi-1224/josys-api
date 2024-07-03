function onOpen(){
  getCallbackURL();
  SpreadsheetApp.getUi()
      .createMenu('自動連携')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('freee')
          .addItem('認証する', 'runAuth')
          .addItem('事業所IDを取得する', 'setFreeeCompanyId'))
      .addSeparator()
      .addItem('メンバー同期', 'main')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('テスト用')
        .addItem('ジョーシス: メンバー取得', 'getJosysMembers')
        .addItem('freee: 従業員取得', 'getFreeeMembers')
        .addItem('比較算出', 'writeMemberDiffsToSheet')
        .addItem('比較算出をそのまま同期', 'syncMembersToJosys'))
      .addSeparator()
      .addItem('デバイス同期', 'main1')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('テスト用')
        .addItem('ジョーシス: デバイス取得', 'getJosysDevices'))
        // .addItem('ランスコープ: デバイス取得', 'getLanscopeDevices')
        // .addItem('比較算出', 'writeDeviceDiffsToSheet')
        // .addItem('比較算出をそのまま同期', 'syncDevicesToJosys'))
      .addToUi();
}

function getCallbackURL() {
  const scriptId = ScriptApp.getScriptId();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME).getRange("C16").setValue(`https://script.google.com/macros/d/${scriptId}/usercallback`);
}