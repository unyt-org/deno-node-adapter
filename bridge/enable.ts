// enable for deno
if (globalThis.Deno) {
	const deno = await import("./deno.ts");
	Object.defineProperty(globalThis, "importFromNode", {
		value: deno.importFromNode
	})
	Object.defineProperty(globalThis, "importFromDeno", {
		get() {throw "Cannot use 'importFromDeno' in a deno context"}
	})
}

// enable for node
else {
	const node = await import("./node.ts");
	Object.defineProperty(globalThis, "importFromNode", {
		get() {throw "Cannot use 'importFromNode' in a node context"}
	})
	Object.defineProperty(globalThis, "importFromDeno", {
		value: node.importFromDeno
	})
}

declare global {
	const importFromNode: typeof import("./deno.ts").importFromNode
	const importFromDeno: typeof import("./node.ts").importFromDeno
}