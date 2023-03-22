import { DenoBridge } from "../adapter/node.ts";

const bridge = new DenoBridge()

export const nodeExports = bridge.export({
	helloCallOnNode(a:number) {
		return 1
	}
})

const deno = await bridge.connect<typeof import("../deno/main.ts").denoExports>(new URL('file://../deno/main.ts'));
deno.hello(3)

