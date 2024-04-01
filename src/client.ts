// import LSP types
import * as lsp from 'vscode-languageclient/node';
import {
    LanguageClient,
    LanguageClientOptions,
    RevealOutputChannelOn,
    ServerOptions,
    Executable
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
    WorkspaceConfiguration,
    extensions
} from 'vscode'

import * as which from 'which'

const VarRegex = new RegExp(/\$\{(\w+)\}/g);
function substituteVSCodeVariableInString(val: string): string {
    return val.replace(VarRegex, (substring: string, varName) => {
        if (varName === "workspaceFolder") {
            const folders = workspace.workspaceFolders ?? [];
            if (folders.length >= 1) {
                return folders[0].uri.fsPath;
            }
        }
        return substring;
    });
}


// sync with Lsp.EditorType in vala-language-server:protocol.vala
enum EditorType {
    Unknown = 0,
    VSCode  = 1
}

// sync with Lsp.EditorOptions in vala-language-server:protocol.vala
interface EditorOptions {
    type?: EditorType,
    mesonConfigureOptions?: string[],
    mesonCompileOptions?: string[],
    mesonBuildDir?: string
}

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
            revealOutputChannelOn: RevealOutputChannelOn.Info,
            initializationOptions: this.createInitializationOptions
        };

        // default environment in non-debug mode
        let runEnvironment = { ...process.env };
        
        if (this.config.debugMode)
            runEnvironment['G_MESSAGES_DEBUG'] = 'all';
        if (this.config.failOnCriticals)
            runEnvironment['G_DEBUG'] = 'fatal-criticals';

        let runExe: Executable = {
            command: serverModule,
            options: {
                env: runEnvironment
            }
        };
        let debugExe: Executable = {
            command: serverModule,
            options: {
                env: {
                    ...process.env,
                    G_MESSAGES_DEBUG: 'all'
                }
            }
        };
        let serverOptions: ServerOptions = {
            run: runExe,
            debug: debugExe
        };

        this.ls = new LanguageClient('Vala Language Server', serverOptions, clientOptions);

        commands.registerTextEditorCommand('vala.showBaseSymbol', this.peekSymbol);
        commands.registerTextEditorCommand('vala.showHiddenSymbol', this.peekSymbol);

        this.ls.start();
    }

    get languageServerPath(): string | null {
        return substituteVSCodeVariableInString(this.config.languageServerPath)
             || which.sync('vala-language-server', { nothrow: true })
             || which.sync('org.gnome.gvls.stdio.Server', { nothrow: true })
             || which.sync('gvls', { nothrow: true })   // for legacy GVLS
    }

    createInitializationOptions(): EditorOptions {
        let options: EditorOptions = { type: EditorType.VSCode }
        // let mesonExt = extensions.getExtension("mesonbuild.mesonbuild")
        // if (mesonExt) { }
        let mesonConfig = workspace.getConfiguration('mesonbuild', window.activeTextEditor?.document.uri)
        if (mesonConfig) {
            options.mesonCompileOptions = mesonConfig.compileOptions
            if (mesonConfig.compileOptions) {
                options.mesonCompileOptions = []
                for (let option of mesonConfig.compileOptions)
                    options.mesonCompileOptions.push(substituteVSCodeVariableInString(option))
            }
            if (mesonConfig.configureOptions) {
                options.mesonConfigureOptions = []
                for (let option of mesonConfig.configureOptions)
                    options.mesonConfigureOptions.push(substituteVSCodeVariableInString(option))
            }
            if (mesonConfig.buildFolder)
                options.mesonBuildDir = substituteVSCodeVariableInString(mesonConfig.buildFolder)
        }
        return options
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
