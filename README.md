# Deno - Node.js Cross-Realm Imports

This library enables dynamic cross-realm imports between a Deno and a Node.js process.
It can be used for projects where both Node.js and Deno specific features are required.

# Setup

In this project setup, the example modules intended to run with Deno are located in the `deno/` directory,
modules for Node.js are located in the `node/` directory.

The bridge library is located in the `bridge/` directory.
Additionally, there are configuration files for Deno (`deno.json`, `importmap.dev.json`) and Node.js (`package.json`, `tsconfig.json`).

The modules are written as Deno-compatible modules (using `.ts` extensions, ES6 imports).

## Imports in Node.js

The Node.js modules also support classic npm modules (for correct type checking, the d.ts. files for the
modules might have to be added to the import map).
HTTPS imports are still experimental in Node.js and don't necessarily work as intended.

## Running the Project

This setup is targeted for a direct typescript execution without explicit transpilation.
Deno supports this out of the box - for Node.js, the [ts-node](https://www.npmjs.com/package/ts-node) utility has to be installed (`npm i ts-node`).

The project can either be started from Deno or from Node.js.

Deno:
```bash
deno run -Aq deno/main.ts
```
Node:
```bash
ts-node node/main.ts
```

# The Import API

Cross-realm functions can be exported as normal ES6 exports from a module and imported from the
other process via the `importFromDeno()` and `importFromNode()` functions:

```typescript
// file deno.ts
export function hello() {
	return "hello from deno"
}
```
```typescript
// file node.ts
import "../bridge/enable.ts";

const { hello } = await importFromDeno('../deno.ts');
```

The only limitation is that the function parameters and return values must be JSON compatible.

Typechecking is also supported, but the module has to be explicitly specified with a generic type:
```typescript
// file node.ts
const { hello } = await importFromDeno<typeof import('../deno.ts')>('../deno.ts');
```

Similarly, a node module can export functions that can be imported from a Deno module:

```typescript
// file node.ts
export function hello() {
	return "hello from node"
}
```
```typescript
// file deno.ts
import "../bridge/enable.ts";

const { hello } = await importFromNode<typeof import('../node.ts')>('../node.ts');
```

When a function called in the other process throws an error, it is also returned in a serialized form (Error.message is returned for Error objects)




# Advanced API

For some usecases, the default `importFromDeno()` and `importFromNode()` functions might not be applicable.
In this case, the bridge api can also be directly accessed.

## Exports

With `bridge.export()`, JSON-compatible methods can be defined and consequently called by the other process.
```typescript
// create a bridge from the Deno process to the node process
import { nodeBridge } from "../adapter/deno.ts";

// define the exports available to the node process
export const denoExports = nodeBridge.export({

	methodA(a: number, b: number) {
		return a + b
	},

	methodB(a: number[], b: {x:number, y:string[]}) {
		return [a,b]
	}

})
```

Calling the `bridge.connect()` method with a file path to the respective other module launches the corresponding Deno or Node.js process and
establishes a WebSocket connection between the two process.

By setting the generic parameter for the `bridge.connect()` method, type checking for the exports can also be used:
```typescript
const exportsFromNode = await nodeBridge.connect<typeof import('../node/main.ts').nodeExports>('../node/main.ts')
```

## Custom Spawn Commands


Per default, node processes are started with `ts-node -T --esm` and Deno processes are 
started with `deno run -Aq`.

This run command can be customized with the `bridge.spawnCommand` property.

```typescript
// file denoModule.ts
import { nodeBridge } from "../bridge/deno.ts";

nodeBridge.spawnCommand = ['node'];
```


```typescript
// file nodeModule.ts
import { denoBridge } from "../bridge/node.ts";

denoBridge.spawnCommand = ['deno', 'run', '--reload'];
```


# Remarks and Issues

 * All cross-realm imported functions return a Promise, even if they are synchronous (due to async network requests)
 * Make sure to only use JSON-compatible parameters and return types, otherwise you might get unexpected serialization errors (typescript type checks cannot cover this 100% yet)
 * Web socket connections might be automatically closed after some time (tbd)
 * Due to the web socket connections, the processes don't terminate automatically and must be explicitly stopped when required (calling `Deno.exit()` or `process.exit()`)