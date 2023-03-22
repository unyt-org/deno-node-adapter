import { ClientComEndpoint, ComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import type { awaitedExports, exports } from "./types.d.ts";
import { getCallerFile } from "./utils/caller_metadata.ts";

// set to true to show debug logs
const DEBUG = false;

if (!DEBUG) console.debug = ()=>{}

export abstract class Bridge {
	exports: exports = {};
	#comEndpoint?: ComEndpoint;

	abstract spawnCommand: string[];

	abstract clientClass: typeof ClientComEndpoint
	abstract serverClass: typeof ServerComEndpoint
	protected abstract getExistingPort(): number|undefined

	abstract exitProcess(status:number): void

	public export<T extends exports>(exp:T): T {
		Object.assign(this.exports, exp);
		return exp;
	}

	public async import<T extends exports>(path: URL|string): Promise<awaitedExports<T>>
	public async import<T extends exports, name extends keyof T = keyof T>(path: URL|string, name: name): Promise<awaitedExports<T>[name]>
	public async import<T extends exports, name extends keyof T|undefined = keyof T>(path: URL|string, name?: name): Promise<name extends string ? awaitedExports<T>[name] : awaitedExports<T>> {
		path = path instanceof URL ? path : new URL(path, getCallerFile());

		// connect if not yet connected
		await this.connect(path);
		// make sure export is loaded from module
		await this.#comEndpoint!.send({type:"internal", name:"moduleExports", data:[path.toString(), name ? [<string>name] : undefined]})
		const proxy = await this.#comEndpoint!.getProxy();
		return name == undefined ? proxy : proxy[name]
	}

	public connect<T extends exports>(path: URL|string): Promise<awaitedExports<T>> {
		if (this.#comEndpoint) return this.#comEndpoint.getProxy();

		path = path instanceof URL ? path : new URL(path, getCallerFile());
		const existingPort = this.getExistingPort();
		const isClient = !!existingPort;
		this.#comEndpoint = isClient ?
			new (<any>this.clientClass)(existingPort, path, this) :
			new (<any>this.serverClass)(0, path, this);

		this.#comEndpoint!.handleRequest = (req:any) => {
			if (this.exports[req.name]) return this.exports[req.name](...req.data);
			else throw new Error("export " + req.name + " does not exist (wrong bridge configuration or invalid importFromDeno/importFromNode)");
		}

		return this.#comEndpoint!.getProxy();
	}

}