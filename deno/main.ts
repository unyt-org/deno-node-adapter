import { NodeBridge } from "../adapter/deno.ts";

const node = await NodeBridge.connect<typeof import("../node/main.ts").nodeExports>(new URL('../node/main.ts', import.meta.url));

node.helloCallOnNode(3)

export const denoExports = NodeBridge.export({
	hello(a:number) {
		return 1
	}
})


console.log("node",node)