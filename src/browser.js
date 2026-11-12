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

/**
 *
 * @public
 * @environment client
 */
export { getClientInfo } from "./modules/getClientInfo.js";
/**
 * Collects values from elements with key or {prefix}-key and converts dotted keys into nested objects.
 *
 * @public
 * @environment client
 */
export { getData } from "./modules/getData.js";
/**
 *
 * @public
 * @environment client
 */
export { setData } from "./modules/setData.js";
export * from "./modules/file/index.js";
/**
 *
 * @public
 * @environment client
 */
export { cloudProviders } from "./modules/cloudProviders.js";
/**
 *
 * @public
 * @environment client
 */
export { getRelativePath } from "./modules/getRelativePath.js";
/**
 *
 * @public
 * @environment client
 */
export { getClockOffset } from "./modules/getClockOffset.js";
/**
 *
 * @public
 * @environment client
 */
export { ObjectId } from "./modules/ObjectId.js";
/**
 *
 * @public
 * @environment client
 */
export { uuid } from "./modules/uuid.js";
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { ulid, ulidDecode } from "./modules/ulid.js";
/**
 *
 * @public
 * @environment client
 */
export { checkValue } from "./modules/checkValue.js";
/**
 *
 * @public
 * @environment client
 */
export { isValidDate } from "./modules/isValidDate.js";
/**
 *
 * @public
 * @environment client
 */
export { objectToSearchParams } from "./modules/objectToSearchParams.js";
/**
 *
 * @public
 * @environment client
 */
export { searchParamsToObject } from "./modules/searchParamsToObject.js";
/**
 *
 * @public
 * @environment client
 */
export { dotNotationToObject } from "./modules/dotNotationToObject.js";
/**
 *
 * @public
 * @environment client
 */
export { objectToDotNotation } from "./modules/objectToDotNotation.js";
/**
 *
 * @public
 * @environment client
 */
export { getValueFromObject } from "./modules/getValueFromObject.js";
/**
 *
 * @public
 * @environment client
 */
export { resolveProperty } from "./modules/resolveProperty.js";
/**
 *
 * @public
 * @environment client
 */
export { createUpdate, createUpdateChanges, mergeUpdateChanges } from "./modules/createUpdate.js";
/**
 *
 * @public
 * @environment client
 */
export { parseTextToHtml } from "./modules/parseTextToHtml.js";
/**
 *
 * @public
 * @environment client
 */
export { escapeHtml } from "./modules/escapeHtml.js";
/**
 *
 * @public
 * @environment client
 */
export { cssPath } from "./modules/cssPath.js";
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { queryElements, queryElementsAll, checkMediaQueries } from "./modules/queryElements.js";
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { queryData, searchData, sortData, isEqualArray, isEqualObject } from "./modules/dataQuery.js";
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { getAttributes, getAttributeNames, setAttributeNames } from "./modules/attributes.js";
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { astSync, astAsync } from "./modules/ast/index.js";
/**
 *
 * @public
 * @environment client
 */
export { renderValue } from "./modules/renderValue.js";
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { processOperators, processOperatorsAsync } from "./modules/ast/operators.js";
/**
 *
 * @public
 * @environment client
 */
export { hasSelection } from "./modules/selection.js";

import { getClientInfo } from "./modules/getClientInfo.js";
import { getData } from "./modules/getData.js";
import { setData } from "./modules/setData.js";
import { cloudProviders } from "./modules/cloudProviders.js";
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
import { cssPath } from "./modules/cssPath.js";
import { queryElements, queryElementsAll, checkMediaQueries } from "./modules/queryElements.js";
import { queryData, searchData, sortData, isEqualArray, isEqualObject } from "./modules/dataQuery.js";
import { getAttributes, getAttributeNames, setAttributeNames } from "./modules/attributes.js";
import { astSync, astAsync } from "./modules/ast/index.js";
import { renderValue } from "./modules/renderValue.js";
import { processOperators, processOperatorsAsync } from "./modules/ast/operators.js";
import { hasSelection } from "./modules/selection.js";

import * as fileUtils from "./modules/file/index.js";
import * as valueHandlers from "./modules/valueHandler.js";

const utils = {
    ...valueHandlers,
    ...fileUtils,
    getClientInfo,
    getData,
    setData,
    cloudProviders,
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
    cssPath,
    queryElements,
    queryElementsAll,
    checkMediaQueries,
    queryData,
    searchData,
    sortData,
    isEqualArray, 
    isEqualObject,
    createUpdate,
    getAttributes,
    setAttributeNames,
    getAttributeNames,
    astSync,
    astAsync,
    renderValue,
    processOperators,
    processOperatorsAsync,
    hasSelection
};

export default utils;

/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
/**
 *
 * @public
 * @environment client
 */
export { getValueAttribute, transformValue, convertValue, caseHandler, regex, encodeValue, decodeValue, parseJson, toBoolean, toArray } from "./modules/valueHandler.js";

/**
 *
 * @name contentTypes
 * @kind member
 * @public
 * @environment client
 */

/**
 * Restores text, Uint8Array bytes, or an ArrayBuffer for HTTP responses, file writes, and binary storage; Blob/File inputs return a Promise.
 *
 * @name decodeContent
 * @kind member
 * @public
 * @signature decodeContent({ value, contentType?, pathname?, encoding?, format?, charset?, fatal? })
 * @environment client
 */

/**
 * Prepares UTF-8 text or encoded binary for JSON transport and storage; Blob/File inputs return a Promise.
 *
 * @name encodeContent
 * @kind member
 * @public
 * @signature encodeContent({ value, contentType?, pathname?, encoding?, format?, charset?, fatal? })
 * @environment client
 */

/**
 * Resolves a MIME type from explicit metadata, a data URL, a Blob/File, an extension, or a pathname.
 *
 * @name getContentType
 * @kind member
 * @public
 * @signature getContentType({ contentType?, value?, extension?, pathname?, fallback? })
 * @environment client
 */

/**
 * Returns the preferred filename extension for a MIME type, or a configurable fallback.
 *
 * @name getExtension
 * @kind member
 * @public
 * @signature getExtension({ contentType, fallback? })
 * @environment client
 */

/**
 * Returns all known extensions for a MIME type, preferred first; unknown types return an empty array.
 *
 * @name getExtensions
 * @kind member
 * @public
 * @signature getExtensions({ contentType })
 * @environment client
 */

/**
 * Classifies a MIME type using registry flags and textual MIME families.
 *
 * @name isTextContentType
 * @kind member
 * @public
 * @signature isTextContentType(contentType)
 * @environment client
 */

/**
 *
 * @name mimeTypes
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name valueHandlers
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name $encodeContent
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name $decodeContent
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name $getContentType
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name $getExtension
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name $getExtensions
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name $isTextContentType
 * @kind member
 * @public
 * @environment client
 */

/**
 *
 * @name contenteditable
 * @kind attribute
 * @environment client
 */

/**
 *
 * @name eid
 * @kind attribute
 * @environment client
 */

/**
 * Names the property read or written by getData and setData.
 *
 * @name key | {prefix}-key
 * @kind attribute
 * @valueType string
 * @environment client
 */

/**
 * When false, excludes the element from getData collection.
 *
 * @name get-data | {prefix}-get-data
 * @kind attribute
 * @valueType boolean-like string
 * @acceptedValues false
 * @environment client
 */

/**
 * When false, excludes the element from setData mapping.
 *
 * @name set-data | {prefix}-set-data
 * @kind attribute
 * @valueType boolean-like string
 * @acceptedValues false
 * @environment client
 */

/**
 * A simple utils component in vanilla javascript. Easily configured using HTML5 attributes and/or JavaScript API.
 *
 * @module utils
 * @environment client
 */

/**
 * Declarative selectors recognized by this module.
 *
 * @name declarative-selectors
 * @kind member
 * @selectors
 * @environment client
 * @example
 * ```json
 * [
 *   "${selector}"
 * ]
 * ```
 */
