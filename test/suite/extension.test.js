const assert = require("assert");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

suite("Rigger Extension", () => {
  test("commands are registered", async () => {
    const extension = vscode.extensions.getExtension("rigger.rigger");
    assert.ok(extension, "Extension should be available");
    await extension.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("rigger.openPanel"));
    assert.ok(commands.includes("rigger.rigItUp"));
    assert.ok(commands.includes("rigger.applyEdits"));
  });

  test("open panel command does not throw", async () => {
    await vscode.commands.executeCommand("rigger.openPanel");
  });

  test("rig pipeline creates config and injects root block", async () => {
    const extension = vscode.extensions.getExtension("rigger.rigger");
    assert.ok(extension, "Extension should be available");
    await extension.activate();

    await vscode.commands.executeCommand("rigger.openPanel");
    await vscode.commands.executeCommand("rigger.rigItUp");

    const workspace = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspace, "Workspace should be open");

    const cssPath = path.join(workspace.uri.fsPath, "styles.css");
    assert.ok(fs.existsSync(cssPath), "styles.css should exist in fixture");

    const cssDoc = await vscode.workspace.openTextDocument(cssPath);
    const originalCss = cssDoc.getText();
    const configPath = path.join(workspace.uri.fsPath, "rig.config.json");
    const hadConfig = fs.existsSync(configPath);
    const originalConfig = hadConfig ? fs.readFileSync(configPath, "utf-8") : null;

    try {
      await vscode.commands.executeCommand("rigger.applyEdits");

      const updatedDoc = await vscode.workspace.openTextDocument(cssPath);
      const cssContent = updatedDoc.getText();
      assert.ok(cssContent.includes("/* rigger:start */"), "CSS should contain rigger root block");

      assert.ok(fs.existsSync(configPath), "rig.config.json should exist");
    } finally {
      const resetDoc = await vscode.workspace.openTextDocument(cssPath);
      const edit = new vscode.WorkspaceEdit();
      const range = new vscode.Range(
        resetDoc.positionAt(0),
        resetDoc.positionAt(resetDoc.getText().length)
      );
      edit.replace(resetDoc.uri, range, originalCss);
      await vscode.workspace.applyEdit(edit);
      await resetDoc.save();

      if (hadConfig && originalConfig !== null) {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(configPath),
          Buffer.from(originalConfig, "utf-8")
        );
      } else if (fs.existsSync(configPath)) {
        await vscode.workspace.fs.delete(vscode.Uri.file(configPath));
      }
    }
  });
});
