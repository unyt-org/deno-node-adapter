import { StandardWebSocketClient, WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { ClientComEndpoint, ComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import { awaitedExports, exports, RequestMessage, ResponseMessage } from "./types.d.ts";
import { getAvailablePort } from "https://deno.land/x/port@1.0.0/mod.ts"

export class NodeBridge {

	static exports: exports = {};

	public static export<T extends exports>(exp:T): awaitedExports<T> {
		Object.assign(this.exports, exp);
		return exp;
	}
	
	public static async connect<T extends exports>(path: URL): Promise<T> {
		const isClient = Deno.args[1];
		const comEndpoint = isClient ?
			new DenoClient(Number(Deno.args[1]), path) :
			new DenoServer(await this.getAvailablePort(), path);

		comEndpoint.handleRequest = req => {
			if (this.exports[req.name]) return this.exports[req.name](...req.data);
			else throw new Error("export " + req.name + " does not exist");
		}

		return <T>await comEndpoint.getProxy();
	}

	private static async getAvailablePort(){
		const port = await getAvailablePort();
		if (port == undefined) throw new Error("No available port found");
		return port;
	}

}


class DenoClient extends ClientComEndpoint {

	#client?: WebSocketClient;

	public init() {
		return new Promise<void>(resolve => {
			console.log("connecting to " + this.endpoint)

			this.#client = new StandardWebSocketClient(this.endpoint);
			this.#client.on("open", () => resolve());
			this.#client.on("message", (event:MessageEvent) => this.handleMessage(<RequestMessage|ResponseMessage> JSON.parse(event.data)));
		})
	}

	protected onSend(data: RequestMessage|ResponseMessage) {
		this.#client?.send(JSON.stringify(data));
	}
}


class DenoServer extends ServerComEndpoint {

	#client?: WebSocketClient

	public init() {
		return new Promise<void>(resolve => {
			console.log("running server " + this.endpoint)
			const server = new WebSocketServer(this.port);
			server.on("connection", ws=>{
				this.#client = ws;
				this.#client.on("message", (event:MessageEvent) => this.handleMessage(<RequestMessage|ResponseMessage> JSON.parse(event.data)));
				resolve();
			})
		})
	}

	protected onSend(data: RequestMessage|ResponseMessage) {
		this.#client?.send(JSON.stringify(data));
	}

	protected async startOtherProcess(path: URL) {
		console.log("starting process " + path.pathname)

		await Deno.run({cmd: [
			"node",
			path.pathname
		]}).status()
	}

}