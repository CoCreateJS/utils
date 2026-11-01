import { astAsync } from "./ast/index.js";
import { getValueFromObject } from "./getValueFromObject.js";

/**
 * Resolves CoCreate value placeholders in a string.
 *
 * It works without a DOM node for values in `data`; callers that have nested
 * render scopes may provide `resolveValue` to add their own scope lookup.
 *
 * @param {Object|undefined} node Optional DOM context for AST operators.
 * @param {Object} data Values exposed to placeholders and AST expressions.
 * @param {string} placeholder String containing one or more `{{ }}` values.
 * @param {string|undefined} renderAs Optional nested render alias.
 * @param {Object|undefined} renderedNode Optional caller render metadata.
 * @param {number|undefined} index Optional current array index.
 * @param {Function|undefined} resolveValue Optional caller-specific value lookup.
 * @param {Object} options Optional output serialization settings.
 * @param {boolean} options.escapeOutput HTML-escapes final values for string rendering.
 * @returns {Promise<string>} The value with resolvable placeholders replaced.
 */
async function renderValue(
    node,
    data,
    placeholder,
    renderAs,
    renderedNode,
    index,
    resolveValue,
    options = {}
) {
    data = data && typeof data === "object" ? data : {};
    let output = placeholder;
    const contextElement = node && node.nodeType !== 1
        ? node.ownerElement || node.parentElement
        : node;
    const regex = /\{\{\s*((?:(?!\{\{|\}\})[\s\S])+?)\s*\}\}/;
    const omitted = {};

    let match;
    do {
        match = output.match(regex);
        if (match) {
            let value;
            const placeholderContent = match[1].trim();
            try {
                if (placeholderContent === "index" && index >= 0) {
                    value = index;
                } else {
                    let preProcessed = placeholderContent;
                    const sandboxContext = {
                        data,
                        $data: data,
                        index,
                        $index: index,
                        ...data
                    };

                    const quoteRegex = /(['"])(.*?)\1/g;
                    let quoteMatch;
                    const replacements = [];
                    while ((quoteMatch = quoteRegex.exec(preProcessed)) !== null) {
                        const quoteType = quoteMatch[1];
                        const content = quoteMatch[2];
                        if (content.trim().startsWith("$")) {
                            let resolved = await astAsync({
                                executeAST: content,
                                node: contextElement,
                                sandbox: sandboxContext
                            });
                            if (resolved === null || resolved === undefined) resolved = "";
                            replacements.push({
                                original: quoteMatch[0],
                                replacement: `${quoteType}${resolved}${quoteType}`
                            });
                        }
                    }
                    for (const replacement of replacements) {
                        preProcessed = preProcessed.replace(
                            replacement.original,
                            replacement.replacement
                        );
                    }

                    preProcessed = await astAsync({
                        executeAST: preProcessed,
                        node: contextElement,
                        sandbox: sandboxContext
                    });
                    value = placeholderContent.startsWith("$")
                        ? preProcessed
                        : typeof resolveValue === "function"
                            ? await resolveValue(
                                node,
                                data,
                                preProcessed,
                                renderAs,
                                index,
                                renderedNode
                            )
                            : getValueFromObject(data, preProcessed);
                }
            } catch (error) {
                console.error("[Renderer AST Bridge] Value computation error:", error);
            }

            if (value !== undefined && value !== null) {
                if (typeof value === "object") value = JSON.stringify(value, null, 2);
                const outerOpen = output.lastIndexOf("{{", match.index);
                const outerClose = output.lastIndexOf("}}", match.index);
                const hasOuterPlaceholder = outerOpen > outerClose &&
                    output.indexOf("}}", match.index + match[0].length) !== -1;
                if (options.escapeOutput && !hasOuterPlaceholder) value = escapeHTML(value);
                output = output.replaceAll(match[0], value);
            } else if (renderAs) {
                if (match[0].startsWith(`{{${renderAs}.`)) {
                    output = output.replaceAll(match[0], "");
                } else if (placeholderContent) {
                    const marker = `<|${placeholderContent}|>`;
                    output = output.replaceAll(match[0], marker);
                    omitted[marker] = match[0];
                }
            } else {
                match = null;
            }
        }
    } while (match);

    for (const key of Object.keys(omitted)) output = output.replaceAll(key, omitted[key]);
    return output;
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export { renderValue };
