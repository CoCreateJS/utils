/********************************************************************************
 * Copyright (C) 2026 CoCreate and Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 ********************************************************************************/

export * from "./modules/file/index.js";
/**
 *
 * @public
 * @environment server
 */
export { cloudProviders } from "./modules/cloudProviders.js";
/**
 *
 * @public
 * @environment server
 */
export { getClientInfo } from "./modules/getClientInfo.js";
/**
 *
 * @public
 * @environment server
 */
export { getRelativePath } from "./modules/getRelativePath.js";
/**
 *
 * @public
 * @environment server
 */
export { getClockOffset } from "./modules/getClockOffset.js";
/**
 *
 * @public
 * @environment server
 */
export { ObjectId } from "./modules/ObjectId.js";
/**
 *
 * @public
 * @environment server
 */
export { uuid } from "./modules/uuid.js";
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
export { ulid, ulidDecode } from "./modules/ulid.js";
/**
 *
 * @public
 * @environment server
 */
export { checkValue } from "./modules/checkValue.js";
/**
 *
 * @public
 * @environment server
 */
export { isValidDate } from "./modules/isValidDate.js";
/**
 *
 * @public
 * @environment server
 */
export { objectToSearchParams } from "./modules/objectToSearchParams.js";
/**
 *
 * @public
 * @environment server
 */
export { searchParamsToObject } from "./modules/searchParamsToObject.js";
/**
 *
 * @public
 * @environment server
 */
export { dotNotationToObject } from "./modules/dotNotationToObject.js";
/**
 *
 * @public
 * @environment server
 */
export { objectToDotNotation } from "./modules/objectToDotNotation.js";
/**
 *
 * @public
 * @environment server
 */
export { getValueFromObject } from "./modules/getValueFromObject.js";
/**
 *
 * @public
 * @environment server
 */
export { resolveProperty } from "./modules/resolveProperty.js";
/**
 *
 * @public
 * @environment server
 */
export { createUpdate } from "./modules/createUpdate.js";
/**
 *
 * @public
 * @environment server
 */
export { parseTextToHtml } from "./modules/parseTextToHtml.js";
/**
 *
 * @public
 * @environment server
 */
export { escapeHtml } from "./modules/escapeHtml.js";
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
export { queryData, searchData, sortData, isEqualArray, isEqualObject } from "./modules/dataQuery.js";
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
export { astSync, astAsync } from "./modules/ast/server.js";
/**
 *
 * @public
 * @environment server
 */
export { renderValue } from "./modules/renderValue.js";
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
export { processOperators, processOperatorsAsync } from "./modules/ast/operators.js";
/**
 *
 * @public
 * @environment server
 */
export { HTMLScanner } from "./modules/html-scanner.js";
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
export { getAttributes, getAttributeNames, setAttributeNames } from "./modules/attributes.js";
/**
 *
 * @public
 * @environment server
 */
export { security } from './modules/security.js';

import { cloudProviders } from "./modules/cloudProviders.js";
import { getClientInfo } from "./modules/getClientInfo.js";
import { getRelativePath } from "./modules/getRelativePath.js";
import { getClockOffset } from "./modules/getClockOffset.js";
import { ObjectId } from "./modules/ObjectId.js";
import { uuid } from "./modules/uuid.js";
import { ulid, ulidDecode } from "./modules/ulid.js";
import { checkValue } from "./modules/checkValue.js";
import { isValidDate } from "./modules/isValidDate.js";
import { objectToSearchParams } from "./modules/objectToSearchParams.js";
import { searchParamsToObject } from "./modules/searchParamsToObject.js";
import { dotNotationToObject } from "./modules/dotNotationToObject.js";
import { objectToDotNotation } from "./modules/objectToDotNotation.js";
import { getValueFromObject } from "./modules/getValueFromObject.js";
import { resolveProperty } from "./modules/resolveProperty.js";
import { createUpdate } from "./modules/createUpdate.js";
import { parseTextToHtml } from "./modules/parseTextToHtml.js";
import { escapeHtml } from "./modules/escapeHtml.js";
import { queryData, searchData, sortData, isEqualArray, isEqualObject } from "./modules/dataQuery.js";
import { astSync, astAsync } from "./modules/ast/server.js";
import { renderValue } from "./modules/renderValue.js";
import { processOperators, processOperatorsAsync } from "./modules/ast/operators.js";
import { HTMLScanner } from "./modules/html-scanner.js";
import { getAttributes, getAttributeNames, setAttributeNames } from "./modules/attributes.js";
import security from './modules/security.js';


import * as fileUtils from "./modules/file/index.js";
import * as valueHandlers from "./modules/valueHandler.js";

const utils = {
    ...valueHandlers,
    ...fileUtils,
    cloudProviders,
    getClientInfo,
    getRelativePath,
	getClockOffset,
    ObjectId,
    uuid,
    ulid,
    ulidDecode,
    checkValue,
    isValidDate,
    dotNotationToObject,
    objectToDotNotation,
    getValueFromObject,
    resolveProperty,
    objectToSearchParams,
    searchParamsToObject,
    parseTextToHtml,
    escapeHtml,
    queryData,
    searchData,
    sortData,
    isEqualArray, 
    isEqualObject,
    createUpdate,
    astSync,
    astAsync,
    renderValue,
    processOperators,
    processOperatorsAsync,
    HTMLScanner,
    security,
    getAttributes,
    getAttributeNames,
    setAttributeNames
};

export default utils;

/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
/**
 *
 * @public
 * @environment server
 */
export { getValueAttribute, transformValue, convertValue, caseHandler, regex, encodeValue, decodeValue, parseJson, toBoolean, toArray } from "./modules/valueHandler.js";

/**
 *
 * @name contentTypes
 * @kind member
 * @public
 * @environment server
 */

/**
 * Restores text, Uint8Array bytes, or an ArrayBuffer for HTTP responses, file writes, and binary storage; Blob/File inputs return a Promise.
 *
 * @name decodeContent
 * @kind member
 * @public
 * @signature decodeContent({ value, contentType?, pathname?, encoding?, format?, charset?, fatal? })
 * @environment server
 */

/**
 * Prepares UTF-8 text or encoded binary for JSON transport and storage; Blob/File inputs return a Promise.
 *
 * @name encodeContent
 * @kind member
 * @public
 * @signature encodeContent({ value, contentType?, pathname?, encoding?, format?, charset?, fatal? })
 * @environment server
 */

/**
 * Resolves a MIME type from explicit metadata, a data URL, a Blob/File, an extension, or a pathname.
 *
 * @name getContentType
 * @kind member
 * @public
 * @signature getContentType({ contentType?, value?, extension?, pathname?, fallback? })
 * @environment server
 */

/**
 * Returns the preferred filename extension for a MIME type, or a configurable fallback.
 *
 * @name getExtension
 * @kind member
 * @public
 * @signature getExtension({ contentType, fallback? })
 * @environment server
 */

/**
 * Returns all known extensions for a MIME type, preferred first; unknown types return an empty array.
 *
 * @name getExtensions
 * @kind member
 * @public
 * @signature getExtensions({ contentType })
 * @environment server
 */

/**
 * Classifies a MIME type using registry flags and textual MIME families.
 *
 * @name isTextContentType
 * @kind member
 * @public
 * @signature isTextContentType(contentType)
 * @environment server
 */

/**
 *
 * @name mimeTypes
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name valueHandlers
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name $encodeContent
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name $decodeContent
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name $getContentType
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name $getExtension
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name $getExtensions
 * @kind member
 * @public
 * @environment server
 */

/**
 *
 * @name $isTextContentType
 * @kind member
 * @public
 * @environment server
 */

/**
 * A simple utils component in vanilla javascript. Easily configured using HTML5 attributes and/or JavaScript API.
 *
 * @module utils
 * @environment server
 */

/**
 * Declarative selectors recognized by this module.
 *
 * @name declarative-selectors
 * @kind member
 * @selectors
 * @environment server
 * @example
 * ```json
 * [
 *   "${selector}"
 * ]
 * ```
 */
