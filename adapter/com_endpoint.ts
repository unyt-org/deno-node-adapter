import type { RequestMessage, ResponseMessage } from "./types.d.ts";

export abstract class ComEndpoint {
	protected port: number
	protected host = "localhost";
	protected endpoint: string

	protected path: URL;

	#counter = 0;
	#initialized = false;
	#waitingCallbacks = new Map<number, Function>();

	constructor(port:number, path: URL) {
		this.port = port;
		this.path = path;
		this.endpoint = `ws://${this.host}:${this.port}`;
	}

	public async getProxy()  {
		if (!this.#initialized) await this.init()
		this.#initialized = true;

		return new Proxy({}, {
			get: (target, p) => {
				console.log("get",target,p)
				return (...args:any[]) => this.handleRequest({name:<string>p, data:args});
			},
		})
	}


	/**
	 * call to send a message and get the response value
	 * @param req request
	 * @returns response
	 */
	public send(req: RequestMessage) {
		return new Promise(resolve=>{
			req.id = this.#counter++;
			this.#waitingCallbacks.set(req.id!, resolve);
			this.onSend(req);
		})
	}

	protected async handleMessage(message: RequestMessage|ResponseMessage) {
		// is response
		if ('rid' in message) {
			if (this.#waitingCallbacks.has(message.rid)) this.#waitingCallbacks.get(message.rid)!(message.result)
			else console.log("invalid response: " + message.rid, message.result);
		}
		// is request
		else {
			const result = await this.handleRequest(message);
			this.onSend(<ResponseMessage>{rid:message.id, result});
		}
	}


	// implemented by class to init com endpoint
	protected abstract init(): Promise<void>|void

	// implemented by class to send outgoing data
	protected abstract onSend(data: RequestMessage|ResponseMessage): void

	// can be defined to handle incoming requests
	public handleRequest!: (req:RequestMessage) => unknown|Promise<unknown>
}

export abstract class ClientComEndpoint extends ComEndpoint {

}

export abstract class ServerComEndpoint extends ComEndpoint {

	public override async getProxy()  {
		await this.startOtherProcess(this.path);
		return super.getProxy()
	}

	protected abstract startOtherProcess(path: URL): Promise<void>|void
}