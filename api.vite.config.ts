import * as Vite from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import esbuild from "esbuild";
import type { ConditionSource } from "@item/base/data/index.ts";
import { execSync } from "child_process";
import fs from "fs-extra";
import Peggy from "peggy";

const CONDITION_SOURCES = ((): ConditionSource[] => {
    const output = execSync("npm run build:conditions", { encoding: "utf-8" });
    return JSON.parse(output.slice(output.indexOf("[")));
})();
const EN_JSON = JSON.parse(fs.readFileSync("./static/lang/en.json", { encoding: "utf-8" }));

const rollGrammar = fs.readFileSync("roll-grammar.peggy", { encoding: "utf-8" });
const ROLL_PARSER = Peggy.generate(rollGrammar, { output: "source" }).replace(
    "return {\n    SyntaxError: peg$SyntaxError,\n    parse: peg$parse\n  };",
    "AbstractDamageRoll.parser = { SyntaxError: peg$SyntaxError, parse: peg$parse };",
);

const plugins = [checker({ typescript: true }), tsconfigPaths()];
plugins.push({
    name: "minify",
    renderChunk: {
        order: "post",
        async handler(code, chunk) {
            return chunk.fileName.endsWith(".js")
                ? esbuild.transform(code, {
                      keepNames: true,
                      minifyIdentifiers: false,
                      minifySyntax: true,
                      minifyWhitespace: true,
                  })
                : code;
        },
    },
});

const config = Vite.defineConfig((): Vite.UserConfig => {
    return {
        base: "./",
        define: {
            BUILD_MODE: "production",
            CONDITION_SOURCES: JSON.stringify(CONDITION_SOURCES),
            EN_JSON: JSON.stringify(EN_JSON),
            ROLL_PARSER: JSON.stringify(ROLL_PARSER),
            fu: "foundry.utils",
        },
        esbuild: { keepNames: true },
        build: {
            outDir: "api",
            emptyOutDir: true,
            minify: false,
            sourcemap: false,
            lib: {
                name: "api",
                entry: "src/api.ts",
                formats: ["es"],
                fileName: "api",
            },
            target: "es2022",
        },
        plugins,
    };
});

export default config;
