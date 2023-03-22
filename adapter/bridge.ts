import { ClientComEndpoint } from "./com_endpoint.ts";
import type { awaitedExports, exports } from "./types.d.ts";

export abstract class Bridge {
	exports: exports = {};

	abstract clientClass: typeof ClientComEndpoint
	abstract serverClass: typeof ClientComEndpoint
	protected abstract getAvailablePort(): Promise<number>|number

	public export<T extends exports>(exp:T): awaitedExports<T> {
		Object.assign(this.exports, exp);
		return exp;
	}

	public async connect<T extends exports>(path: URL): Promise<T> {
		const isClient = Deno.args[1];
		const comEndpoint = isClient ?
			new this.clientClass(Number(Deno.args[1]), path) :
			new this.serverClass(await this.getAvailablePort(), path);

		comEndpoint.handleRequest = (req:any) => {
			if (this.exports[req.name]) return this.exports[req.name](...req.data);
			else throw new Error("export " + req.name + " does not exist");
		}

		return <T> await comEndpoint.getProxy();
	}

}