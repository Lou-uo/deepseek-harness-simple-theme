/**
 * Wallpaper plugin, node half.
 *
 * The wallpaper itself is a pure browser surface, so this half only does two
 * things, and both are optional by design (the plugin must never block the
 * client tree):
 *
 *  - it records a load marker and every client self-report into
 *    `$DSH_HOME/dsh-web-bg-report.log`, which is how a wallpaper failure inside
 *    the running client stays observable from outside;
 *  - when the host offers its web server, it serves the same artwork on
 *    `/dsh-web-bg/art.jpg` as a same-origin fallback to the embedded data URI.
 *
 * Static `inject` is deliberately empty: a service that never arrives would keep
 * the fiber pending and take the wallpaper down with it. The web server is
 * requested lazily instead, so an absent one costs only the fallback route.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Diagnostics sink; a failure to write it must never throw into the loader. */
const REPORT_PATH = join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "dsh-web-bg-report.log");

/**
 * Append one timestamped line to the report.
 * @param line - the message to record.
 */
function note(line) {
	try {
		appendFileSync(REPORT_PATH, `${new Date().toISOString()} ${line}\n`);
	} catch {
		/* diagnostics are best-effort */
	}
}

/** Readable text for an unknown thrown value. */
function message(error) {
	return String((error && error.message) || error);
}

/**
 * Register the diagnostics and artwork routes against the host's web server.
 * @param scoped - a context carrying the web server service.
 */
function serveRoutes(scoped) {
	scoped.webServer.register({
		kind: "prefix",
		path: "/dsh-web-bg",
		handler: (req, res) => {
			let url;
			try {
				url = new URL(req.url ?? "/", "http://localhost");
			} catch {
				res.writeHead(400);
				res.end();
				return;
			}
			if (url.pathname === "/dsh-web-bg/art.jpg") {
				try {
					const art = readFileSync(new URL("../art.jpg", import.meta.url));
					res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "no-store" });
					res.end(art);
				} catch {
					res.writeHead(404);
					res.end();
				}
				return;
			}
			note(`client ${url.search.replace(/^\?/, "")}`);
			res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
			res.end("ok");
		}
	});
	note("route registered");
}

/**
 * Host plugin body: request the web server lazily and expose the routes.
 * @param ctx - the host plugin context.
 */
export function apply(ctx) {
	note("node-half applied");
	const register = (scoped) => {
		try {
			serveRoutes(scoped);
		} catch (error) {
			note(`route failed: ${message(error)}`);
		}
	};
	if (typeof ctx.inject === "function") {
		try {
			ctx.inject(["webServer"], register);
			return;
		} catch (error) {
			note(`inject failed: ${message(error)}`);
		}
	}
	try {
		if (ctx.webServer !== undefined) register(ctx);
		else note("no web server service available");
	} catch (error) {
		note(`webServer access failed: ${message(error)}`);
	}
}
