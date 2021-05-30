import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    RevealOutputChannelOn,
} from 'vscode-languageclient';

// import LSP types
import * as lsp from 'vscode-languageclient';

import {
    ExtensionContext,
    workspace,
    window,
    commands,
    TextEditor,
    TextEditorEdit,
    Uri,
    Location,
    Position,
    Range
} from 'vscode'

import * as which from 'which'

export class ValaLanguageClient {

    ls: LanguageClient | null = null

    constructor(context: ExtensionContext) {

        let serverModule = this.getLanguageServerPath()

        if (serverModule == null)
            return;

        let clientOptions: LanguageClientOptions = {
            documentSelector: ['vala', 'genie'],
            revealOutputChannelOn: RevealOutputChannelOn.Info
        };

        // default environment in non-debug mode
        let runEnvironment = { ...process.env };
        let uri;
        if (window.activeTextEditor)
            uri = window.activeTextEditor.document.uri;
        else
            uri = null;
        
        let workspaceConfiguration = workspace.getConfiguration('vls', uri);

        if (workspaceConfiguration.debugMode)
            runEnvironment['G_MESSAGES_DEBUG'] = 'all';
        if (workspaceConfiguration.failOnCriticals)
            runEnvironment['G_DEBUG'] = 'fatal-criticals';

        let serverOptions: ServerOptions = {
            run: {
                command: serverModule,
                transport: TransportKind.stdio,
                options: {
                    env: runEnvironment
                }
            },
            debug: {
                command: serverModule,
                options: {
                    env: {
                        ...process.env,
                        G_MESSAGES_DEBUG: 'all'
                    }
                },
                transport: TransportKind.stdio
            }
        };

        this.ls = new LanguageClient('Vala Language Server', serverOptions, clientOptions)

        commands.registerTextEditorCommand('vala.showBaseSymbol', this.peekSymbol);
        commands.registerTextEditorCommand('vala.showHiddenSymbol', this.peekSymbol);

        this.ls.start()
    }

    getLanguageServerPath(): string | null {
        let uri;
        if (window.activeTextEditor) {
            uri = window.activeTextEditor.document.uri;
        } else {
            uri = null;
        }
        return workspace.getConfiguration('vls', uri).languageServerPath
             || which.sync('vala-language-server', { nothrow: true })
             || which.sync('org.gnome.gvls.stdio.Server', { nothrow: true })
             || which.sync('gvls', { nothrow: true })   // for legacy GVLS
    }

    peekSymbol(editor: TextEditor, edit: TextEditorEdit, lspCurrentLocation: lsp.Location, lspTargetLocation: lsp.Location): void {
        let currentLocation = new Location(
            Uri.parse(lspCurrentLocation.uri),
            new Range(
                new Position(lspCurrentLocation.range.start.line, lspCurrentLocation.range.start.character),
                new Position(lspCurrentLocation.range.end.line, lspCurrentLocation.range.end.character)
            )
        );
        let targetLocation = new Location(
            Uri.parse(lspTargetLocation.uri),
            new Range(
                new Position(lspTargetLocation.range.start.line, lspTargetLocation.range.start.character),
                new Position(lspTargetLocation.range.end.line, lspTargetLocation.range.end.character)
            )
        );

        commands.executeCommand(
            'editor.action.peekLocations',
            currentLocation.uri, // anchor uri and position
            currentLocation.range.end,
            [targetLocation], // results (vscode.Location[])
            'peek', // mode ('peek' | 'gotoAndPeek' | 'goto')
            'Nothing found' // <- message
        );
    }

    dispose() {
        if (this.ls) {
            this.ls!.stop()

            this.ls = null
        }
    }
}
