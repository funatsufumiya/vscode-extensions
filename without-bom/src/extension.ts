import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.workspace.onDidOpenTextDocument(async (document) => {
        if (document.isUntitled || document.languageId === 'binary') {
            return;
        }

        const bom = '\uFEFF';
        const firstLine = document.getText(new vscode.Range(0, 0, 0, 1));

        if (firstLine.startsWith(bom)) {
            const fullText = document.getText();
            const newText = fullText.replace(bom, '');

            const edit = new vscode.WorkspaceEdit();
            const uri = document.uri;
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(fullText.length)
            );

            edit.replace(uri, fullRange, newText);
            await vscode.workspace.applyEdit(edit);
            await document.save();

            vscode.window.setStatusBarMessage('BOM removed from file', 3000);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
