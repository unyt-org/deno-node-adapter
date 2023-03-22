import { ClientComEndpoint, ComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import type { exports, awaitedExports, RequestMessage, ResponseMessage } from "./types.d.ts";
import { WebSocketServer } from 'ws';
import * as cp from "child_process";
import { Bridge } from "./bridge.ts";


export class DenoBridge extends Bridge {

	clientClass = NodeClient;
	serverClass = NodeServer

	getAvailablePort(){
		return -1;
	}

}

class NodeClient extends ClientComEndpoint {
	protected init(): void|Promise<void> {
		throw new Error("Method not implemented.");
	}
	protected onSend(data: RequestMessage|ResponseMessage<any>): void {
		throw new Error("Method not implemented.");
	}

}

class NodeServer extends ServerComEndpoint {

	#client?: any

	public init() {
		return new Promise<void>(resolve => {
			const server = new WebSocketServer({port: this.port});

			server.on('connection', (ws:any) => {
				this.#client = ws;
				ws.on('error', console.error);
				ws.on('message', (data:string) => this.handleMessage(JSON.parse(data)));
				resolve();
			});
		})
	}

	protected onSend(data: RequestMessage|ResponseMessage) {
		this.#client?.send(JSON.stringify(data));
	}

	protected startOtherProcess(path: URL) {
		console.log("starting deno: " + path);
		const deno = cp.spawn('deno', ['run', '-Aq', path.pathname, this.port]);

		deno.stdout.on('data', function (data:any) {
			console.log('DENO: ' + data.toString());
		});

		deno.stderr.on('data', function (data:any) {
			console.log('DENO ERROR: ' + data.toString());
		});

		deno.on('exit', function (code:any) {
			console.log('DENO process exited with code ' + code.toString());
		});
	}

}