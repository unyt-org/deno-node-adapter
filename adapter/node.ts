import { ClientComEndpoint, ComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import { exports, awaitedExports, RequestMessage, ResponseMessage } from "./types.d.ts";
import { WebSocketServer } from 'ws';
import * as cp from "child_process";


export class DenoBridge {

	static exports: exports = {};

	public static export<T extends exports>(exp:T): awaitedExports<T> {
		Object.assign(this.exports, exp);
		return exp;
	}

	public static async connect<T extends exports>(path: URL): Promise<T> {
		const isClient = Deno.args[1];
		const comEndpoint = isClient ?
			new NodeClient(Number(Deno.args[1]), path) :
			new NodeServer(await this.getAvailablePort(), path);

		comEndpoint.handleRequest = req => {
			if (this.exports[req.name]) return this.exports[req.name](...req.data);
			else throw new Error("export " + req.name + " does not exist");
		}

		return <T> await comEndpoint.getProxy();
	}

	private static async getAvailablePort(){
		const port = await getAvailablePort();
		if (port == undefined) throw new Error("No available port found");
		return port;
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