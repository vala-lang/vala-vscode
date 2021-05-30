import * as path from 'path'
import { spawn } from 'child_process'

import { ExtensionContext, languages, IndentAction, commands } from 'vscode'

import { ValaLanguageClient } from './client'

export function activate(context: ExtensionContext) {
    let client = new ValaLanguageClient(context)

    context.subscriptions.push(client)
}


