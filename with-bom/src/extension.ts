import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

function hasUtf8Bom(buffer: Buffer): boolean {
    return buffer.length >= 3 &&
        buffer[0] === 0xEF &&
        buffer[1] === 0xBB &&
        buffer[2] === 0xBF;
}

function addUtf8BomIfMissing(buffer: Buffer): Buffer {
    if (hasUtf8Bom(buffer)) {
        return buffer;
    }
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    return Buffer.concat([bom, buffer]);
}

function isIncluded(filePath: string, workspaceFolder: string, included: string[]): boolean {
    const relativePath = path.relative(workspaceFolder, filePath);
    return included.some(folder =>
        relativePath === folder || relativePath.startsWith(folder + path.sep)
    );
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
        if (document.isUntitled || document.languageId === 'binary' || document.isDirty) {
            return;
        }

        const filePath = document.uri.fsPath;
        if (!fs.existsSync(filePath)) {
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
        if (!workspaceFolder) {
            return;
        }

        const config = vscode.workspace.getConfiguration('withBom');
        const includedFolders: string[] = config.get('includeFolders') || [];

        if (!isIncluded(filePath, workspaceFolder, includedFolders)) {
            return;
        }

        try {
            const encoding = vscode.workspace.getConfiguration('files', document.uri).get<string>('encoding');
            if (encoding && encoding.toLowerCase() !== 'utf8' && encoding.toLowerCase() !== 'utf-8') {
                return;
            }

            const fileBuffer = fs.readFileSync(filePath);
            if (hasUtf8Bom(fileBuffer)) {
                return;
            }

            const newText = document.getText();
            const newBuffer = addUtf8BomIfMissing(Buffer.from(newText, 'utf8'));
            fs.writeFileSync(filePath, newBuffer as any);

            const reopened = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(reopened, { preview: false });
            vscode.window.setStatusBarMessage('✅ UTF-8 BOM added and saved', 3000);
        } catch (e) {
            console.error('Error adding BOM:', e);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
