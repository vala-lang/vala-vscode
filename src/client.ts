// import LSP types
import * as lsp from 'vscode-languageclient/node';
import {
    LanguageClient,
    LanguageClientOptions,
    RevealOutputChannelOn,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

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
    Range,
    WorkspaceConfiguration
} from 'vscode'

import * as which from 'which'

export class ValaLanguageClient {

    config: WorkspaceConfiguration

    ls: LanguageClient | null = null

    constructor(_context: ExtensionContext) {
        this.config = workspace.getConfiguration('vala', window.activeTextEditor?.document.uri);
        let serverModule = this.languageServerPath;

        if (serverModule == null)
            return;

        let clientOptions: LanguageClientOptions = {
            documentSelector: ['vala', 'genie'],
            revealOutputChannelOn: RevealOutputChannelOn.Info
        };

        // default environment in non-debug mode
        let runEnvironment = { ...process.env };
        
        if (this.config.debugMode)
            runEnvironment['G_MESSAGES_DEBUG'] = 'all';
        if (this.config.failOnCriticals)
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

        this.ls = new LanguageClient('Vala Language Server', serverOptions, clientOptions);

        commands.registerTextEditorCommand('vala.showBaseSymbol', this.peekSymbol);
        commands.registerTextEditorCommand('vala.showHiddenSymbol', this.peekSymbol);

        this.ls.start();
    }

    get languageServerPath(): string | null {
        return this.config.languageServerPath
             || which.sync('vala-language-server', { nothrow: true })
             || which.sync('org.gnome.gvls.stdio.Server', { nothrow: true })
             || which.sync('gvls', { nothrow: true })   // for legacy GVLS
    }

    peekSymbol(_editor: TextEditor, _edit: TextEditorEdit, lspCurrentLocation: lsp.Location, lspTargetLocation: lsp.Location): void {
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
