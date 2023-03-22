const caller_file = /((?:https?|file)\:\/\/.*?)(?::\d+)*(?:$|\nevaluate@|\)$)/;

function getPartsFromStack(stack:string|undefined) {
	if (!stack) return null;
	return stack
		.trim()
		.replace(/^Error\n/, '') // remove chrome Error line
		.replace(/(\n.*@\[native code\])+$/, '') // remove safari [native code] lines at the end
		.replace(/\n *at ModuleJob\.run \(node\:internal\/(.|\n)*$/, '') // remove nodejs internal stack
		.split('\n');
}


/**
 * returns the URL location from where the function that called getCallerFile() was called
 */
export function getCallerFile(error?: Error) {
	const parts = getPartsFromStack((error??new Error()).stack);
	return parts
		?.[Math.min(parts.length-1, 2)]
		?.match(caller_file)
		?.[1] ?? globalThis.location?.href
}