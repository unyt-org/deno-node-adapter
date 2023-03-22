import { DenoBridge } from "../adapter/node.ts";

const deno = await DenoBridge.connect<typeof import("../deno/main.ts").denoExports>('../deno/main.ts');

deno.hello(3)

export const nodeExports = DenoBridge.export({
	helloCallOnNode(a:number) {
		return 1
	}
})
