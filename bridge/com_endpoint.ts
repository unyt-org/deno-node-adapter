import { Bridge } from "./bridge.ts";
import type { RequestMessage, ResponseMessage } from "./types.d.ts";

export abstract class ComEndpoint {
	protected port: number
	protected host = "localhost";
	protected get endpoint() {return `ws://${this.host}:${this.port}`}

	protected path: URL;

	#bridge: Bridge;
	#counter = 0;
	#initialized = false;
	#waitingCallbacks = new Map<number, [resolve:Function, reject:Function]>();

	#otherProcessRunning = false;
	#connected = false;

	#rejectError!: Function
	#errorOccurred = new Promise((_resolve,reject)=>this.#rejectError=reject);
	#proxy?: Promise<Record<string,any>>

	constructor(port:number, path: URL, bridge: Bridge) {
		this.port = port;
		this.path = path;
		this.#bridge = bridge;
	}

	public getProxy()  {
		if (this.#proxy) return this.#proxy;

		return this.#proxy = Promise.race([
			this.#errorOccurred,
			(async ()=>{
				await this.init()
		
				const proxy:any = new Proxy({}, {
					get: (t, p, r) => {
						// promise workaround (somewhere in transpiled ts, then() gets called on the proxy)
						if (p == "then") return proxy;
						if (p == Symbol.toStringTag) return "proxy for external process";
						return (...args:any[]) => this.send({name:<string>p, data:args});
					},
				});
				return proxy;
			})()
		])
		
	}


	/**
	 * call to send a message and get the response value
	 * @param req request
	 * @returns response
	 */
	public async send(req: RequestMessage) {
		if (!this.#connected) await this.init();

		return new Promise((resolve, reject)=>{
			req.id = this.#counter++;
			this.#waitingCallbacks.set(req.id!, [resolve, reject]);
			this.onSend(req);
		})
	}

	protected async handleMessage(message: RequestMessage|ResponseMessage) {
		console.debug("[INCOMING MESSAGE]:",message)
		// is internal request
		if ('type' in message && message.type == "internal") {
			const result = await this.handleInternalRequest(message);
			this.onSend(<ResponseMessage>{rid:message.id, result});
		}
		// is response
		else if ('rid' in message) {
			if (this.#waitingCallbacks.has(message.rid)) {
				if ('error' in message) this.#waitingCallbacks.get(message.rid)![1](message.error)
				else this.#waitingCallbacks.get(message.rid)![0](message.result)
			}
			else console.debug("invalid response: " + message.rid, message.result);
		}
		// is request
		else {
			try {
				const result = await this.handleRequest(message);
				this.onSend(<ResponseMessage>{rid:message.id, result});
			}
			catch (e) {
				const serializedError = e instanceof Error ? e.message : e;
				this.onSend(<ResponseMessage>{rid:message.id, error:serializedError});
			}
		}
	}

	private async handleInternalRequest(message:RequestMessage) {
		if (message.name == "moduleExports") {
			const path = <string> message.data[0];
			const exports = <string[]|undefined> message.data[1];

			const module = await Promise.race([
				new Promise((_resolve,reject)=>setTimeout(()=>reject("Could not import cross-realm modules. There is probably a deadlock. Make sure that there are only top-level awaits for either importFromDeno or importFromNode"), 10_000)),
				import(new URL(path).pathname)
			]);
			// add specified exports or all exports
			for (const exp of exports??Object.keys(module)) this.#bridge.exports[exp] = module[exp]
		}
	}

	protected handleError(message?:string) {
		this.#rejectError(message??"bridge error")
	}

	// protected handleTimeout() {
	// 	setTimeout(async ()=>{
	// 		console.debug("closing " + this.constructor.name)
	// 		try {
	// 			await this.close();
	// 		}
	// 		catch {}
	// 		this.#connected = false;
	// 		this.#initialized = false;
	// 	}, 1000)
	// }

	public async init(){
		console.debug("initializing " + this.constructor.name)
		if (!this.#initialized) try {
			await this.handleInit()
		} catch (e) {
			throw new Error("could not init com endpoint: " + e.message);
		}
		this.#initialized = true;
		this.handleOtherProcess();
		await this.awaitConnection();
		this.#connected = true;
		// this.handleTimeout();
	}

	// implemented by class to init com endpoint
	protected abstract handleInit(): Promise<void>|void
	protected abstract awaitConnection(): Promise<void>|void
	abstract close(): Promise<void>|void

	// implemented by class to send outgoing data
	protected abstract onSend(data: RequestMessage|ResponseMessage): void

	// can be defined to handle incoming requests
	public handleRequest!: (req:RequestMessage) => unknown|Promise<unknown>

	protected async handleOtherProcess() {
		// already running
		if (this.#otherProcessRunning) return;

		// can spawn other process
		if (this.spawnOtherProcess) {
			this.#otherProcessRunning = true;
			const status = await this.spawnOtherProcess(this.path, this.#bridge.spawnCommand);
			if (!status.success) this.#bridge.exitProcess(status.code);
			this.#otherProcessRunning = false;
		}
		// otherwise, other process spawned this process
		else this.#otherProcessRunning = true;
	}

	protected spawnOtherProcess?(path: URL, cmd:string[]): Promise<{code:number, success:boolean}>|{code:number, success:boolean}
}

export abstract class ClientComEndpoint extends ComEndpoint {}

export abstract class ServerComEndpoint extends ComEndpoint {
	protected abstract override spawnOtherProcess(path: URL, cmd:string[]): Promise<{code:number, success:boolean}>|{code:number, success:boolean}
}