// Reference snapshot from CoCreate-url-uploader/src/index.js.
// Preserved for comparison; not imported or executed by Utils.

function arrayBufferToBase64(buffer) {
    return Buffer.from(buffer).toString("base64");
}

/**
 * Fetches the binary asset from a remote URL, updates the file parameters,
 * converts the raw output to Base64, and sends the updated payload through the server service.
 * @param {Object} data - Server message envelope with file data and routing fields
 */
async function fetchFileFromURL(data) {
    try {
        const file = data.file;
        if (!file || !file.src) {
            data.error = "Missing file object or file source URL.";
            return server.send(data);
        }

        // Store original URL before file.src gets overwritten with Base64 content
        const originalUrl = file.src;
        const response = await fetch(originalUrl);

        if (!response.ok) {
            data.error = "Failed to fetch file: " + response.statusText;
            return server.send(data);
        }

        const arrayBuffer = await response.arrayBuffer();
        file.src = arrayBufferToBase64(arrayBuffer);
        file.size = arrayBuffer.byteLength;
        file["content-type"] = response.headers.get("content-type");

        if (!file.name) {
            const parsedUrl = new URL(originalUrl);
            file.name = parsedUrl.pathname.split("/").pop() || "downloaded_file";
        }

        if (!file.directory) file.directory = "/";
        if (!file.path) file.path = file.directory;
        
        if (!file.pathname) {
            if (file.path.endsWith("/")) {
                file.pathname = file.path + file.name;
            } else {
                file.pathname = file.path + "/" + file.name;
            }
        }

        return server.send(data);
    } catch (error) {
        console.error("Error fetching file:", error);
        data.error = "Internal uploader error while retrieving resource.";
        return server.send(data);
    }
}

