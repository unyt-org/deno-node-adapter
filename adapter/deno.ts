import { StandardWebSocketClient, WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { ClientComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import type { RequestMessage, ResponseMessage } from "./types.d.ts";
import { getAvailablePort } from "https://deno.land/x/port@1.0.0/mod.ts"
import { Bridge } from "./bridge.ts";

export class NodeBridge extends Bridge {
	clientClass = DenoClient;
	serverClass = DenoServer

	async getAvailablePort(){
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