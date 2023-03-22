import { NodeBridge } from "../adapter/deno.ts";

const bridge = new NodeBridge()

export const denoExports = bridge.export({
	hello(a:number) {
		return 1
	}
})

const node = await bridge.connect<typeof import("../node/main.ts").nodeExports>(new URL('../node/main.ts', import.meta.url));
node.helloCallOnNode(3)
console.log("node",node)