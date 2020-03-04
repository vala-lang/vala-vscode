# vala-vscode - Vala support for Visual Studio Code

## Syntax highlighting and code intelligence for the Vala / Genie languages

---

![screenshot](images/vls-vscode.png)

---

This extension is based off of the `vala-code` extension by T. Abreu (https://github.com/thiagoabreu) and the `vala-grammar` extension by Jereme Philippe (https://github.com/philippejer/vala-grammar).

**NOTE**: in order to get code intelligence, you must install the Vala Language Server (https://github.com/benwaffle/vala-language-server).

## How to edit the rules

The YAML source file should be edited and then converted to XML with the "TextMate Languages" extension (https://marketplace.visualstudio.com/items?itemName=Togusa09.tmlanguage).

Note that this plugin has an issue which interacts badly with language servers (false syntax errors), so it is a good idea to disable it afterwards.
