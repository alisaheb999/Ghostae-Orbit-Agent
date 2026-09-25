// Ghost AE Bridge - Host ExtendScript
function getProjectStatus() {
    try {
        if (!app.project || !app.project.file) {
            return JSON.stringify({
                has_project: false,
                project_name: "No active project",
                version: app.version
            });
        }
        return JSON.stringify({
            has_project: true,
            project_name: app.project.file.name,
            project_path: app.project.file.fsName,
            version: app.version,
            render_status: app.project.renderQueue.canQueueInAME ? "Ready" : "Idle"
        });
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function saveActiveProject() {
    try {
        if (app.project && app.project.file) {
            app.project.save();
            return JSON.stringify({ status: "success", message: "Project saved" });
        }
        return JSON.stringify({ status: "error", message: "No active project file to save" });
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() });
    }
}

function openProjectFile(path) {
    try {
        var myFile = new File(path);
        if (myFile.exists) {
            app.open(myFile);
            return JSON.stringify({ status: "success", project_name: myFile.name });
        }
        return JSON.stringify({ status: "error", message: "File does not exist: " + path });
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() });
    }
}

function startRenderQueue() {
    try {
        if (app.project && app.project.renderQueue.numItems > 0) {
            app.project.renderQueue.render();
            return JSON.stringify({ status: "success", message: "Render started" });
        }
        return JSON.stringify({ status: "error", message: "No items in render queue" });
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() });
    }
}
