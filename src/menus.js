function onOpen(){
  getCallbackURL();
  SpreadsheetApp.getUi()
      .createMenu('自動連携')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('freee')
          .addItem('認証する', 'runAuth')
          .addItem('事業所IDを取得する', 'setFreeeCompanyId'))
      .addSeparator()
      .addItem('メンバー同期（全ステップを実行）', 'mainFuncForMembers')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('ステップごとに実行')
        .addItem('ジョーシス: メンバー取得', 'getJosysMembers')
        .addItem('freee: 従業員取得', 'getFreeeMembers')
        .addItem('HRBrain: 従業員取得', 'getHRBrainMembers')
        .addItem('GWS: ユーザー取得', 'getGoogleWorkspaceMembers')
        .addItem('比較算出', 'writeMemberDiffsToSheet')
        .addItem('比較算出 + 同期', 'syncMembersToJosys'))
      .addSeparator()
      .addItem('デバイス同期（全ステップを実行）', 'mainFuncForDevices')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('ステップごとに実行')
        .addItem('ジョーシス: デバイス取得', 'getJosysDevices')
        .addItem('Jamf: デバイス取得', 'getJamfDevices')
        .addItem('Lanscope: デバイス取得', 'getLanscopeDevices')
        .addItem('ChromeOSデバイス: デバイス取得', 'getChromeOSDevices')
        .addItem('比較算出', 'writeDeviceDiffsToSheet')
        .addItem('比較算出 + 同期', 'syncDevicesToJosys'))
      .addSeparator()
      .addItem('データ消去', 'clearAllOutputSheets')
      .addToUi();
}

function getCallbackURL() {
  const scriptId = ScriptApp.getScriptId();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME).getRange(CREDENTIALS_FREEE_SCRIPT_ID).setValue(`https://script.google.com/macros/d/${scriptId}/usercallback`);
}