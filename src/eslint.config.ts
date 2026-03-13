import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
// @ts-expect-error - No types available for this deep import
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
    { ignores: ["**/dist/**", "**/coverage/**"] },
    { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
    { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    { languageOptions: { globals: { ...globals.browser, ...globals.node, Bun: "readonly" } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ...pluginReactConfig,
        settings: {
            react: {
                version: "detect"
            }
        }
    },
];
