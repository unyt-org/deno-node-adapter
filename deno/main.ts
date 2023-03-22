import "../bridge/enable.ts";

export function calculateDifferenceOnDeno(a: number,b: number) {
	return a - b
}

export function helloFromDeno() {
	return "hello from deno"
}


const { calculateSumOnNode, helloFromNode } = await importFromNode<typeof import('../node/main.ts')>('../node/main.ts');
const { method1 } = await importFromNode<typeof import('../node/lib.ts')>('../node/lib.ts');

console.log("called on node", await calculateSumOnNode(10,5), await helloFromNode(), await method1())