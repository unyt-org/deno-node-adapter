import "../bridge/enable.ts";

export function calculateSumOnNode(a: number, b: number) {
	return a + b
}
export function helloFromNode() {
	return "hello from node"
}

// must be called as IIFE because two top level awaits with cross-realm imports that import each other create a deadlock...
(async ()=>{
	const { calculateDifferenceOnDeno, helloFromDeno } = await importFromDeno<typeof import('../deno/main.ts')>('../deno/main.ts');
	console.log("called on deno", await calculateDifferenceOnDeno(10,5), await helloFromDeno())
})()