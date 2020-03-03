import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    RevealOutputChannelOn
} from 'vscode-languageclient';

import {
    ExtensionContext,
    workspace,
    window,
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

        let serverOptions: ServerOptions = {
            run: {
                command: serverModule,
                transport: TransportKind.stdio
            },
            debug: {
                command: serverModule,
                options: {
                    env: {
                        ...process.env,
                        G_MESSAGES_DEBUG: 'all',
                        JSONRPC_DEBUG: 1
                    }
                },
                transport: TransportKind.stdio
            }
        };

        this.ls = new LanguageClient('Vala Language Server', serverOptions, clientOptions)

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
             || which.sync('gvls', { nothrow: true })
    }

    dispose() {
        if (this.ls) {
            this.ls!.stop()

            this.ls = null
        }
    }
}
