/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	VersionedTextDocumentIdentifier
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import * as vscode from 'vscode';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	const problems = 0;
	const diagnostics: Diagnostic[] = [];
	/*while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	} */

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [

			// VARIABLES
			{
				label: 'var',
				kind: CompletionItemKind.Text,
				data: 'var'
			},
			{
				label: 'f16',
				kind: CompletionItemKind.Text,
				data: 'f16'
			},
			{
				label: 'f32',
				kind: CompletionItemKind.Text,
				data: 'f32'
			},
			{
				label: 'f64',
				kind: CompletionItemKind.Text,
				data: 'f64'
			},
			{
				label: 'f128',
				kind: CompletionItemKind.Text,
				data: 'f128'
			},
			{
				label: 'BFloat16',
				kind: CompletionItemKind.Text,
				data: 'BFloat16'
			},
			{
				label: 'String',
				kind: CompletionItemKind.Text,
				data: 'string'
			},
			{
				label: 'StringView',
				kind: CompletionItemKind.Text,
				data: 'string'
			},
			{
				label: 'i8',
				kind: CompletionItemKind.Text,
				data: 'i8'
			},
			{
				label: 'i16',
				kind: CompletionItemKind.Text,
				data: 'i16'
			},
			{
				label: 'i32',
				kind: CompletionItemKind.Text,
				data: 'i32'
			},
			{
				label: 'i64',
				kind: CompletionItemKind.Text,
				data: 'i64'
			},
			{
				label: 'i128',
				kind: CompletionItemKind.Text,
				data: 'i128'
			},
			{
				label: 'i256',
				kind: CompletionItemKind.Text,
				data: 'i256'
			},
			{
				label: 'u8',
				kind: CompletionItemKind.Text,
				data: 'u8'
			},
			{
				label: 'u16',
				kind: CompletionItemKind.Text,
				data: 'u16'
			},
			{
				label: 'u32',
				kind: CompletionItemKind.Text,
				data: 'u32'
			},
			{
				label: 'u64',
				kind: CompletionItemKind.Text,
				data: 'u64'
			},
			{
				label: 'u128',
				kind: CompletionItemKind.Text,
				data: 'u128'
			},
			{
				label: 'u256',
				kind: CompletionItemKind.Text,
				data: 'u256'
			},
			// FUNCTIONS

			{
				label: 'if',
				kind: CompletionItemKind.Text,
				data: 'if'
			},
			{
				label: 'while',
				kind: CompletionItemKind.Text,
				data: 'while'
			},
			{
				label: 'then',
				kind: CompletionItemKind.Text,
				data: 'then'
			},
			{
				label: 'else',
				kind: CompletionItemKind.Text,
				data: 'else'
			},
			{
				label: 'Carbon',
				kind: CompletionItemKind.Text,
				data: 6
			},
			
			{
				label: 'Swap',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'Size',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'fn',
				kind: CompletionItemKind.Text,
				data: 'fn'
			},
			{
				label: 'Slice',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'in',
				kind: CompletionItemKind.Text,
				data: 'in'
			},
			{
				label: 'return',
				kind: CompletionItemKind.Text,
				data: 'return'
			},
			{
				label: 'let',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'break',
				kind: CompletionItemKind.Text,
				data: 'break'
			},
			{
				label: 'continue',
				kind: CompletionItemKind.Text,
				data: 'continue'
			},
			{
				label: 'match',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'class',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'abstract',
				//the kind is markdown
				kind: CompletionItemKind.Text,
				data: 7
			},
			{
				label: 'extends',
				kind: CompletionItemKind.Text,
				data: 7
			},
			{
				label: 'private',
				kind: CompletionItemKind.Text,
				data: 7
			},
			{
				label: 'public',
				kind: CompletionItemKind.Text,
				data: 7
			},
			{
				label: 'case',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'api',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'impl',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'namespace',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'package',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'convert',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'interface',
				kind: CompletionItemKind.Text,
				data: 7
			},
			{
				label: 'choice',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'external',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'forall',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'as',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'CommonTypeWith',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'Optional',
				kind: CompletionItemKind.Text,
				data: 6
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'Contains a integer value. You can set the number of bits by using i16, i32, i64, i128, or i256.';
		} else if (item.data === 'f16') { // f numbers
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'f16 is a 16-bit floating point type. You can assign values from -65504 to 65504 to it.';
		} 
		else if (item.data === 'f32') { // f numbers
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'f32 is a 32-bit floating point type. You can assign values from -2147483648 to 2147483647 to it.';
		}
		else if (item.data === 'f64') { // f numbers
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'f64 is a 64-bit floating point type. You can assign values from -9223372036854775808 to 9223372036854775807 to it.';
		}
		else if (item.data === 'f128') { // f numbers
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'f128 is a 128-bit floating point type. You can assign values from -1.7*10^38 to 1.7*10^38 to it.';
		}
		else if (item.data === 'bFloat16') { // b numbers
			item.detail = 'Carbon Boolean Type';
			item.documentation = 'bFloat16 is a 16-bit floating point type. You can assign values from -65504 to 65504 to it.';
		}
		else if (item.data === 'i8') { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'i8 is a 8-bit signed integer type. You can assign values from -128 to 127 to it.';
		}
		else if (item.data === 'i16') { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'i16 is a 16-bit signed integer type. You can assign values from -32768 to 32767 to it.';
		}
		else if (item.data === 'i32') { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'i32 is a 32-bit signed integer type. You can assign values from -2147483648 to 2147483647 to it.';
		}
		else if (item.data === 'i64') { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'i64 is a 64-bit signed integer type. You can assign values from -9223372036854775808 to 9223372036854775807 to it.';
		}
		else if (item.data === 'i128') { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'i128 is a 128-bit signed integer type. You can assign values from -1.7*10^38 to 1.7*10^38 to it.';
		}
		else if (item.data === 'i256') { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'i256 is a 256-bit signed integer type. You can assign values from -2*2^256-1 to 2*2^256-1 to it.';
		}
		else if (item.data === 'u8') { // unsigned numbers
			item.detail = 'Carbon Unsigned Integer Type';
			item.documentation = 'u8 is a 8-bit unsigned integer type. You can assign values from 0 to 255 to it.';
		}
		else if (item.data === 'u16') { // unsigned numbers
			item.detail = 'Carbon Unsigned Integer Type';
			item.documentation = 'u16 is a 16-bit unsigned integer type. You can assign values from 0 to 65535 to it.';
		}
		else if (item.data === 'u32') { // unsigned numbers
			item.detail = 'Carbon Unsigned Integer Type';
			item.documentation = 'u32 is a 32-bit unsigned integer type. You can assign values from 0 to 4294967295 to it.';
		}
		else if (item.data === 'u64') { // unsigned numbers
			item.detail = 'Carbon Unsigned Integer Type';
			item.documentation = 'u64 is a 64-bit unsigned integer type. You can assign values from 0 to 18446744073709551615 to it.';
		}
		else if (item.data === 'u128') { // unsigned numbers
			item.detail = 'Carbon Unsigned Integer Type';
			item.documentation = 'u128 is a 128-bit unsigned integer type. You can assign values from 0 to 1.7^38-1 to it.';
		}
		else if (item.data === 'u256') { // unsigned numbers
			item.detail = 'Carbon Unsigned Integer Type';
			item.documentation = 'u256 is a 256-bit unsigned integer type. You can assign values from 0 to 2^256-1 to it.';
		}
		// functions
		else if (item.data === 'if') {
			item.detail = 'Carbon If Function';
			item.documentation = 'if is a function that returns a boolean value. It takes two parameters, a boolean value and a function. If the boolean value is true, the function will be executed. Otherwise, the function will not be executed.';
		}
		else if (item.data === 'while') {
			item.detail = 'Carbon While Function';
			item.documentation = 'while is a function that returns a boolean value. It takes two parameters, a boolean value and a function. If the boolean value is true, the function will be executed while it remains true. Otherwise, the function will not be executed.';
		}
		else if (item.data === 'then') {
			item.detail = 'Carbon Then Function';
			item.documentation = 'then is a function that executes if its corresponding if statement is true. It takes no parameters.';
		}
		else if (item.data === 'else') {
			item.detail = 'Carbon Else Function';
			item.documentation = 'else is a function that executes if its corresponding if statement is false. It takes no parameters.';
		}
		else if (item.data === 'fn') {
			item.detail = 'Carbon Function';
			item.documentation = 'A function is a block of code that can be called from other code. Functions can be used to create custom logic, to handle events, or to create reusable components. (Carbon)';
		}
		else if (item.data === 'in') {
			item.detail = 'Carbon In';
			item.documentation = "'in' returns true if the provided value is in the provided list";
		}
		else if (item.data === 'return') {
			item.detail = 'Carbon Return';
			item.documentation = 'return is a function that returns a value. It takes one parameter, a value. It is used to return a value from a function.';
		}
		else if (item.data === 'break') {
			item.detail = 'Carbon Break';
			item.documentation = 'The break keyword is used to break out of a loop.';
		}
		else if (item.data === 'continue') {
			item.detail = 'Carbon Continue';
			item.documentation = 'The continue keyword is used to continue to the next iteration of a loop.';
		}
		else if (item.data === 'true') {
			item.detail = 'Carbon True';
			item.documentation = 'true is a boolean value that is true.';
		}
		else if (item.data === 'false') {
			item.detail = 'Carbon False';
			item.documentation = 'false is a boolean value that is false.';
		}
		else if (item.data === 'var') {
			item.detail = 'Carbon Var';
			item.documentation = 'This is a variable. A variable is a non-constant value that can be assigned and reassigned a value.';
		}
		else if (item.data === 'string') {
			item.detail = 'Carbon String';
			item.documentation = 'A String is a byte sequence treated as containing UTF-8 encoded text. A StringView is a read only variation of a String, used to access the contents of a String without copying the String’s contents.';
		}
		else if (item.data === 5) {
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'Contains a floating point value that rounds-to-nearest. You can set the number of bits by using f16, f32, f64, and f128. BFloat16 is also supported.';
		}else if (item.data === 6) {
			item.detail = 'Carbon Function';
			item.documentation = 'A function is a block of code that can be called from other code. Functions can be used to create custom logic, to handle events, or to create reusable components.';
		}else if (item.data === 7) {
			item.detail = 'Class Modifier';
			item.documentation = 'A class modifier is a modifier that can be applied to a class. It can be used to modify the class’s behavior.';		
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();