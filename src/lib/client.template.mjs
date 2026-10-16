/**
 * Wallpaper plugin, browser half.
 *
 * Three independent pieces, all released through ctx.effect:
 *
 *  1. an artwork layer painted behind the application, oversized so a blur never
 *     fringes at the viewport edge, with its own opacity slider;
 *  2. an interface-transparency axis that drives the app's surface tokens — a
 *     continuous control, from the stock opaque surfaces up to heavily
 *     see-through ones, asserted as inline `!important` declarations on body
 *     because the app's boot style paints body with a literal colour and the
 *     theme presenter writes its own inline tokens;
 *  3. a small control panel (bottom right) owning both sliders, the artwork
 *     source and a blur toggle.
 *
 * The bundled artwork is embedded as a data URI: activation needs no file, no
 * server and no network. A picked image is downscaled to a bounded JPEG in-page
 * and kept in localStorage, so it survives restarts without any upload.
 *
 * Placeholder __ART__ is filled by build_plugin.py.
 */
window.__ModuleLoader__.load({
	id: "dsh-web-bg",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/** Bundled artwork, a JPEG data URI. */
		const ART = "data:image/jpeg;base64,__ART__";

		/** Override-layer identity; one layer per source in the theme service. */
		const SOURCE = "dsh-web-bg";
		const STORAGE_KEY = "dsh.webBg.v4";
		/** Older keys, newest first: v3 kept one colour for both palettes. */
		const LEGACY_KEYS = Object.freeze(["dsh.webBg.v3", "dsh.webBg.v2"]);
		const STYLE_ID = "dsh-web-bg-style";
		const TOKEN_STYLE_ID = "dsh-web-bg-tokens";
		const LAYER_ID = "dsh-web-bg-art";
		const UI_ID = "dsh-web-bg-ui";
		const OPACITY_VAR = "--dsh-web-bg-opacity";

		/** Artwork opacity is a percentage of full artwork strength. */
		const OPACITY_MIN = 0;
		const OPACITY_MAX = 80;
		/** Interface transparency: 0 keeps the stock opaque surfaces, 100 is the
		 *  maximum see-through the readability floor below allows. */
		const UI_MIN = 0;
		const UI_MAX = 100;
		const CUSTOM_MAX_WIDTH = 2560;
		const DEFAULTS = Object.freeze({
			opacity: 22,
			uiTransparency: 60,
			soft: true,
			custom: "",
			name: "",
			/** Solid-panel colour per palette; empty means "keep the stock colour". */
			solidColors: Object.freeze({ light: "", dark: "" }),
			/** See-through percentage of the solid surfaces, 0..SOLID_ALPHA_MAX. */
			solidAlpha: 0
		});

		/**
		 * How far the solid surfaces lean away from the picked colour, per palette: in
		 * a light scheme the settings surfaces read slightly whiter, in a dark scheme
		 * slightly blacker, so each palette keeps a native-looking separation from its
		 * own labels. The per-surface offsets in {@link SOLIDS} stack on top of this.
		 */
		const LIGHT_BIAS = 0.10;
		const DARK_BIAS = 0.10;

		/**
		 * Solid-surface transparency is a percentage of see-through, capped at 50: the
		 * slider goes 0 (opaque, the stock look) to 50 (alpha 0.5), so the settings
		 * page and the tool panels never dissolve into the artwork behind them.
		 */
		const SOLID_ALPHA_MAX = 50;
		const BG_PRESETS = Object.freeze([8, 15, 25, 40, 60, 80]);
		const UI_PRESETS = Object.freeze([0, 30, 60, 85]);

		/**
		 * Surface tokens, each with its colour per palette and the alpha it reaches
		 * at full interface transparency (the readability floor). Alpha at a given
		 * transparency `t` is `1 - t * (1 - floor)`, so 0 reproduces the stock look.
		 *
		 * `--dsw-alias-bg-layer-2` is deliberately absent: that is the surface the
		 * Settings page and the tool panels (plugin manager, directory picker,
		 * trajectory, document preview) paint with, and those must read as ordinary
		 * solid surfaces rather than show the artwork through them. They are listed
		 * in {@link EXEMPT} so a value left behind by an older build is released.
		 */
		const SURFACES = Object.freeze({
			"--dsw-alias-bg-base": { light: ["255,255,255", 0.30], dark: ["12,17,26", 0.18] },
			"--dsw-alias-bg-layer-1": { light: ["255,255,255", 0.46], dark: ["24,32,46", 0.30] },
			"--dsw-alias-bg-overlay": { light: ["255,255,255", 0.72], dark: ["30,39,56", 0.62] },
			"--dsw-specific-sidebar-fill": { light: ["247,248,251", 0.40], dark: ["19,25,37", 0.26] }
		});

		/** Tokens the plugin must never leave overridden on body. */
		const EXEMPT = Object.freeze(["--dsw-alias-bg-layer-2"]);

		/**
		 * The surfaces that stay solid, each with:
		 *  - `delta` — how far the surface sits from the colour the user picks in
		 *    Settings → General (0 = exactly that colour, positive mixes toward white,
		 *    negative toward black), so one hex code recolours the whole family while
		 *    keeping its internal hierarchy;
		 *  - `light` / `dark` — the stock value the app paints when no colour is
		 *    picked, so the transparency slider can still reach it through color-mix;
		 *  - `fixed` — the surface never takes the transparency slider's alpha (the
		 *    Settings page and the tool panels must stay readable over the artwork),
		 *    although it still follows the chosen colour.
		 *
		 * `--dsw-alias-settings-card-fill` is absent on purpose: it is defined as
		 * `var(--dsw-alias-bg-layer-2)`, so overriding layer-2 already carries it.
		 */
		const SOLIDS = Object.freeze({
			// 设置页 / 工具面板：固定不透明
			"--dsw-alias-bg-layer-2": { delta: 0, fixed: true, light: "var(--dsw-static-neutral-bluish-00)", dark: "var(--dsw-static-neutral-bluish-850)" },
			// 输入框
			"--dsw-specific-input-major": { delta: 0, light: "var(--dsw-static-neutral-bluish-00)", dark: "var(--dsw-static-neutral-bluish-850)" },
			// 消息气泡
			"--dsw-specific-bubble": { delta: 0, light: "var(--dsw-static-deepseek-50)", dark: "var(--dsw-static-neutral-bluish-850)" },
			// 下拉菜单
			"--dsw-specific-menu": { delta: 0.04, light: "#f8f9faf0", dark: "#303136f0" },
			"--dsw-alias-bg-module-platform": { delta: -0.04, light: "var(--dsw-static-neutral-bluish-60)", dark: "var(--dsw-static-neutral-bluish-800)" },
			// 代码块
			"--dsw-alias-markdown-code-block": { delta: -0.06, light: "var(--dsw-static-neutral-bluish-50)", dark: "var(--dsw-static-neutral-bluish-900)" },
			"--dsw-alias-bg-layer-3": { delta: 0.06, light: "var(--dsw-static-neutral-bluish-00)", dark: "var(--dsw-static-neutral-bluish-800)" },
			// The app never declares a stock value for layer-4, so it only follows a picked colour.
			"--dsw-alias-bg-layer-4": { delta: 0.1, light: "", dark: "" },
			// 新会话 / 激活项
			"--dsw-specific-sidebar-nav-item-active": { delta: 0.08, light: "var(--dsw-static-neutral-bluish-100)", dark: "var(--dsw-static-neutral-bluish-750)" },
			"--dsw-alias-button-elevated-fill": { delta: 0.1, light: "var(--dsw-static-neutral-bluish-00)", dark: "var(--dsw-static-neutral-bluish-750)" },
			"--dsw-alias-button-floating-fill": { delta: 0.1, light: "var(--dsw-static-neutral-bluish-00)", dark: "var(--dsw-static-neutral-bluish-850)" },
			"--dsw-alias-tooltip-bg": { delta: 0.08, light: "var(--dsw-static-neutral-bluish-850)", dark: "var(--dsw-static-neutral-bluish-750)" },
			"--dsw-alias-toast-bg": { delta: 0.06, light: "var(--dsw-static-neutral-bluish-800)", dark: "var(--dsw-static-neutral-bluish-750)" }
		});

		/** React, for the settings row registered into the app's Appearance area. */
		const React = require("react");

		/**
		 * Parse `#rgb` / `#rrggbb` into an RGB triple.
		 * @param value - the colour text.
		 * @returns the triple, or null when the text is not a hex colour.
		 */
		function parseHex(value) {
			const text = String(value).trim().replace(/^#/, "");
			if (/^[0-9a-fA-F]{3}$/.test(text)) return [0, 1, 2].map((index) => Number.parseInt(text[index] + text[index], 16));
			if (/^[0-9a-fA-F]{6}$/.test(text)) return [0, 2, 4].map((index) => Number.parseInt(text.slice(index, index + 2), 16));
			return null;
		}

		/**
		 * Normalize any accepted hex form to `#rrggbb`.
		 * @param value - the colour text.
		 * @returns the normalized colour, or null when invalid.
		 */
		function normalizeHex(value) {
			const rgb = parseHex(value);
			if (rgb === null) return null;
			return "#" + rgb.map((part) => part.toString(16).padStart(2, "0")).join("");
		}

		/**
		 * Mix one RGB triple toward white (positive amount) or black (negative), then
		 * apply an alpha channel.
		 * @param rgb - the `[r, g, b]` triple.
		 * @param amount - the mix strength, -1..1.
		 * @param alpha - the alpha channel, 0..1; 1 emits a plain `rgb(...)`.
		 * @returns a CSS colour string.
		 */
		function mixColor(rgb, amount, alpha) {
			const target = amount >= 0 ? 255 : 0;
			const ratio = Math.min(1, Math.abs(amount));
			const mixed = rgb.map((part) => Math.round(part + (target - part) * ratio));
			const channel = alpha === undefined ? 1 : Math.max(0, Math.min(1, alpha));
			return channel >= 1
				? "rgb(" + mixed.join(",") + ")"
				: "rgba(" + mixed.join(",") + "," + Math.round(channel * 1000) / 1000 + ")";
		}

		/** Readable text for an unknown thrown value. */
		function message(error) {
			return String((error && error.message) || error);
		}

		/** Clamp a number into an inclusive range, falling back when it is not one. */
		function clamp(value, min, max, fallback) {
			if (!Number.isFinite(value)) return fallback;
			return Math.min(max, Math.max(min, Math.round(value)));
		}

		/**
		 * Normalize the persisted per-palette colours.
		 * @param value - the stored value, possibly in an older single-colour shape.
		 * @returns the `{ light, dark }` pair, with invalid entries emptied.
		 */
		function readSolidColors(value) {
			if (typeof value === "string") {
				// v3 and earlier kept one colour for both palettes.
				const single = normalizeHex(value) ?? "";
				return { light: single, dark: single };
			}
			if (value === null || typeof value !== "object") return { light: "", dark: "" };
			return {
				light: normalizeHex(value.light) ?? "",
				dark: normalizeHex(value.dark) ?? ""
			};
		}

		/** Read the persisted preference, migrating older keys. */
		function readState() {
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw !== null) {
					const parsed = JSON.parse(raw);
					return {
						opacity: clamp(parsed.opacity, OPACITY_MIN, OPACITY_MAX, DEFAULTS.opacity),
						uiTransparency: clamp(parsed.uiTransparency, UI_MIN, UI_MAX, DEFAULTS.uiTransparency),
						soft: parsed.soft !== false,
						custom: typeof parsed.custom === "string" ? parsed.custom : "",
						name: typeof parsed.name === "string" ? parsed.name : "",
						solidColors: readSolidColors(parsed.solidColor !== undefined ? parsed.solidColor : parsed.solidColors),
						solidAlpha: clamp(parsed.solidAlpha, 0, SOLID_ALPHA_MAX, DEFAULTS.solidAlpha)
					};
				}
				for (const key of LEGACY_KEYS) {
					const legacy = JSON.parse(window.localStorage.getItem(key) ?? "null");
					if (legacy === null || typeof legacy !== "object") continue;
					return {
						opacity: clamp(legacy.opacity, OPACITY_MIN, OPACITY_MAX, DEFAULTS.opacity),
						uiTransparency: legacy.translucent === false ? 0 : DEFAULTS.uiTransparency,
						soft: legacy.soft !== false,
						custom: typeof legacy.custom === "string" ? legacy.custom : "",
						name: typeof legacy.name === "string" ? legacy.name : "",
						solidColors: readSolidColors(legacy.solidColor),
						solidAlpha: 0
					};
				}
			} catch {
				/* fall through to defaults */
			}
			return { ...DEFAULTS, solidColors: { ...DEFAULTS.solidColors } };
		}

		/** Persist the preference. A too-large custom image stays session-only. */
		function saveState(state) {
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
				return true;
			} catch {
				try {
					window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, custom: "", name: "" }));
				} catch {
					/* nothing else to try: the session keeps working in memory */
				}
				return false;
			}
		}

		/** Downscale a picked file to a bounded JPEG data URI. */
		function shrink(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onerror = () => reject(new Error("读取图片失败"));
				reader.onload = () => {
					const image = new Image();
					image.onerror = () => reject(new Error("图片无法解码"));
					image.onload = () => {
						const scale = Math.min(1, CUSTOM_MAX_WIDTH / image.naturalWidth);
						const width = Math.max(1, Math.round(image.naturalWidth * scale));
						const height = Math.max(1, Math.round(image.naturalHeight * scale));
						const canvas = document.createElement("canvas");
						canvas.width = width;
						canvas.height = height;
						canvas.getContext("2d").drawImage(image, 0, 0, width, height);
						resolve(canvas.toDataURL("image/jpeg", 0.9));
					};
					image.src = String(reader.result);
				};
				reader.readAsDataURL(file);
			});
		}

		/**
		 * Best-effort self-report to this plugin's node half, which appends it to
		 * `$DSH_HOME/dsh-web-bg-report.log`. Diagnostics only — a failed report must
		 * never disturb the page.
		 * @param stage - short stage name.
		 * @param extra - extra fields to record.
		 */
		function report(stage, extra) {
			try {
				const query = new URLSearchParams({ stage: stage, ...(extra || {}) }).toString();
				window.fetch("/dsh-web-bg/report?" + query, { cache: "no-store" }).catch(() => {});
			} catch {
				/* reporting is optional */
			}
		}

		/** One surface colour at transparency `t` (0..1) for a palette. */
		function surfaceColor(spec, scheme, t) {
			const [rgb, floor] = spec[scheme];
			const alpha = Math.round((1 - t * (1 - floor)) * 1000) / 1000;
			return "rgba(" + rgb + "," + alpha + ")";
		}

		/** Every surface value at transparency `t` (0..1) for a palette. */
		function surfaceValues(scheme, t) {
			const values = {};
			for (const [name, spec] of Object.entries(SURFACES)) values[name] = surfaceColor(spec, scheme, t);
			return values;
		}

		/** The `{ light, dark }` pair per surface, for the theme service. */
		function surfacePairs(t) {
			const pairs = {};
			for (const [name, spec] of Object.entries(SURFACES)) {
				pairs[name] = { light: surfaceColor(spec, "light", t), dark: surfaceColor(spec, "dark", t) };
			}
			return pairs;
		}

		/**
		 * The stylesheet fallback for the same values, scoped like the app's sheet.
		 * @param t - transparency as a 0..1 fraction.
		 * @param solids - per-palette maps of the solid-surface colours (may be empty).
		 */
		function tokenCss(t, solids) {
			const dark = { ...surfaceValues("dark", t), ...solids.dark };
			const light = { ...surfaceValues("light", t), ...solids.light };
			const declarations = (values) =>
				Object.entries(values)
					.map(([name, value]) => name + ":" + value + "!important;")
					.join("");
			return [
				// The app's boot script paints body with a literal colour, and body's own
				// background paints after negative z-index children — without this the
				// artwork layer would be hidden behind it.
				"body{background-color:transparent!important}",
				"body[data-ds-dark-theme]{" + declarations(dark) + "}",
				"body:not([data-ds-dark-theme]){" + declarations(light) + "}",
				"html{background-color:#0c111a}"
			].join("");
		}

		/**
		 * One palette's colour field: label, live swatch, hex input.
		 * @param props - palette key, its label, the current text, the updater, and the reset flag.
		 * @returns the field element.
		 */
		function ColorField(props) {
			const normalized = normalizeHex(props.text);
			const invalid = props.text.trim() !== "" && normalized === null;
			// The swatch previews the colour as it will actually land: the palette bias
			// and the transparency slider are both part of the answer.
			const alpha = 1 - (Number(props.alpha) || 0) / 100;
			const shown = normalized === null
				? alpha >= 1
					? "#2c2c2e"
					: "rgba(128,128,128," + alpha + ")"
				: mixColor(parseHex(normalized), props.scheme === "dark" ? -DARK_BIAS : LIGHT_BIAS, alpha);
			return React.createElement(
				"div",
				{ style: { display: "flex", alignItems: "center", gap: 9 } },
				React.createElement(
					"span",
					{ style: { fontSize: 12.5, color: "var(--dsw-alias-label-secondary)", width: 60, flex: "none" } },
					props.label
				),
				React.createElement("span", {
					// The live preview swatch: a filled circle of the resulting colour.
					style: {
						width: 18,
						height: 18,
						borderRadius: "50%",
						flex: "none",
						background: shown,
						boxShadow: "inset 0 0 0 1px rgba(128,128,128,.45)"
					},
					title: shown
				}),
				React.createElement("input", {
					value: props.text,
					placeholder: props.scheme === "dark" ? "#2c2c2e" : "#f7f8fb",
					spellCheck: false,
					"aria-label": props.label + "实色面板颜色（十六进制）",
					onChange: (event) => props.onChange(event.target.value),
					style: {
						width: 104,
						padding: "5px 8px",
						borderRadius: 8,
						fontSize: 12.5,
						fontFamily: "Consolas,monospace",
						color: "var(--dsw-alias-label-primary)",
						background: "var(--dsw-specific-input-major)",
						border: "1px solid " + (invalid ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-border-l2)"),
						outline: "none"
					}
				}),
				props.last
					? React.createElement(
							"button",
							{
								type: "button",
								onClick: () => props.onReset(),
								style: {
									marginLeft: "auto",
									padding: "5px 10px",
									borderRadius: 8,
									fontSize: 12,
									cursor: "pointer",
									color: "var(--dsw-alias-label-secondary)",
									background: "transparent",
									border: "1px solid var(--dsw-alias-border-l2)"
								}
							},
							"恢复默认"
						)
					: null
			);
		}

		/**
		 * The Settings → General row that recolours the surfaces which stay solid, one
		 * colour per palette. The host renders it below the appearance row and above
		 * the font-size row, and passes the `readColors` / `writeColor` actions
		 * registered alongside it.
		 * @param props - slot props, including the two actions.
		 * @returns the row element.
		 */
		function SolidColorRow(props) {
			const read = typeof props.readColors === "function" ? props.readColors : () => ({ light: "", dark: "" });
			const write = typeof props.writeColor === "function" ? props.writeColor : () => {};
			const readAlpha = typeof props.readSolidAlpha === "function" ? props.readSolidAlpha : () => 0;
			const writeAlpha = typeof props.writeSolidAlpha === "function" ? props.writeSolidAlpha : () => {};
			const initial = read();
			const [light, setLight] = React.useState(initial.light ?? "");
			const [dark, setDark] = React.useState(initial.dark ?? "");
			const [alpha, setAlpha] = React.useState(readAlpha());
			const invalid = (value) => value.trim() !== "" && normalizeHex(value) === null;
			const fieldOf = (scheme) => (scheme === "light" ? light : dark);
			const setFieldOf = (scheme) => (scheme === "light" ? setLight : setDark);
			const reset = () => {
				setLight("");
				setDark("");
				setAlpha(0);
				write("light", "");
				write("dark", "");
				writeAlpha(0);
			};
			return React.createElement(
				"div",
				{ style: { display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" } },
				React.createElement(
					"div",
					{ style: { fontSize: 13, color: "var(--dsw-alias-label-primary)" } },
					"实色面板颜色"
				),
				["light", "dark"].map((scheme) =>
					React.createElement(ColorField, {
						key: scheme,
						scheme: scheme,
						label: scheme === "dark" ? "深色模式" : "浅色模式",
						text: fieldOf(scheme),
						alpha,
						last: scheme === "dark",
						onChange: (next) => {
							setFieldOf(scheme)(next);
							const accepted = normalizeHex(next);
							if (accepted !== null || next.trim() === "") write(scheme, accepted ?? "");
						},
						onReset: reset
					})
				),
				React.createElement(
					"div",
					{ style: { display: "flex", alignItems: "center", gap: 9 } },
					React.createElement(
						"span",
						{ style: { fontSize: 12.5, color: "var(--dsw-alias-label-secondary)", width: 60, flex: "none" } },
						"透明度"
					),
					React.createElement("input", {
						type: "range",
						min: 0,
						max: SOLID_ALPHA_MAX,
						step: 1,
						value: alpha,
						"aria-label": "实色面板透明度",
						onChange: (event) => {
							const next = Number(event.target.value);
							setAlpha(next);
							writeAlpha(next);
						},
						style: { flex: 1, accentColor: "var(--dsw-alias-brand-primary)", cursor: "pointer" }
					}),
					React.createElement(
						"span",
						{ style: { fontSize: 12, color: "var(--dsw-alias-label-primary)", width: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" } },
						alpha + "%"
					)
				),
				React.createElement(
					"div",
					{ style: { fontSize: 11.5, color: invalid(light) || invalid(dark) ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-label-tertiary)" } },
					invalid(light) || invalid(dark)
						? "请输入 #RRGGBB 或 #RGB"
						: "作用于输入框、菜单、消息气泡、代码块等实色面板；设置界面固定不透明；浅色模式整体偏白、深色模式整体偏黑，透明度最高 50%"
				)
			);
		}

		/** No required services: the wallpaper must mount even without the theme service. */
		const inject = [];

		/**
		 * Mount the wallpaper, reporting any failure instead of dying silently.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			try {
				mount(ctx);
			} catch (error) {
				report("error", { message: message(error) });
			}
		}

		/**
		 * Mount the artwork layer, the surface-transparency machinery and the panel.
		 * @param ctx - the browser plugin context.
		 */
		function mount(ctx) {
			if (typeof document === "undefined" || document.body === null) return;
			if (document.getElementById(LAYER_ID) !== null) return;

			const state = readState();
			let themeService = null;
			let themeDisposer = null;
			let themeRequested = false;
			let tokenObserver = null;
			let tokenPoll = null;

			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = [
				"html{background-color:#0c111a}",
				"#" + LAYER_ID + "{position:fixed;inset:-28px;z-index:-1;pointer-events:none;",
				"background-position:center 42%;background-size:cover;background-repeat:no-repeat;",
				"opacity:var(" + OPACITY_VAR + ",0.22);transition:opacity .18s linear}",
				"#" + LAYER_ID + "[data-soft='1']{filter:blur(6px)}",
				"#" + UI_ID + "{position:fixed;right:18px;bottom:100px;z-index:2147483000;",
				'font:12px/1.5 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;color:#e8edf7}',
				"#" + UI_ID + " .tab{width:30px;height:30px;margin-left:auto;border-radius:50%;display:grid;place-items:center;",
				"border:1px solid rgba(255,255,255,.16);background:rgba(13,19,31,.7);",
				"backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer;",
				"box-shadow:0 6px 20px rgba(0,0,0,.35);transition:transform .12s ease,opacity .2s ease;opacity:.72}",
				"#" + UI_ID + " .tab:hover{transform:scale(1.06);opacity:1}",
				"#" + UI_ID + " .dot{width:9px;height:9px;border-radius:50%;",
				"background:linear-gradient(140deg,#7aa2ff,#4d6bfe);box-shadow:0 0 10px rgba(77,107,254,.8)}",
				"#" + UI_ID + " .card{position:absolute;right:0;bottom:40px;width:258px;padding:12px 13px;",
				"border-radius:14px;border:1px solid rgba(255,255,255,.14);background:#131b28;",
				"box-shadow:0 16px 40px rgba(0,0,0,.5)}",
				"#" + UI_ID + "[data-open='0'] .card{display:none}",
				"#" + UI_ID + " .head{display:flex;align-items:center;font-size:12px;font-weight:600;margin-bottom:8px}",
				"#" + UI_ID + " .head b{margin-left:auto;color:#cfd9ff;font-variant-numeric:tabular-nums}",
				"#" + UI_ID + " input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;",
				"border-radius:3px;background:rgba(255,255,255,.16);outline:none;margin:2px 0 8px}",
				"#" + UI_ID + " input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;",
				"border-radius:50%;background:#4d6bfe;box-shadow:0 0 12px rgba(77,107,254,.7);cursor:pointer}",
				"#" + UI_ID + " .presets{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}",
				"#" + UI_ID + " .presets button{padding:4px 0;border-radius:8px;font-size:11px;",
				"border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#c3cee6;cursor:pointer;font-family:inherit}",
				"#" + UI_ID + " .presets button:hover{background:rgba(77,107,254,.24)}",
				"#" + UI_ID + " .presets button[data-on='1']{background:rgba(77,107,254,.32);border-color:rgba(77,107,254,.5);color:#fff}",
				"#" + UI_ID + " .row{display:flex;gap:6px;margin-bottom:6px}",
				"#" + UI_ID + " .row button{flex:1;padding:6px 0;border-radius:8px;font-size:11.5px;font-family:inherit;cursor:pointer;",
				"border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#c3cee6}",
				"#" + UI_ID + " .row button:hover{background:rgba(77,107,254,.24)}",
				"#" + UI_ID + " .toggle{display:flex;align-items:center;gap:8px;width:100%;padding:5px 2px;",
				"border:0;background:none;color:#c3cee6;font-size:12px;text-align:left;cursor:pointer;font-family:inherit}",
				"#" + UI_ID + " .box{width:14px;height:14px;border-radius:4px;border:1px solid rgba(255,255,255,.24);",
				"display:grid;place-items:center;font-size:10px;color:#fff;flex:none}",
				"#" + UI_ID + " .box[data-on='1']{background:#4d6bfe;border-color:#4d6bfe}",
				"#" + UI_ID + " .sep{height:1px;background:rgba(255,255,255,.09);margin:8px 0}",
				"#" + UI_ID + " .hint{color:#8b98b0;font-size:11px;margin-top:6px;word-break:break-all}",
				"#" + UI_ID + " .hint b{color:#c3cee6;font-weight:500}"
			].join("");
			document.head.appendChild(style);

			const tokenStyle = document.createElement("style");
			tokenStyle.id = TOKEN_STYLE_ID;

			const layer = document.createElement("div");
			layer.id = LAYER_ID;
			layer.setAttribute("aria-hidden", "true");
			document.body.appendChild(layer);

			const ui = document.createElement("div");
			ui.id = UI_ID;
			ui.dataset.open = "0";
			ui.innerHTML = [
				'<div class="card">',
				'<div class="head">背景透明度<b data-out="bg"></b></div>',
				'<input type="range" data-in="bg" min="' + OPACITY_MIN + '" max="' + OPACITY_MAX + '" step="1" />',
				'<div class="presets" data-presets="bg"></div>',
				'<div class="head">界面透明度<b data-out="ui"></b></div>',
				'<input type="range" data-in="ui" min="' + UI_MIN + '" max="' + UI_MAX + '" step="1" />',
				'<div class="presets" data-presets="ui"></div>',
				'<div class="sep"></div>',
				'<button class="toggle" data-act="soft"><span class="box"></span>柔和模式（背景模糊）</button>',
				'<div class="row"><button data-act="pick">更换图片…</button><button data-act="reset">恢复默认图</button></div>',
				'<div class="hint"></div>',
				"</div>",
				'<div class="tab" title="背景设置"><span class="dot"></span></div>'
			].join("");
			document.body.appendChild(ui);

			const bgSlider = ui.querySelector('[data-in="bg"]');
			const uiSlider = ui.querySelector('[data-in="ui"]');
			const bgOut = ui.querySelector('[data-out="bg"]');
			const uiOut = ui.querySelector('[data-out="ui"]');
			const bgPresets = ui.querySelector('[data-presets="bg"]');
			const uiPresets = ui.querySelector('[data-presets="ui"]');
			const softBox = ui.querySelector('[data-act="soft"] .box');
			const hint = ui.querySelector(".hint");
			const picker = document.createElement("input");
			picker.type = "file";
			picker.accept = "image/*";
			picker.style.display = "none";
			ui.appendChild(picker);

			/**
			 * Fill a preset row. Buttons size themselves to the row so both rows look
			 * alike without hard-coded widths.
			 * @param row - the container element.
			 * @param values - preset percentages.
			 * @param pick - reads the active percentage for the highlight.
			 * @param use - applies a chosen percentage.
			 */
			function buildPresets(row, values, pick, use) {
				for (const preset of values) {
					const button = document.createElement("button");
					button.type = "button";
					button.dataset.op = String(preset);
					button.style.flex = "1";
					button.textContent = preset + "%";
					button.addEventListener("click", () => use(preset));
					row.appendChild(button);
				}
				row.dataset.pick = "0";
				row.readPick = pick;
			}
			buildPresets(bgPresets, BG_PRESETS, () => state.opacity, (value) => { state.opacity = value; render(); });
			buildPresets(uiPresets, UI_PRESETS, () => state.uiTransparency, (value) => { state.uiTransparency = value; render(); });

			/** Which palette the app is currently showing. */
			function palette() {
				return document.body.hasAttribute("data-ds-dark-theme") ? "dark" : "light";
			}

			/** Transparency as a 0..1 fraction. */
			function fraction() {
				return state.uiTransparency / 100;
			}

			/**
			 * One palette's values for the surfaces that stay solid, as declaration
			 * values. With a colour picked, the palette's bias (light leans whiter, dark
			 * leans blacker) and each surface's offset are mixed in, then the
			 * transparency slider's alpha is applied. Without a picked colour, the
			 * stock value is made translucent through color-mix, so the slider works on
			 * the app's own palette too.
			 * @param scheme - "light" or "dark".
			 */
			function solidValuesFor(scheme) {
				const picked = parseHex(state.solidColors[scheme] ?? "");
				const alpha = 1 - state.solidAlpha / 100;
				const bias = scheme === "dark" ? -DARK_BIAS : LIGHT_BIAS;
				const values = {};
				for (const [name, spec] of Object.entries(SOLIDS)) {
					// A fixed surface takes the colour but never the transparency.
					const surfaceAlpha = spec.fixed === true ? 1 : alpha;
					if (picked !== null) {
						values[name] = mixColor(picked, Math.max(-1, Math.min(1, bias + spec.delta)), surfaceAlpha);
						continue;
					}
					if (surfaceAlpha >= 1) continue;
					const stock = scheme === "dark" ? spec.dark : spec.light;
					if (stock === "") continue;
					values[name] = "color-mix(in srgb, " + stock + " " + Math.round(surfaceAlpha * 100) + "%, transparent)";
				}
				return values;
			}

			/** Both palettes' values, for the stylesheet fallback and the theme service. */
			function solidValuesBoth() {
				return { light: solidValuesFor("light"), dark: solidValuesFor("dark") };
			}

			/** Whether the solid surfaces have anything configured (a colour or transparency). */
			function hasSolidColors() {
				if (state.solidAlpha > 0) return true;
				return Object.keys(solidValuesFor("light")).length > 0 || Object.keys(solidValuesFor("dark")).length > 0;
			}

			/**
			 * Assert the surface values as inline `!important` declarations on body —
			 * the only origin that outranks both the app's boot style and the theme
			 * presenter's own inline tokens. Comparison-first, so re-running this from
			 * the observer cannot spin.
			 */
			function assertSurfaces() {
				const scheme = palette();
				const values = {
					...(state.uiTransparency > UI_MIN ? surfaceValues(scheme, fraction()) : {}),
					...solidValuesFor(scheme)
				};
				if (state.uiTransparency > UI_MIN && document.body.style.getPropertyValue("background-color") !== "transparent") {
					document.body.style.setProperty("background-color", "transparent", "important");
				}
				if (document.body.style.getPropertyValue("background-color") === "transparent" && state.uiTransparency <= UI_MIN) {
					document.body.style.removeProperty("background-color");
				}
				for (const [name, value] of Object.entries(values)) {
					if (document.body.style.getPropertyValue(name) === value) continue;
					document.body.style.setProperty(name, value, "important");
				}
				// Nothing may keep a solid-surface token overridden once it is released.
				for (const name of Object.keys(SOLIDS)) {
					if (name in values) continue;
					if (document.body.style.getPropertyValue(name) !== "") document.body.style.removeProperty(name);
				}
			}

			/** Withdraw every declaration this plugin asserted on body. */
			function releaseSurfaces() {
				document.body.style.removeProperty("background-color");
				for (const name of [...Object.keys(SURFACES), ...EXEMPT, ...Object.keys(SOLIDS)]) {
					document.body.style.removeProperty(name);
				}
			}

			/** Re-assert on app rewrites, and once every few seconds as a safety net. */
			function watchBody() {
				if (tokenObserver === null) {
					tokenObserver = new MutationObserver(() => assertSurfaces());
					tokenObserver.observe(document.body, {
						attributes: true,
						attributeFilter: ["style", "data-ds-dark-theme"]
					});
				}
				if (tokenPoll === null) tokenPoll = window.setInterval(assertSurfaces, 4000);
			}

			/** Stop re-asserting. */
			function stopWatching() {
				if (tokenObserver !== null) {
					tokenObserver.disconnect();
					tokenObserver = null;
				}
				if (tokenPoll !== null) {
					window.clearInterval(tokenPoll);
					tokenPoll = null;
				}
			}

			/**
			 * Push the current transparency and solid colour into the app's surfaces:
			 * the stylesheet fallback, the inline assertions, and the theme service
			 * when it is reachable. With neither engaged the plugin withdraws entirely
			 * and every stock value comes back.
			 */
			function syncSurfaces() {
				const solids = solidValuesBoth();
				const active = state.uiTransparency > UI_MIN || hasSolidColors();
				if (!active) {
					stopWatching();
					if (themeDisposer !== null) {
						themeDisposer();
						themeDisposer = null;
					}
					tokenStyle.remove();
					releaseSurfaces();
					return;
				}
				tokenStyle.textContent = tokenCss(fraction(), solids);
				if (tokenStyle.parentNode === null) document.head.appendChild(tokenStyle);
				watchBody();
				assertSurfaces();
				pushThemeLayer(solids);
			}

			/**
			 * Hand the same values to the theme service, re-registering on change.
			 * @param solids - per-palette maps of the solid-surface colours (may be empty).
			 */
			function pushThemeLayer(solids) {
				if (themeService !== null) {
					const pairs = { ...surfacePairs(fraction()), ...pairsFor(solids) };
					// Re-registering the same source replaces its layer, so the newest
					// values always win.
					try {
						if (themeDisposer !== null) themeDisposer();
					} catch {
						/* a stale disposer is harmless */
					}
					try {
						themeDisposer = themeService.overrideTokens(SOURCE, pairs);
					} catch (error) {
						report("theme-layer-failed", { message: message(error) });
					}
					return;
				}
				if (themeRequested) return;
				themeRequested = true;
				if (typeof ctx.inject === "function") {
					try {
						ctx.inject(["theme"], (scoped) => {
							themeService = scoped.theme;
							report("theme-layer", { via: "inject" });
							pushThemeLayer(solids);
						});
						return;
					} catch (error) {
						report("inject-failed", { message: message(error) });
					}
				}
				try {
					if (ctx.theme !== undefined && typeof ctx.theme.overrideTokens === "function") {
						themeService = ctx.theme;
						themeDisposer = themeService.overrideTokens(SOURCE, { ...surfacePairs(fraction()), ...pairsFor(solids) });
						report("theme-layer", { via: "direct" });
					}
				} catch (error) {
					report("theme-layer-failed", { message: message(error) });
				}
			}

			/**
			 * Wrap per-palette colours as the `{ light, dark }` pairs the theme service
			 * wants. A palette the user left empty borrows the other one's value,
			 * because the service accepts only complete pairs; the inline assertions,
			 * which are authoritative, still apply each palette's own value.
			 * @param solids - `{ light, dark }` maps of token to colour.
			 * @returns the pair map.
			 */
			function pairsFor(solids) {
				const pairs = {};
				const names = new Set([...Object.keys(solids.light), ...Object.keys(solids.dark)]);
				for (const name of names) {
					pairs[name] = {
						light: solids.light[name] ?? solids.dark[name],
						dark: solids.dark[name] ?? solids.light[name]
					};
				}
				return pairs;
			}

			/**
			 * Record what the page really looks like, as a JSON record in
			 * localStorage plus a line in the node half's log. The element chain at the
			 * viewport centre names whatever opaque box covers the artwork, so a
			 * failure is diagnosable without seeing the screen.
			 */
			function recordDiagnostics() {
				const chain = [];
				let node = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
				while (node !== null && node !== document.documentElement && chain.length < 10) {
					const computed = window.getComputedStyle(node);
					const classes = typeof node.className === "string" && node.className !== "" ? "." + node.className.slice(0, 40) : "";
					chain.push(
						node.tagName.toLowerCase() + (node.id !== "" ? "#" + node.id : "") + classes + " bg=" + computed.backgroundColor + " pos=" + computed.position + " z=" + computed.zIndex
					);
					node = node.parentElement;
				}
				const rect = layer.getBoundingClientRect();
				const scheme = palette();
				const expected = { ...(state.uiTransparency > UI_MIN ? surfaceValues(scheme, fraction()) : {}), ...solidValuesFor(scheme) };
				const info = {
					at: new Date().toISOString(),
					palette: scheme,
					uiTransparency: state.uiTransparency,
					bodyBg: window.getComputedStyle(document.body).backgroundColor,
					computedToken: window.getComputedStyle(document.body).getPropertyValue("--dsw-alias-bg-base").trim(),
					asserted: Object.entries(expected).every(([name, value]) => document.body.style.getPropertyValue(name) === value),
					layerOpacity: window.getComputedStyle(layer).opacity,
					layerRect: Math.round(rect.width) + "x" + Math.round(rect.height),
					tokenVia: themeDisposer !== null ? "theme-service" : "stylesheet+inline",
					artIsCustom: state.custom !== "",
					solidColors: { ...state.solidColors },
					solidLayer2: document.body.style.getPropertyValue("--dsw-alias-bg-layer-2"),
					centerChain: chain
				};
				try {
					window.localStorage.setItem("dsh.webBg.diag", JSON.stringify(info));
				} catch {
					/* diagnostics are best-effort */
				}
				return info;
			}

			/** Push the current state into the DOM, then persist it. */
			function render() {
				const custom = state.custom !== "";
				bgSlider.value = String(state.opacity);
				uiSlider.value = String(state.uiTransparency);
				bgOut.textContent = state.opacity + "%";
				uiOut.textContent = state.uiTransparency + "%";
				document.documentElement.style.setProperty(OPACITY_VAR, String(state.opacity / 100));
				layer.style.backgroundImage = 'url("' + (custom ? state.custom : ART) + '")';
				layer.dataset.soft = state.soft ? "1" : "0";
				for (const row of [bgPresets, uiPresets]) {
					const pick = row.readPick();
					for (const button of row.querySelectorAll("button")) {
						button.dataset.on = Number(button.dataset.op) === pick ? "1" : "0";
					}
				}
				softBox.dataset.on = state.soft ? "1" : "0";
				softBox.textContent = state.soft ? "✓" : "";
				hint.innerHTML = custom
					? "当前：<b>" + state.name.replace(/[<>&]/g, "") + "</b>"
					: "当前：<b>内置素材</b>（深海女仆工坊）";
				syncSurfaces();
				const persisted = saveState(state);
				if (!persisted && custom) hint.innerHTML += "<br>图片较大，仅本次会话生效";
			}

			bgSlider.addEventListener("input", () => {
				state.opacity = Number(bgSlider.value);
				render();
			});
			uiSlider.addEventListener("input", () => {
				state.uiTransparency = Number(uiSlider.value);
				render();
			});
			ui.querySelector(".tab").addEventListener("click", () => {
				ui.dataset.open = ui.dataset.open === "1" ? "0" : "1";
			});
			ui.querySelector('[data-act="soft"]').addEventListener("click", () => {
				state.soft = !state.soft;
				render();
			});
			ui.querySelector('[data-act="pick"]').addEventListener("click", () => {
				picker.click();
			});
			ui.querySelector('[data-act="reset"]').addEventListener("click", () => {
				state.custom = "";
				state.name = "";
				render();
			});
			picker.addEventListener("change", async () => {
				const file = picker.files !== null && picker.files.length > 0 ? picker.files[0] : null;
				picker.value = "";
				if (file === null) return;
				try {
					state.custom = await shrink(file);
					state.name = file.name;
				} catch (error) {
					hint.textContent = message(error);
					return;
				}
				render();
			});

			render();

			// Self-report twice: at mount, and again once late-arriving services (the
			// theme layer) have settled, so the record reflects the final DOM.
			const first = recordDiagnostics();
			report("diag", {
				palette: first.palette,
				ui: String(first.uiTransparency),
				body: first.bodyBg,
				layer: first.layerRect,
				opacity: String(first.layerOpacity),
				token: first.tokenVia,
				asserted: String(first.asserted),
				computedToken: first.computedToken,
				chain: first.centerChain.slice(0, 3).join(" | ")
			});
			window.setTimeout(() => {
				const late = recordDiagnostics();
				report("diag-late", {
					body: late.bodyBg,
					asserted: String(late.asserted),
					computedToken: late.computedToken,
					verdict: late.centerChain.slice(0, 4).join(" | ")
				});
			}, 6000);

			/**
			 * Register the colour row into the app's own Settings → General list,
			 * directly below the appearance row (order 10) and above the font-size row
			 * (order 11) — the slot sorts by numeric `order`, so 10.5 lands between
			 * them. Requested lazily so a host without the slots service still gets the
			 * wallpaper.
			 */
			function registerSettingsRow() {
				if (typeof ctx.inject !== "function") {
					report("settings-row-skipped", { reason: "no ctx.inject" });
					return;
				}
				try {
					ctx.inject(["slots"], (scoped) => {
						try {
							scoped.slots.inject("settings.general.item", () =>
								scoped.slots.register(
									{
										name: "settings.general.item",
										id: "dsh-web-bg-color",
										order: 10.5,
										inject: () => ({
											readColors: () => ({ ...state.solidColors }),
											writeColor: (scheme, value) => {
												if (scheme !== "light" && scheme !== "dark") return;
												state.solidColors = { ...state.solidColors, [scheme]: normalizeHex(value) ?? "" };
												render();
											},
											readSolidAlpha: () => state.solidAlpha,
											writeSolidAlpha: (value) => {
												state.solidAlpha = clamp(value, 0, SOLID_ALPHA_MAX, 0);
												render();
											}
										})
									},
									SolidColorRow
								)
							);
							report("settings-row", { slot: "settings.general.item", order: "10.5" });
						} catch (error) {
							report("settings-row-failed", { message: message(error) });
						}
					});
				} catch (error) {
					report("settings-row-failed", { message: message(error) });
				}
			}

			registerSettingsRow();

			ctx.effect(() => () => {
				if (themeDisposer !== null) {
					themeDisposer();
					themeDisposer = null;
				}
				stopWatching();
				releaseSurfaces();
				document.documentElement.style.removeProperty(OPACITY_VAR);
				layer.remove();
				ui.remove();
				tokenStyle.remove();
				style.remove();
			}, "dsh-web-bg: teardown");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
